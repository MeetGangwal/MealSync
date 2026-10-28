package com.mealsync.controller;

import com.mealsync.dto.OrderItemRequest;
import com.mealsync.dto.OrderRequest;
import com.mealsync.model.Meal;
import com.mealsync.model.Order;
import com.mealsync.model.User;
import com.mealsync.repository.MealRepository;
import com.mealsync.repository.OrderRepository;
import com.mealsync.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for OrderController.
 * Uses Mockito to isolate controller logic from the database.
 * Does NOT use an in-memory database or touch the real mealsync database.
 */
@ExtendWith(MockitoExtension.class)
class OrderControllerTest {

    @Mock private OrderRepository orderRepository;
    @Mock private UserRepository userRepository;
    @Mock private MealRepository mealRepository;
    @Mock private com.mealsync.service.PaymentService paymentService;

    @InjectMocks
    private OrderController orderController;

    private User authUser;
    private Meal availableMeal;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        authUser = new User();
        authUser.setId(1L);
        authUser.setEmail("user@test.com");
        authUser.setRole("ROLE_USER");
        authUser.setName("Test User");

        availableMeal = new Meal();
        availableMeal.setId(1L);
        availableMeal.setName("Maharashtrian Thali");
        availableMeal.setPrice(120.0);
        availableMeal.setAvailableQuantity(50);
        availableMeal.setIsAvailable(true);

