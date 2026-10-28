package com.mealsync.controller;

import com.mealsync.dto.AdminOverviewResponse;
import com.mealsync.dto.CounterOrderRequest;
import com.mealsync.dto.OrderItemRequest;
import com.mealsync.dto.OrderResponse;
import com.mealsync.dto.OrderStatusRequest;
import com.mealsync.dto.ProductRequest;
import com.mealsync.model.Meal;
import com.mealsync.model.Order;
import com.mealsync.model.OrderItem;
import com.mealsync.model.User;
import com.mealsync.repository.MealRepository;
import com.mealsync.repository.OrderRepository;
import com.mealsync.repository.UserRepository;
import com.mealsync.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
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
public class AdminController {

    @Autowired
    private MealRepository mealRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PaymentService paymentService;

    // Allowed status transitions
    private static final Map<String, Set<String>> VALID_TRANSITIONS = new HashMap<>();

    static {
        VALID_TRANSITIONS.put("PENDING", Set.of("CONFIRMED", "CANCELLED"));
        VALID_TRANSITIONS.put("CONFIRMED", Set.of("PREPARING", "CANCELLED"));
        VALID_TRANSITIONS.put("PREPARING", Set.of("READY", "CANCELLED"));
        VALID_TRANSITIONS.put("READY", Set.of("COMPLETED", "CANCELLED"));
        VALID_TRANSITIONS.put("COMPLETED", Set.of()); // terminal
        VALID_TRANSITIONS.put("CANCELLED", Set.of()); // terminal
    }

    // -----------------------------------------------------------------------
    // Admin Overview
    // -----------------------------------------------------------------------

    @GetMapping("/overview")
    public ResponseEntity<AdminOverviewResponse> getOverview() {
        List<Order> allOrders = orderRepository.findAllByOrderByOrderTimeDesc();
        List<Meal> allMeals = mealRepository.findAll();

        long totalOrders = allOrders.size();
        LocalDate today = LocalDate.now();

        long todayOrders = 0;
        double todaySales = 0.0;
        long pendingOrders = 0;

        for (Order o : allOrders) {
            LocalDateTime ot = o.getOrderTime();
            if (ot != null && ot.toLocalDate().isEqual(today)) {
                todayOrders++;
                if (!"CANCELLED".equalsIgnoreCase(o.getStatus())) {
                    todaySales += (o.getTotalAmount() != null ? o.getTotalAmount() : 0.0);
                }
            }

            String st = o.getStatus() != null ? o.getStatus().toUpperCase() : "";
            if ("PENDING".equals(st) || "CONFIRMED".equals(st) || "PREPARING".equals(st) || "READY".equals(st)) {
                pendingOrders++;
            }
        }

        long availableProducts = 0;
        long soldOutProducts = 0;
        for (Meal m : allMeals) {
            boolean avail = Boolean.TRUE.equals(m.getIsAvailable()) && m.getAvailableQuantity() != null && m.getAvailableQuantity() > 0;
            if (avail) {
                availableProducts++;
            } else {
                soldOutProducts++;
            }
        }

        List<Order> recentOrders = allOrders.size() > 10 ? allOrders.subList(0, 10) : allOrders;

        AdminOverviewResponse response = new AdminOverviewResponse(
                totalOrders,
                todayOrders,
                todaySales,
                pendingOrders,
                availableProducts,
                soldOutProducts,
                recentOrders
        );

        return ResponseEntity.ok(response);
    }

    // -----------------------------------------------------------------------
    // Product Management (CRUD & Availability)
    // -----------------------------------------------------------------------

    @GetMapping("/products")
    public ResponseEntity<List<Meal>> getAllProducts() {
        return ResponseEntity.ok(mealRepository.findAll());
    }

