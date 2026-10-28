package com.mealsync.controller;

import com.mealsync.dto.AdminOverviewResponse;
import com.mealsync.dto.OrderStatusRequest;
import com.mealsync.dto.ProductRequest;
import com.mealsync.model.Meal;
import com.mealsync.model.Order;
import com.mealsync.model.OrderItem;
import com.mealsync.model.User;
import com.mealsync.repository.MealRepository;
import com.mealsync.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminControllerTest {

    @Mock
    private MealRepository mealRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private com.mealsync.repository.UserRepository userRepository;

    @Mock
    private com.mealsync.service.PaymentService paymentService;

    @InjectMocks
    private AdminController adminController;

    private Meal sampleMeal;
    private Order sampleOrder;

    @BeforeEach
    void setUp() {
        sampleMeal = new Meal();
        sampleMeal.setId(1L);
        sampleMeal.setName("Special Thali");
        sampleMeal.setCategory("thali");
        sampleMeal.setPrice(120.0);
        sampleMeal.setAvailableQuantity(50);
        sampleMeal.setIsAvailable(true);
        sampleMeal.setImageUrl("🍱");

        User user = new User();
        user.setId(10L);
        user.setName("Student One");
        user.setEmail("student@spit.edu");

        sampleOrder = new Order();
        sampleOrder.setId(100L);
        sampleOrder.setOrderNumber("MS10291");
        sampleOrder.setUser(user);
        sampleOrder.setStatus("CONFIRMED");
        sampleOrder.setTotalAmount(120.0);
        sampleOrder.setPickupSlot("12:30 – 12:45");
        sampleOrder.setOrderTime(LocalDateTime.now());

        OrderItem item = new OrderItem();
        item.setId(200L);
        item.setOrder(sampleOrder);
        item.setMeal(sampleMeal);
        item.setQuantity(2);
        item.setPriceAtTimeOfOrder(60.0);
        sampleOrder.setItems(List.of(item));
    }

    // ── Product CRUD Tests ────────────────────────────────────────────────────

    @Test
    @DisplayName("Admin: create product successfully")
    void createProduct_success() {
        when(mealRepository.existsByName("Samosa")).thenReturn(false);
        when(mealRepository.save(any(Meal.class))).thenAnswer(inv -> {
            Meal m = inv.getArgument(0);
            m.setId(2L);
            return m;
        });

        ProductRequest req = new ProductRequest("Samosa", "Crispy snack", "snacks", 20.0, 100, true, "🥟");
        ResponseEntity<?> resp = adminController.createProduct(req);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Meal created = (Meal) resp.getBody();
        assertThat(created).isNotNull();
        assertThat(created.getName()).isEqualTo("Samosa");
        assertThat(created.getPrice()).isEqualTo(20.0);
    }

    @Test
    @DisplayName("Admin: create product duplicate name returns 409 Conflict")
    void createProduct_duplicateName_returnsConflict() {
        when(mealRepository.existsByName("Special Thali")).thenReturn(true);

        ProductRequest req = new ProductRequest("Special Thali", "Desc", "thali", 120.0, 50, true, "🍱");
        ResponseEntity<?> resp = adminController.createProduct(req);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    @DisplayName("Admin: update product successfully")
    void updateProduct_success() {
        when(mealRepository.findById(1L)).thenReturn(Optional.of(sampleMeal));
        when(mealRepository.save(any(Meal.class))).thenReturn(sampleMeal);

        ProductRequest req = new ProductRequest("Special Thali", "Updated desc", "thali", 130.0, 45, true, "🍱");
        ResponseEntity<?> resp = adminController.updateProduct(1L, req);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(mealRepository).save(sampleMeal);
        assertThat(sampleMeal.getPrice()).isEqualTo(130.0);
    }

    @Test
    @DisplayName("Admin: deactivate product safely (isAvailable=false, stock=0, no DB deletion)")
    void deactivateProduct_safeDeactivation() {
        when(mealRepository.findById(1L)).thenReturn(Optional.of(sampleMeal));
        when(mealRepository.save(any(Meal.class))).thenReturn(sampleMeal);

        ResponseEntity<?> resp = adminController.deactivateProduct(1L);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(sampleMeal.getIsAvailable()).isFalse();
        assertThat(sampleMeal.getAvailableQuantity()).isEqualTo(0);
        verify(mealRepository, never()).delete(any());
        verify(mealRepository, never()).deleteById(any());
    }

    // ── Order Status Transition Tests ─────────────────────────────────────────

    @Test
    @DisplayName("Admin: valid order status transition CONFIRMED -> PREPARING")
    void updateOrderStatus_validTransition() {
        when(orderRepository.findById(100L)).thenReturn(Optional.of(sampleOrder));
        when(orderRepository.save(any(Order.class))).thenReturn(sampleOrder);

        OrderStatusRequest req = new OrderStatusRequest("PREPARING");
        ResponseEntity<?> resp = adminController.updateOrderStatus(100L, req);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(sampleOrder.getStatus()).isEqualTo("PREPARING");
    }

    @Test
    @DisplayName("Admin: valid order status transition PREPARING -> READY")
    void updateOrderStatus_preparingToReady() {
        sampleOrder.setStatus("PREPARING");
        when(orderRepository.findById(100L)).thenReturn(Optional.of(sampleOrder));
        when(orderRepository.save(any(Order.class))).thenReturn(sampleOrder);

        OrderStatusRequest req = new OrderStatusRequest("READY");
        ResponseEntity<?> resp = adminController.updateOrderStatus(100L, req);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(sampleOrder.getStatus()).isEqualTo("READY");
    }

    @Test
    @DisplayName("Admin: valid order status transition READY -> COMPLETED")
    void updateOrderStatus_readyToCompleted() {
        sampleOrder.setStatus("READY");
        when(orderRepository.findById(100L)).thenReturn(Optional.of(sampleOrder));
        when(orderRepository.save(any(Order.class))).thenReturn(sampleOrder);

        OrderStatusRequest req = new OrderStatusRequest("COMPLETED");
        ResponseEntity<?> resp = adminController.updateOrderStatus(100L, req);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(sampleOrder.getStatus()).isEqualTo("COMPLETED");
    }

    @Test
    @DisplayName("Admin: invalid backward transition COMPLETED -> PENDING rejected with 400")
    void updateOrderStatus_invalidTransition_rejected() {
        sampleOrder.setStatus("COMPLETED");
        when(orderRepository.findById(100L)).thenReturn(Optional.of(sampleOrder));

        OrderStatusRequest req = new OrderStatusRequest("PENDING");
        ResponseEntity<?> resp = adminController.updateOrderStatus(100L, req);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Admin: cancelling order restores meal stock")
    void updateOrderStatus_cancellationRestoresStock() {
        when(orderRepository.findById(100L)).thenReturn(Optional.of(sampleOrder));
        when(orderRepository.save(any(Order.class))).thenReturn(sampleOrder);

        int initialStock = sampleMeal.getAvailableQuantity(); // 50
        OrderStatusRequest req = new OrderStatusRequest("CANCELLED");
        ResponseEntity<?> resp = adminController.updateOrderStatus(100L, req);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(sampleOrder.getStatus()).isEqualTo("CANCELLED");
        // item quantity is 2, so stock should be restored by 2
        assertThat(sampleMeal.getAvailableQuantity()).isEqualTo(initialStock + 2);
        verify(mealRepository).save(sampleMeal);
    }

    // ── Overview Summary Tests ────────────────────────────────────────────────

    @Test
    @DisplayName("Admin: overview returns aggregate statistics")
    void getOverview_returnsAccurateStats() {
        when(orderRepository.findAllByOrderByOrderTimeDesc()).thenReturn(List.of(sampleOrder));
        when(mealRepository.findAll()).thenReturn(List.of(sampleMeal));

        ResponseEntity<AdminOverviewResponse> resp = adminController.getOverview();

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        AdminOverviewResponse overview = resp.getBody();
        assertThat(overview).isNotNull();
        assertThat(overview.getTotalOrders()).isEqualTo(1);
        assertThat(overview.getTodayOrders()).isEqualTo(1);
        assertThat(overview.getTodaySales()).isEqualTo(120.0);
        assertThat(overview.getPendingOrders()).isEqualTo(1); // CONFIRMED is pending
        assertThat(overview.getAvailableProducts()).isEqualTo(1);
        assertThat(overview.getSoldOutProducts()).isEqualTo(0);
    }

    // ── Counter Order Tests (Priority 3) ──────────────────────────────────────

    @Test
    @DisplayName("Admin: createCounterOrder for walk-in guest with Cash succeeds and decrements stock")
    void createCounterOrder_walkInCash_decrementsStock() {
        when(mealRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sampleMeal));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(201L);
            return o;
        });

        com.mealsync.dto.OrderItemRequest itemReq = new com.mealsync.dto.OrderItemRequest();
        itemReq.setMenuItemId(1L);
        itemReq.setQty(2);

        com.mealsync.dto.CounterOrderRequest req = new com.mealsync.dto.CounterOrderRequest();
        req.setCustomerName("Guest Walk-in");
        req.setPaymentMethod("CASH");
        req.setPaymentReceived(true);
        req.setItems(List.of(itemReq));

        org.springframework.security.core.Authentication auth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        "admin@spit.mess", null,
                        List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN")));

        ResponseEntity<?> response = adminController.createCounterOrder(req, auth);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(sampleMeal.getAvailableQuantity()).isEqualTo(48); // 50 - 2 = 48
        verify(mealRepository).save(sampleMeal);
        verify(orderRepository).save(argThat(o ->
                "COUNTER".equals(o.getOrderSource()) &&
                "Guest Walk-in".equals(o.getCustomerName()) &&
                "PAID".equals(o.getPaymentStatus()) &&
                o.getTotalAmount() == 240.0
        ));
    }

    @Test
    @DisplayName("Admin: createCounterOrder with insufficient stock returns 409 CONFLICT")
    void createCounterOrder_insufficientStock_returnsConflict() {
        sampleMeal.setAvailableQuantity(1);
        when(mealRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sampleMeal));

        com.mealsync.dto.OrderItemRequest itemReq = new com.mealsync.dto.OrderItemRequest();
        itemReq.setMenuItemId(1L);
        itemReq.setQty(5); // requested 5 > available 1

        com.mealsync.dto.CounterOrderRequest req = new com.mealsync.dto.CounterOrderRequest();
        req.setCustomerName("Guest Walk-in");
        req.setPaymentMethod("CASH");
        req.setItems(List.of(itemReq));

        org.springframework.security.core.Authentication auth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        "admin@spit.mess", null,
                        List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN")));

        ResponseEntity<?> response = adminController.createCounterOrder(req, auth);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        verify(orderRepository, never()).save(any());
    }

    // ── Payment Records Tests (Priority 4) ────────────────────────────────────

    @Test
    @DisplayName("Admin: getPaymentRecords filters by source and search query")
    void getPaymentRecords_filtersCorrectly() {
        Order counterOrder = new Order();
        counterOrder.setId(301L);
        counterOrder.setOrderNumber("MS-CTR-12345");
        counterOrder.setOrderSource("COUNTER");
        counterOrder.setCustomerName("Rahul Sharma");
        counterOrder.setPaymentMethod("UPI");
        counterOrder.setPaymentStatus("PAID");
        counterOrder.setTotalAmount(150.0);

        Order portalOrder = new Order();
        portalOrder.setId(302L);
        portalOrder.setOrderNumber("MS10999");
        portalOrder.setOrderSource("PORTAL");
        portalOrder.setCustomerName("Aryan Student");
        portalOrder.setPaymentMethod("CARD");
        portalOrder.setPaymentStatus("PAID");
        portalOrder.setTotalAmount(200.0);

        when(orderRepository.findAllByOrderByOrderTimeDesc()).thenReturn(List.of(counterOrder, portalOrder));

        // Filter by source = COUNTER
        ResponseEntity<List<Order>> respCounter = adminController.getPaymentRecords(null, "COUNTER", null, null);
        assertThat(respCounter.getBody()).hasSize(1);
        assertThat(respCounter.getBody().get(0).getOrderNumber()).isEqualTo("MS-CTR-12345");

        // Filter by search = Aryan
        ResponseEntity<List<Order>> respSearch = adminController.getPaymentRecords("Aryan", null, null, null);
        assertThat(respSearch.getBody()).hasSize(1);
        assertThat(respSearch.getBody().get(0).getCustomerName()).isEqualTo("Aryan Student");
    }
}