        authentication = new UsernamePasswordAuthenticationToken(
                "user@test.com", null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));

        lenient().when(paymentService.processPayment(any(), any(), any())).thenReturn(
                new com.mealsync.service.PaymentService.PaymentResult(
                        true, "TXN_SIM_TEST123", "PAID", "UPI", "Simulated UPI payment verified successfully."
                )
        );
    }

    // ── Ownership check ───────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /orders/user/{id}: returns 403 when requesting another user's orders")
    void getUserOrders_wrongUser_returns403() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(authUser));

        // authUser.id = 1, requesting userId = 999
        ResponseEntity<?> response = orderController.getUserOrders(999L, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("GET /orders/user/{id}: returns orders when userId matches authenticated user")
    void getUserOrders_correctUser_returnsOrders() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(authUser));
        when(orderRepository.findByUserIdOrderByOrderTimeDesc(1L)).thenReturn(List.of());

        ResponseEntity<?> response = orderController.getUserOrders(1L, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // ── Order validation ──────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /orders: rejects empty items list")
    void placeOrder_emptyItems_returns400() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(authUser));

        OrderRequest req = new OrderRequest();
        req.setPickupSlot("12:30 - 12:45");
        req.setItems(List.of());

        ResponseEntity<?> response = orderController.placeOrder(req, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("POST /orders: rejects missing pickup slot")
    void placeOrder_missingPickupSlot_returns400() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(authUser));

        OrderItemRequest item = new OrderItemRequest();
        item.setMenuItemId(1L);
        item.setQty(1);

        OrderRequest req = new OrderRequest();
        req.setPickupSlot(""); // empty
        req.setItems(List.of(item));

        ResponseEntity<?> response = orderController.placeOrder(req, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("POST /orders: rejects quantity < 1")
    void placeOrder_quantityZero_returns400() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(authUser));

        OrderItemRequest item = new OrderItemRequest();
        item.setMenuItemId(1L);
        item.setQty(0);

        OrderRequest req = new OrderRequest();
        req.setPickupSlot("12:30 - 12:45");
        req.setItems(List.of(item));

        ResponseEntity<?> response = orderController.placeOrder(req, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("POST /orders: rejects quantity > 20")
    void placeOrder_quantityTooHigh_returns400() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(authUser));

        OrderItemRequest item = new OrderItemRequest();
        item.setMenuItemId(1L);
        item.setQty(21);

        OrderRequest req = new OrderRequest();
        req.setPickupSlot("12:30 - 12:45");
        req.setItems(List.of(item));

        ResponseEntity<?> response = orderController.placeOrder(req, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("POST /orders: rejects non-existent meal")
    void placeOrder_mealNotFound_returns400() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(authUser));
        when(mealRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());

        OrderItemRequest item = new OrderItemRequest();
        item.setMenuItemId(99L);
        item.setQty(1);

        OrderRequest req = new OrderRequest();
        req.setPickupSlot("12:30 - 12:45");
        req.setItems(List.of(item));

        ResponseEntity<?> response = orderController.placeOrder(req, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("POST /orders: rejects unavailable meal")
    void placeOrder_mealUnavailable_returns400() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(authUser));
        availableMeal.setIsAvailable(false);
        when(mealRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(availableMeal));

        OrderItemRequest item = new OrderItemRequest();
        item.setMenuItemId(1L);
        item.setQty(1);

        OrderRequest req = new OrderRequest();
        req.setPickupSlot("12:30 - 12:45");
        req.setItems(List.of(item));

        ResponseEntity<?> response = orderController.placeOrder(req, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("POST /orders: rejects order when insufficient stock")
    void placeOrder_insufficientStock_returns409() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(authUser));
        availableMeal.setAvailableQuantity(2); // only 2 in stock
        when(mealRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(availableMeal));

        OrderItemRequest item = new OrderItemRequest();
        item.setMenuItemId(1L);
        item.setQty(5); // requesting 5

        OrderRequest req = new OrderRequest();
        req.setPickupSlot("12:30 - 12:45");
        req.setItems(List.of(item));

        ResponseEntity<?> response = orderController.placeOrder(req, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    // ── Successful order ──────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /orders: succeeds with valid meal and sufficient stock")
    void placeOrder_validRequest_returns201() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(authUser));
        when(mealRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(availableMeal));
        when(mealRepository.save(any())).thenReturn(availableMeal);

        Order savedOrder = new Order();
        savedOrder.setId(1L);
        savedOrder.setOrderNumber("MS10999");
        savedOrder.setStatus("CONFIRMED");
        savedOrder.setTotalAmount(240.0);
        savedOrder.setPickupSlot("12:30 - 12:45");
        savedOrder.setPaymentMethod("UPI");
        savedOrder.setPaymentStatus("PAID");
        savedOrder.setTransactionId("TXN_SIM_TEST");
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);

        OrderItemRequest item = new OrderItemRequest();
        item.setMenuItemId(1L);
        item.setQty(2);

        OrderRequest req = new OrderRequest();
        req.setPickupSlot("12:30 - 12:45");
        req.setItems(List.of(item));
        req.setPaymentMethod("UPI");

        ResponseEntity<?> response = orderController.placeOrder(req, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    @DisplayName("POST /orders: server computes total from DB price, ignores any client price")
    void placeOrder_serverComputesTotal() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(authUser));
        availableMeal.setPrice(120.0);
        when(mealRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(availableMeal));
        when(mealRepository.save(any())).thenReturn(availableMeal);

        Order savedOrder = new Order();
        savedOrder.setId(1L);
        savedOrder.setOrderNumber("MS11000");
        savedOrder.setStatus("CONFIRMED");
        savedOrder.setTotalAmount(360.0); // 120 * 3 = 360 (DB price, not client-supplied)
        savedOrder.setPickupSlot("12:30 - 12:45");
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);

        OrderItemRequest item = new OrderItemRequest();
        item.setMenuItemId(1L);
        item.setQty(3);

        OrderRequest req = new OrderRequest();
        req.setPickupSlot("12:30 - 12:45");
        req.setItems(List.of(item));

        ResponseEntity<?> response = orderController.placeOrder(req, authentication);

        // The order saved to DB should use server-computed total (120 * 3 = 360)
        verify(orderRepository).save(argThat(o -> o.getTotalAmount() == 360.0));
    }

    @Test
    @DisplayName("POST /orders: stock is decremented after a successful order")
    void placeOrder_stockIsDecremented() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(authUser));
        availableMeal.setAvailableQuantity(50);
        when(mealRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(availableMeal));
        when(mealRepository.save(any())).thenReturn(availableMeal);

        Order savedOrder = new Order();
        savedOrder.setId(1L);
        savedOrder.setOrderNumber("MS11001");
        savedOrder.setStatus("CONFIRMED");
        savedOrder.setTotalAmount(120.0);
        savedOrder.setPickupSlot("12:30 - 12:45");
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);

        OrderItemRequest item = new OrderItemRequest();
        item.setMenuItemId(1L);
        item.setQty(1);

        OrderRequest req = new OrderRequest();
        req.setPickupSlot("12:30 - 12:45");
        req.setItems(List.of(item));

        orderController.placeOrder(req, authentication);

        // Stock decremented: 50 - 1 = 49
        assertThat(availableMeal.getAvailableQuantity()).isEqualTo(49);
        verify(mealRepository).save(availableMeal);
    }

    // ── Order Cancellation Tests ──────────────────────────────────────────────

    @Test
    @DisplayName("PUT /orders/{id}/cancel: succeeds and restores meal stock")
    void cancelOrder_ownerSucceeds_restoresStock() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(authUser));

        Order order = new Order();
        order.setId(10L);
        order.setUser(authUser);
        order.setStatus("CONFIRMED");
        order.setPaymentStatus("PAID");

        com.mealsync.model.OrderItem orderItem = new com.mealsync.model.OrderItem();
        orderItem.setMeal(availableMeal);
        orderItem.setQuantity(2);
        order.setItems(List.of(orderItem));

        availableMeal.setAvailableQuantity(48);

        when(orderRepository.findById(10L)).thenReturn(Optional.of(order));
        when(mealRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(availableMeal));
        when(mealRepository.save(any())).thenReturn(availableMeal);
        when(orderRepository.save(any())).thenReturn(order);

        ResponseEntity<?> response = orderController.cancelOrder(10L, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(availableMeal.getAvailableQuantity()).isEqualTo(50); // 48 + 2
        assertThat(order.getStatus()).isEqualTo("CANCELLED");
        assertThat(order.getPaymentStatus()).isEqualTo("REFUNDED");
        verify(mealRepository).save(availableMeal);
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("PUT /orders/{id}/cancel: returns 403 when another user attempts to cancel")
    void cancelOrder_otherUser_returns403() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(authUser));

        User otherUser = new User();
        otherUser.setId(99L);

        Order order = new Order();
        order.setId(10L);
        order.setUser(otherUser);
        order.setStatus("CONFIRMED");

        when(orderRepository.findById(10L)).thenReturn(Optional.of(order));

        ResponseEntity<?> response = orderController.cancelOrder(10L, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