    @PostMapping("/products")
    public ResponseEntity<?> createProduct(@Valid @RequestBody ProductRequest request) {
        if (mealRepository.existsByName(request.getName().trim())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "A product with this name already exists: " + request.getName()));
        }

        Meal meal = new Meal();
        meal.setName(request.getName().trim());
        meal.setDescription(request.getDescription() != null ? request.getDescription().trim() : "");
        meal.setCategory(request.getCategory().trim().toLowerCase());
        meal.setPrice(request.getPrice());
        meal.setAvailableQuantity(request.getAvailableQuantity());
        meal.setIsAvailable(request.getIsAvailable() != null ? request.getIsAvailable() : true);
        meal.setImageUrl(request.getImageUrl() != null && !request.getImageUrl().trim().isEmpty() ? request.getImageUrl().trim() : "🍽️");

        Meal saved = mealRepository.save(meal);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        Meal meal = mealRepository.findById(id).orElse(null);
        if (meal == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Product not found with id: " + id));
        }

        // Check if name changed and conflicts with another meal
        String newName = request.getName().trim();
        if (!meal.getName().equalsIgnoreCase(newName) && mealRepository.existsByName(newName)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Another product with this name already exists: " + newName));
        }

        meal.setName(newName);
        meal.setDescription(request.getDescription() != null ? request.getDescription().trim() : "");
        meal.setCategory(request.getCategory().trim().toLowerCase());
        meal.setPrice(request.getPrice());
        meal.setAvailableQuantity(request.getAvailableQuantity());
        meal.setIsAvailable(request.getIsAvailable() != null ? request.getIsAvailable() : (request.getAvailableQuantity() > 0));
        if (request.getImageUrl() != null && !request.getImageUrl().trim().isEmpty()) {
            meal.setImageUrl(request.getImageUrl().trim());
        }

        Meal updated = mealRepository.save(meal);
        return ResponseEntity.ok(updated);
    }

    /**
     * Safe product deactivation:
     * Does NOT delete the database record to preserve historical order items.
     * Sets isAvailable to false and marks available quantity as 0.
     */
    @DeleteMapping("/products/{id}")
    public ResponseEntity<?> deactivateProduct(@PathVariable Long id) {
        Meal meal = mealRepository.findById(id).orElse(null);
        if (meal == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Product not found with id: " + id));
        }

        meal.setIsAvailable(false);
        meal.setAvailableQuantity(0);
        mealRepository.save(meal);

        return ResponseEntity.ok(Map.of("message", "Product deactivated safely", "productId", id));
    }

    @PatchMapping("/products/{id}/toggle-availability")
    public ResponseEntity<?> toggleAvailability(@PathVariable Long id) {
        Meal meal = mealRepository.findById(id).orElse(null);
        if (meal == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Product not found with id: " + id));
        }

        boolean current = Boolean.TRUE.equals(meal.getIsAvailable());
        meal.setIsAvailable(!current);
        Meal updated = mealRepository.save(meal);

        return ResponseEntity.ok(updated);
    }

    // -----------------------------------------------------------------------
    // Order Management
    // -----------------------------------------------------------------------

    @GetMapping("/orders")
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderRepository.findAllByOrderByOrderTimeDesc());
    }

    @PutMapping("/orders/{id}/status")
    @Transactional
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long id, @Valid @RequestBody OrderStatusRequest request) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Order not found with id: " + id));
        }

        String currentStatus = order.getStatus() != null ? order.getStatus().toUpperCase() : "PENDING";
        String targetStatus = request.getStatus().trim().toUpperCase();

        if (currentStatus.equals(targetStatus)) {
            return ResponseEntity.ok(order);
        }

        Set<String> allowed = VALID_TRANSITIONS.getOrDefault(currentStatus, Collections.emptySet());
        if (!allowed.contains(targetStatus)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Invalid status transition from " + currentStatus + " to " + targetStatus,
                    "allowedTransitions", allowed
            ));
        }

        // If order is cancelled, restore stock for each item
        if ("CANCELLED".equals(targetStatus) && !"CANCELLED".equals(currentStatus)) {
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    Meal meal = item.getMeal();
                    if (meal != null && item.getQuantity() != null) {
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

        order.setStatus(targetStatus);
        Order updated = orderRepository.save(order);
        return ResponseEntity.ok(updated);
    }

    // -----------------------------------------------------------------------
    // Customer Lookup for Counter Sales (Priority 3)
    // -----------------------------------------------------------------------

    @GetMapping("/customers/search")
    public ResponseEntity<List<Map<String, Object>>> searchCustomers(@RequestParam(required = false, defaultValue = "") String q) {
        String query = q.trim();
        List<User> users;
        if (query.isEmpty()) {
            users = userRepository.findAll();
        } else {
            users = userRepository.findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(query, query);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (User u : users) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("name", u.getName());
            map.put("email", u.getEmail());
            map.put("role", u.getRole());
            map.put("phone", u.getPhone() != null ? u.getPhone() : "");
            map.put("uid", u.getUid() != null ? u.getUid() : "");
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    // -----------------------------------------------------------------------
    // Counter Sales / Walk-in Orders (Priority 3)
    // -----------------------------------------------------------------------

    @PostMapping("/counter-orders")
    @Transactional
    public ResponseEntity<?> createCounterOrder(@RequestBody CounterOrderRequest request, Authentication authentication) {
        // Resolve operator details from JWT authentication
        String operatorName = "Counter Admin";
        if (authentication != null && authentication.getName() != null) {
            User op = userRepository.findByEmail(authentication.getName()).orElse(null);
            if (op != null) {
                operatorName = op.getName() + " (" + op.getEmail() + ")";
            } else {
                operatorName = authentication.getName();
            }
        }

        // Idempotency check
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
                        prev.getTransactionId(),
                        prev.getOrderSource(),
                        prev.getCustomerName(),
                        prev.getCounterOperator()
                ));
            }
        }

        // Basic structural validation
        if (request.getItems() == null || request.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Counter sale must contain at least one item"));
        }

        // Build Order
        Order order = new Order();
        order.setOrderSource("COUNTER");
        order.setCounterOperator(operatorName);
        order.setStatus("CONFIRMED");
        order.setPickupSlot(request.getPickupSlot() != null && !request.getPickupSlot().trim().isEmpty()
                ? request.getPickupSlot().trim() : "Immediate Counter Pickup");
        order.setOrderNumber("MS-CTR-" + (10000 + (int) (Math.random() * 90000)));
        order.setQrCodeData(UUID.randomUUID().toString());
        if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().trim().isEmpty()) {
            order.setIdempotencyKey(request.getIdempotencyKey().trim());
        }

        // Customer binding: registered student or walk-in guest
        if (request.getUserId() != null) {
            User customer = userRepository.findById(request.getUserId()).orElse(null);
            if (customer != null) {
                order.setUser(customer);
                order.setCustomerName(customer.getName());
                order.setCustomerEmail(customer.getEmail());
                order.setCustomerPhone(customer.getPhone());
            } else {
                order.setCustomerName(request.getCustomerName() != null ? request.getCustomerName().trim() : "Registered Student #" + request.getUserId());
            }
        } else {
            // Walk-in guest customer
            order.setUser(null);
            order.setCustomerName(request.getCustomerName() != null && !request.getCustomerName().trim().isEmpty()
                    ? request.getCustomerName().trim() : "Walk-in Customer");
            order.setCustomerPhone(request.getCustomerPhone() != null ? request.getCustomerPhone().trim() : null);
            order.setCustomerEmail(request.getCustomerEmail() != null ? request.getCustomerEmail().trim() : null);
        }

        double total = 0.0;

        for (OrderItemRequest itemReq : request.getItems()) {
            if (itemReq.getMenuItemId() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Each item must specify a menuItemId"));
            }
            if (itemReq.getQty() == null || itemReq.getQty() < 1) {
                return ResponseEntity.badRequest().body(Map.of("error", "Quantity must be at least 1"));
            }

            // Lock meal with pessimistic write lock (SELECT ... FOR UPDATE)
            Meal meal = mealRepository.findByIdForUpdate(itemReq.getMenuItemId()).orElse(null);
            if (meal == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Meal not found: " + itemReq.getMenuItemId()));
            }
            if (!Boolean.TRUE.equals(meal.getIsAvailable())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Meal is currently unavailable: " + meal.getName()));
            }
            if (meal.getAvailableQuantity() == null || meal.getAvailableQuantity() < itemReq.getQty()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "Insufficient stock for: " + meal.getName()
                                + " (requested: " + itemReq.getQty()
                                + ", available: " + (meal.getAvailableQuantity() == null ? 0 : meal.getAvailableQuantity()) + ")"
                ));
            }

            // Order item
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setMeal(meal);
            orderItem.setQuantity(itemReq.getQty());
            orderItem.setPriceAtTimeOfOrder(meal.getPrice());
            order.getItems().add(orderItem);

            total += meal.getPrice() * itemReq.getQty();

            // Atomic stock decrement
            int newQty = meal.getAvailableQuantity() - itemReq.getQty();
            meal.setAvailableQuantity(newQty);
            if (newQty <= 0) {
                meal.setIsAvailable(false);
            }
            mealRepository.save(meal);
        }

        order.setTotalAmount(total);

        String method = request.getPaymentMethod() != null ? request.getPaymentMethod().trim().toUpperCase() : "CASH";

        if ("CASH".equals(method)) {
            boolean received = Boolean.TRUE.equals(request.getPaymentReceived());
            order.setPaymentMethod("Cash at Counter");
            order.setPaymentStatus(received ? "PAID" : "PENDING_CASH");
            order.setTransactionId(received ? "TXN_CASH_" + System.currentTimeMillis() : null);
        } else {
            // Simulated UPI / Card / Wallet
            PaymentService.PaymentResult paymentResult = paymentService.processPayment(
                    method, total, request.getSimulateFailure());

            if (!paymentResult.success()) {
                TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
                return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(Map.of(
                        "error", paymentResult.message(),
                        "status", "PAYMENT_FAILED",
                        "paymentMethod", paymentResult.paymentMethod()
                ));
            }

            order.setPaymentMethod(paymentResult.paymentMethod());
            order.setPaymentStatus(paymentResult.paymentStatus());
            order.setTransactionId(paymentResult.transactionId());
        }

        Order saved = orderRepository.save(order);

        OrderResponse resp = new OrderResponse(
                saved.getId(),
                saved.getOrderNumber(),
                saved.getStatus(),
                saved.getTotalAmount(),
                saved.getPickupSlot(),
                saved.getOrderTime() != null ? saved.getOrderTime().toString() : LocalDateTime.now().toString(),
                saved.getQrCodeData(),
                saved.getPaymentMethod(),
                saved.getPaymentStatus(),
                saved.getTransactionId(),
                saved.getOrderSource(),
                saved.getCustomerName(),
                saved.getCounterOperator()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    // -----------------------------------------------------------------------
    // Payment & Customer Records (Priority 4)
    // -----------------------------------------------------------------------

    @GetMapping("/payment-records")
    public ResponseEntity<List<Order>> getPaymentRecords(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) String status
    ) {
        List<Order> allOrders = orderRepository.findAllByOrderByOrderTimeDesc();
        List<Order> filtered = new ArrayList<>();

        for (Order o : allOrders) {
            // Source filter: PORTAL or COUNTER
            if (source != null && !source.isBlank() && !"ALL".equalsIgnoreCase(source)) {
                String src = o.getOrderSource() != null ? o.getOrderSource() : "PORTAL";
                if (!src.equalsIgnoreCase(source.trim())) {
                    continue;
                }
            }

            // Payment method filter
            if (method != null && !method.isBlank() && !"ALL".equalsIgnoreCase(method)) {
                String m = o.getPaymentMethod() != null ? o.getPaymentMethod().toUpperCase() : "";
                if (!m.contains(method.trim().toUpperCase())) {
                    continue;
                }
            }

            // Payment status filter
            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                String st = o.getPaymentStatus() != null ? o.getPaymentStatus().toUpperCase() : "PAID";
                if (!st.equalsIgnoreCase(status.trim())) {
                    continue;
                }
            }

            // Search query across OrderNumber, CustomerName, Email, TransactionId
            if (search != null && !search.isBlank()) {
                String q = search.trim().toLowerCase();
                boolean matchNumber = o.getOrderNumber() != null && o.getOrderNumber().toLowerCase().contains(q);
                boolean matchCust = o.getCustomerName() != null && o.getCustomerName().toLowerCase().contains(q);
                boolean matchEmail = o.getCustomerEmail() != null && o.getCustomerEmail().toLowerCase().contains(q);
                boolean matchUser = o.getUser() != null && (
                        (o.getUser().getName() != null && o.getUser().getName().toLowerCase().contains(q)) ||
                        (o.getUser().getEmail() != null && o.getUser().getEmail().toLowerCase().contains(q)) ||
                        (o.getUser().getUid() != null && o.getUser().getUid().toLowerCase().contains(q))
                );
                boolean matchTxn = o.getTransactionId() != null && o.getTransactionId().toLowerCase().contains(q);

                if (!matchNumber && !matchCust && !matchEmail && !matchUser && !matchTxn) {
                    continue;
                }
            }

            filtered.add(o);
        }

        return ResponseEntity.ok(filtered);
    }
}
