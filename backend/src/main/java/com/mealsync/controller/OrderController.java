package com.mealsync.controller;

import com.mealsync.dto.OrderItemRequest;
import com.mealsync.dto.OrderRequest;
import com.mealsync.dto.OrderResponse;
import com.mealsync.model.Meal;
import com.mealsync.model.Order;
import com.mealsync.model.OrderItem;
import com.mealsync.model.User;
import com.mealsync.repository.MealRepository;
import com.mealsync.repository.OrderRepository;
import com.mealsync.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Order REST controller.
 *
 * Security model:
 *  - All endpoints require a valid JWT (enforced by SecurityConfig: /api/orders/** → hasRole("USER")).
 *  - The authenticated user is always derived from the SecurityContext — never trusted from the request body.
 *  - Customers can only view their own orders.
 *
 * Business rules enforced:
 *  - Items must exist and be currently available.
 *  - Requested quantity must be ≥ 1 and ≤ available stock.
 *  - Total is computed server-side from current DB prices — client-supplied totals/prices are ignored.
 *  - Stock is decremented atomically within a single database transaction.
 */
@RestController
@RequestMapping("/api/orders")
@CrossOrigin(
    origins = {
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000"
    },
    originPatterns = {"http://localhost:*", "http://127.0.0.1:*"}
)
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MealRepository mealRepository;

    @Autowired
    private com.mealsync.service.PaymentService paymentService;

    // -----------------------------------------------------------------------
    // GET /api/orders/user/{userId}  — Customer's own order history
    // -----------------------------------------------------------------------

    /**
     * Returns the authenticated user's own orders, newest first.
     * Returns 403 if the authenticated user requests another user's orders.
     *
     * @param userId        the path variable user ID to fetch orders for
     * @param authentication injected by Spring Security — the currently logged-in user
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserOrders(@PathVariable Long userId,
                                           Authentication authentication) {
        // Resolve the authenticated user from the SecurityContext
        User authUser = resolveAuthUser(authentication);
        if (authUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        // Ownership check — customers can only see their own orders
        if (!authUser.getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied"));
        }

        List<Order> orders = orderRepository.findByUserIdOrderByOrderTimeDesc(userId);
        return ResponseEntity.ok(orders);
    }

    // -----------------------------------------------------------------------
    // POST /api/orders  — Place a new order
    // -----------------------------------------------------------------------

    /**
     * Places a new order for the authenticated user.
     *
     * The userId in the request body is IGNORED. The authenticated principal
     * from the JWT is used instead to prevent one user from placing orders as another.
     *
     * All prices and totals are computed from the database — no client-supplied
     * price is ever trusted.
     *
     * Stock is decremented and the order is saved in a single transaction to
     * prevent overselling.
     */
    @PostMapping
    @Transactional
    public ResponseEntity<?> placeOrder(@RequestBody OrderRequest request,
                                        Authentication authentication) {
        // Resolve the authenticated user from the SecurityContext
        User authUser = resolveAuthUser(authentication);
        if (authUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        // Strict role separation: Admins cannot place meal orders
        if (authUser.getRole() != null && authUser.getRole().toUpperCase().contains("ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Administrators cannot place meal orders. Only students are permitted to checkout."));
        }

        // Idempotency verification: prevent duplicate orders from double-click or network retry
        if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().trim().isEmpty()) {
            Optional<Order> existing = orderRepository.findByIdempotencyKey(request.getIdempotencyKey().trim());
            if (existing.isPresent()) {
                Order prev = existing.get();
                return ResponseEntity.ok(new OrderResponse(
                        prev.getId(),
                        prev.getOrderNumber(),
                        prev.getStatus(),
                        prev.getTotalAmount(),
                        prev.getPickupSlot(),
                        prev.getOrderTime() != null ? prev.getOrderTime().toString() : null,
                        prev.getQrCodeData(),
                        prev.getPaymentMethod(),
                        prev.getPaymentStatus(),
                        prev.getTransactionId()
                ));
            }
        }

        // Basic structural validation
        if (request.getItems() == null || request.getItems().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Order must contain at least one item"));
        }
        if (request.getPickupSlot() == null || request.getPickupSlot().trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Pickup slot is required"));
        }

        // Build the order
        Order order = new Order();
        order.setUser(authUser);  // always the JWT principal — never from request body
        order.setPickupSlot(request.getPickupSlot().trim());
        order.setStatus("CONFIRMED");
        order.setOrderNumber("MS" + (10290 + (int)(Math.random() * 9000)));
        order.setQrCodeData(UUID.randomUUID().toString());
        if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().trim().isEmpty()) {
            order.setIdempotencyKey(request.getIdempotencyKey().trim());
        }

        double total = 0.0;

        for (OrderItemRequest itemReq : request.getItems()) {
            // Validate item request
            if (itemReq.getMenuItemId() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Each item must specify a menuItemId"));
            }
            if (itemReq.getQty() == null || itemReq.getQty() < 1) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Quantity must be at least 1 for item " + itemReq.getMenuItemId()));
            }
            if (itemReq.getQty() > 20) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Quantity cannot exceed 20 per item"));
            }

            // Load meal with pessimistic write lock (SELECT ... FOR UPDATE) to prevent concurrency anomalies
            Meal meal = mealRepository.findByIdForUpdate(itemReq.getMenuItemId()).orElse(null);
            if (meal == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Meal not found: " + itemReq.getMenuItemId()));
            }
            if (!Boolean.TRUE.equals(meal.getIsAvailable())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Meal is currently unavailable: " + meal.getName()));
            }
            if (meal.getAvailableQuantity() == null || meal.getAvailableQuantity() < itemReq.getQty()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "Insufficient stock for: " + meal.getName()
                                + " (requested: " + itemReq.getQty()
                                + ", available: " + (meal.getAvailableQuantity() == null ? 0 : meal.getAvailableQuantity()) + ")"));
            }

            // Build order item — price locked to current DB value
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setMeal(meal);
            orderItem.setQuantity(itemReq.getQty());
            orderItem.setPriceAtTimeOfOrder(meal.getPrice()); // server-side price snapshot
            order.getItems().add(orderItem);

            // Compute total from DB prices — client total is ignored
            total += meal.getPrice() * itemReq.getQty();

            // Decrement stock atomically (within this @Transactional boundary)
            int newQty = meal.getAvailableQuantity() - itemReq.getQty();
            meal.setAvailableQuantity(newQty);
            if (newQty <= 0) {
                meal.setIsAvailable(false);
            }
            mealRepository.save(meal);
        }

        order.setTotalAmount(total);

        // Process simulated payment with controlled test failure support
        com.mealsync.service.PaymentService.PaymentResult paymentResult = paymentService.processPayment(
                request.getPaymentMethod(), total, request.getSimulateFailure());

        if (!paymentResult.success()) {
            // Roll back transaction so no stock decrement is saved
            org.springframework.transaction.interceptor.TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED)
                    .body(Map.of(
                            "error", paymentResult.message(),
                            "status", "PAYMENT_FAILED",
                            "paymentMethod", paymentResult.paymentMethod()
                    ));
        }

        order.setPaymentMethod(paymentResult.paymentMethod());
        order.setPaymentStatus(paymentResult.paymentStatus());
        order.setTransactionId(paymentResult.transactionId());

        Order savedOrder = orderRepository.save(order);

        // Return a flat DTO with payment confirmation details
        OrderResponse resp = new OrderResponse(
                savedOrder.getId(),
                savedOrder.getOrderNumber(),
                savedOrder.getStatus(),
                savedOrder.getTotalAmount(),
                savedOrder.getPickupSlot(),
                savedOrder.getOrderTime() != null ? savedOrder.getOrderTime().toString() : null,
                savedOrder.getQrCodeData(),
                savedOrder.getPaymentMethod(),
                savedOrder.getPaymentStatus(),
                savedOrder.getTransactionId()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    // -----------------------------------------------------------------------
    // PUT /api/orders/{id}/cancel  — Customer cancels their own order
    // -----------------------------------------------------------------------

    /**
     * Cancels an order and restores meal inventory atomically.
     * Accessible by the student owner of the order or an administrator.
     */
    @PutMapping("/{id}/cancel")
    @Transactional
    public ResponseEntity<?> cancelOrder(@PathVariable Long id, Authentication authentication) {
        User authUser = resolveAuthUser(authentication);
        if (authUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Order not found with id: " + id));
        }

        boolean isAdmin = authUser.getRole() != null && authUser.getRole().contains("ADMIN");
        if (!order.getUser().getId().equals(authUser.getId()) && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied"));
        }

        String currentStatus = order.getStatus() != null ? order.getStatus().toUpperCase() : "";
        if ("COMPLETED".equals(currentStatus) || "CANCELLED".equals(currentStatus) || "PREPARING".equals(currentStatus) || "READY".equals(currentStatus)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Order cannot be cancelled in status: " + currentStatus));
        }

        // Restore stock with pessimistic locking
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                if (item.getMeal() != null && item.getQuantity() != null) {
                    Meal meal = mealRepository.findByIdForUpdate(item.getMeal().getId()).orElse(null);
                    if (meal != null) {
                        int restored = (meal.getAvailableQuantity() != null ? meal.getAvailableQuantity() : 0) + item.getQuantity();
                        meal.setAvailableQuantity(restored);
                        if (restored > 0) {
                            meal.setIsAvailable(true);
                        }
                        mealRepository.save(meal);
                    }
                }
            }
        }

        order.setStatus("CANCELLED");
        if ("PAID".equals(order.getPaymentStatus())) {
            order.setPaymentStatus("REFUNDED");
        } else {
            order.setPaymentStatus("CANCELLED");
        }

        Order saved = orderRepository.save(order);

        OrderResponse resp = new OrderResponse(
                saved.getId(),
                saved.getOrderNumber(),
                saved.getStatus(),
                saved.getTotalAmount(),
                saved.getPickupSlot(),
                saved.getOrderTime() != null ? saved.getOrderTime().toString() : null,
                saved.getQrCodeData(),
                saved.getPaymentMethod(),
                saved.getPaymentStatus(),
                saved.getTransactionId()
        );

        return ResponseEntity.ok(resp);
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /**
     * Resolves the authenticated user entity from the Spring SecurityContext.
     * The principal name is the email (set by UserDetailsServiceImpl).
     */
    private User resolveAuthUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) return null;
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElse(null);
    }
}
