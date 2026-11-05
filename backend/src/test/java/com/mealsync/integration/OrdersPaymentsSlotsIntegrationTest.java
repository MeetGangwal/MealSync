package com.mealsync.integration;

import com.mealsync.config.DataSeeder;
import com.mealsync.model.Meal;
import com.mealsync.repository.MealRepository;
import com.mealsync.repository.PickupSlotRepository;
import com.mealsync.repository.SubscriptionPlanRepository;
import com.mealsync.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.*;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Orders, payment records, pickup-slot capacity and seeding against real MySQL (Testcontainers).
 * Accounts and slots use random names; the database is the isolated test container.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "management.server.port=0")
class OrdersPaymentsSlotsIntegrationTest {

    @DynamicPropertySource
    static void config(DynamicPropertyRegistry registry) {
        MySqlTestContainer.register(registry);
    }

    @LocalServerPort int port;
    @Autowired TestRestTemplate rest;
    @Autowired UserRepository userRepository;
    @Autowired MealRepository mealRepository;
    @Autowired PickupSlotRepository slotRepository;
    @Autowired SubscriptionPlanRepository planRepository;
    @Autowired DataSeeder dataSeeder;

    @BeforeEach
    void client() {
        rest.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
    }

    private ResponseEntity<Object> call(HttpMethod m, String path, Object body, String token) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) h.setBearerAuth(token);
        return rest.exchange("http://localhost:" + port + path, m, new HttpEntity<>(body, h), Object.class);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(ResponseEntity<Object> r) { return (Map<String, Object>) r.getBody(); }

    private record Acc(long id, String token, String name, String email) {}

    private Acc customer(String name) {
        String email = "it-" + UUID.randomUUID() + "@example.com";
        String pw = "Pw-" + UUID.randomUUID();
        assertThat(call(HttpMethod.POST, "/api/auth/register", Map.of("name", name, "email", email, "password", pw), null)
                .getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Map<String, Object> login = map(call(HttpMethod.POST, "/api/auth/login", Map.of("email", email, "password", pw), null));
        return new Acc(((Number) login.get("userId")).longValue(), (String) login.get("token"), name, email);
    }

    /** Test fixture: an administrator created directly in the isolated test database. */
    private Acc admin() {
        Acc a = customer("IT Admin");
        var u = userRepository.findById(a.id()).orElseThrow();
        u.setRole("ROLE_ADMIN");
        userRepository.save(u);
        return a;
    }

    private Meal stocked(int minQty) {
        return mealRepository.findAll().stream()
                .filter(m -> Boolean.TRUE.equals(m.getIsAvailable()) && m.getAvailableQuantity() != null && m.getAvailableQuantity() >= minQty)
                .findFirst().orElseThrow();
    }

    private Map<String, Object> orderBody(String slot, List<Map<String, Object>> items) {
        return Map.of("pickupSlot", slot, "paymentMethod", "UPI", "idempotencyKey", "it-" + UUID.randomUUID(), "items", items);
    }

    @Test
    @DisplayName("Slots: listed with bookings; unknown slot rejected; capacity holds under concurrent orders")
    void slotCapacity() throws Exception {
        Acc adm = admin();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> slots = (List<Map<String, Object>>) call(HttpMethod.GET, "/api/slots", null, customer("Slot Viewer").token()).getBody();
        assertThat(slots).hasSizeGreaterThanOrEqualTo(8);
        assertThat(slots.get(0)).containsKeys("label", "capacity", "booked", "remaining", "active");

        String label = "IT " + UUID.randomUUID().toString().substring(0, 8);
        assertThat(call(HttpMethod.POST, "/api/admin/slots",
                Map.of("label", label, "mealPeriod", "lunch", "startTime", "14:00", "endTime", "14:15", "capacity", 1), adm.token())
                .getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Acc student = customer("Slot Student");
        assertThat(call(HttpMethod.POST, "/api/admin/slots",
                Map.of("label", label + "x", "mealPeriod", "lunch", "startTime", "14:00", "endTime", "14:15", "capacity", 1), student.token())
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        Meal meal = stocked(5);
        List<Map<String, Object>> one = List.of(Map.of("menuItemId", meal.getId(), "qty", 1));
        assertThat(call(HttpMethod.POST, "/api/orders", orderBody("No such slot", one), student.token())
                .getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        Acc a = customer("Racer A"), b = customer("Racer B");
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch go = new CountDownLatch(1);
        Callable<HttpStatusCode> attempt1 = () -> { go.await(); return call(HttpMethod.POST, "/api/orders", orderBody(label, one), a.token()).getStatusCode(); };
        Callable<HttpStatusCode> attempt2 = () -> { go.await(); return call(HttpMethod.POST, "/api/orders", orderBody(label, one), b.token()).getStatusCode(); };
        Future<HttpStatusCode> f1 = pool.submit(attempt1), f2 = pool.submit(attempt2);
        go.countDown();
        List<HttpStatusCode> codes = List.of(f1.get(30, TimeUnit.SECONDS), f2.get(30, TimeUnit.SECONDS));
        pool.shutdown();
        assertThat(codes).containsExactlyInAnyOrder(HttpStatus.CREATED, HttpStatus.CONFLICT);

        long slotId = slotRepository.findByLabel(label).orElseThrow().getId();
        assertThat(call(HttpMethod.PUT, "/api/admin/slots/" + slotId, Map.of("capacity", 2), adm.token()).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(call(HttpMethod.POST, "/api/orders", orderBody(label, one), customer("Third").token()).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    @DisplayName("A rejected multi-item order leaves no stock change behind (no partial decrement)")
    void noStockLeak() {
        Acc s = customer("Leak Check");
        Meal first = stocked(5);
        int before = mealRepository.findById(first.getId()).orElseThrow().getAvailableQuantity();
        List<Map<String, Object>> items = List.of(
                Map.of("menuItemId", first.getId(), "qty", 2),
                Map.of("menuItemId", 99999999L, "qty", 1)); // second item does not exist
        assertThat(call(HttpMethod.POST, "/api/orders", orderBody("12:30 – 12:45", items), s.token())
                .getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(mealRepository.findById(first.getId()).orElseThrow().getAvailableQuantity()).isEqualTo(before);
    }

    @Test
    @SuppressWarnings("unchecked")
    @DisplayName("Payment records: real item names, quantities, prices and customer; admin cancel refunds; totals reconcile with Overview")
    void paymentRecordsAndRevenue() {
        Acc adm = admin();
        Acc s = customer("Meera Nair");
        List<Meal> meals = mealRepository.findAll().stream()
                .filter(m -> Boolean.TRUE.equals(m.getIsAvailable()) && m.getAvailableQuantity() != null && m.getAvailableQuantity() >= 3)
                .limit(2).toList();
        List<Map<String, Object>> items = List.of(
                Map.of("menuItemId", meals.get(0).getId(), "qty", 2),
                Map.of("menuItemId", meals.get(1).getId(), "qty", 1));
        Map<String, Object> placed = map(call(HttpMethod.POST, "/api/orders", orderBody("12:45 – 1:00", items), s.token()));
        String orderNumber = (String) placed.get("orderNumber");
        long orderId = ((Number) placed.get("id")).longValue();

        Map<String, Object> body = map(call(HttpMethod.GET, "/api/admin/payment-records?search=" + orderNumber, null, adm.token()));
        List<Map<String, Object>> recs = (List<Map<String, Object>>) body.get("records");
        assertThat(recs).hasSize(1);
        Map<String, Object> r = recs.get(0);
        assertThat(r).containsEntry("customerName", "Meera Nair").containsEntry("customerEmail", s.email())
                .containsEntry("registeredCustomer", true).containsEntry("paymentCategory", "COLLECTED");
        List<Map<String, Object>> its = (List<Map<String, Object>>) r.get("items");
        assertThat(its).extracting(m -> m.get("name")).containsExactly(meals.get(0).getName(), meals.get(1).getName());
        assertThat(its).extracting(m -> m.get("quantity")).containsExactly(2, 1);
        assertThat(((Number) its.get(0).get("subtotal")).doubleValue()).isEqualTo(meals.get(0).getPrice() * 2);

        // Overview today and Payment Records (all) use the same definitions
        double overviewToday = ((Number) map(call(HttpMethod.GET, "/api/admin/overview", null, adm.token())).get("todaySales")).doubleValue();
        Map<String, Object> todaySummary = (Map<String, Object>) map(call(HttpMethod.GET, "/api/admin/overview", null, adm.token())).get("todaySummary");
        assertThat(((Number) todaySummary.get("collectedRevenue")).doubleValue()).isEqualTo(overviewToday);

        // Admin cancels: payment becomes REFUNDED and leaves collected revenue
        double collectedBefore = ((Number) ((Map<String, Object>) map(call(HttpMethod.GET, "/api/admin/payment-records", null, adm.token())).get("summary")).get("collectedRevenue")).doubleValue();
        assertThat(call(HttpMethod.PUT, "/api/admin/orders/" + orderId + "/status", Map.of("status", "CANCELLED"), adm.token()).getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> after = map(call(HttpMethod.GET, "/api/admin/payment-records?search=" + orderNumber, null, adm.token()));
        assertThat(((List<Map<String, Object>>) after.get("records")).get(0)).containsEntry("paymentStatus", "REFUNDED");
        double collectedAfter = ((Number) ((Map<String, Object>) map(call(HttpMethod.GET, "/api/admin/payment-records", null, adm.token())).get("summary")).get("collectedRevenue")).doubleValue();
        assertThat(collectedAfter).isEqualTo(collectedBefore - ((Number) placed.get("totalAmount")).doubleValue());

        // Students cannot read financial records
        assertThat(call(HttpMethod.GET, "/api/admin/payment-records", null, s.token()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(call(HttpMethod.GET, "/api/admin/analytics", null, s.token()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(call(HttpMethod.GET, "/api/admin/monitoring", null, s.token()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // Analytics and forecast respond with real, labelled data
        Map<String, Object> analytics = map(call(HttpMethod.GET, "/api/admin/analytics?days=7", null, adm.token()));
        assertThat((List<?>) analytics.get("daily")).hasSize(7);
        assertThat(map(call(HttpMethod.GET, "/api/admin/forecast", null, adm.token()))).containsKey("method");
    }

    @Test
    @SuppressWarnings("unchecked")
    @DisplayName("Counter customer lookup honours the 'query' parameter the UI sends")
    void counterCustomerSearch() {
        Acc adm = admin();
        Acc s = customer("Zubin Unique" + UUID.randomUUID().toString().substring(0, 6));
        List<Map<String, Object>> found = (List<Map<String, Object>>) call(HttpMethod.GET,
                "/api/admin/customers/search?query=" + s.email(), null, adm.token()).getBody();
        assertThat(found).hasSize(1);
        assertThat(found.get(0)).containsEntry("email", s.email());
    }

    @Test
    @DisplayName("Seeding is idempotent: running it again creates no duplicate meals, slots or plans")
    void seedingIdempotent() throws Exception {
        long meals = mealRepository.count(), slots = slotRepository.count(), plans = planRepository.count(), users = userRepository.count();
        dataSeeder.run();
        dataSeeder.run();
        assertThat(mealRepository.count()).isEqualTo(meals);
        assertThat(slotRepository.count()).isEqualTo(slots);
        assertThat(planRepository.count()).isEqualTo(plans);
        assertThat(userRepository.count()).isEqualTo(users); // demo users are off by default
    }
}
