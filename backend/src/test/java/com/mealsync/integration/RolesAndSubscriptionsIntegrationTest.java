package com.mealsync.integration;

import com.mealsync.config.AdminBootstrap;
import com.mealsync.model.Meal;
import com.mealsync.repository.MealRepository;
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
 * Roles, administrator provisioning, authorization and subscriptions against real MySQL.
 * All accounts use random emails and passwords generated per run.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "management.server.port=0")
class RolesAndSubscriptionsIntegrationTest {

    private static final String BOOTSTRAP_EMAIL = "bootstrap-" + UUID.randomUUID() + "@example.com";

    @DynamicPropertySource
    static void config(DynamicPropertyRegistry registry) {
        MySqlTestContainer.register(registry);
        registry.add("MEALSYNC_BOOTSTRAP_ADMIN_EMAIL", () -> BOOTSTRAP_EMAIL);
    }

    @LocalServerPort int port;
    @Autowired TestRestTemplate rest;
    @Autowired AdminBootstrap adminBootstrap;
    @Autowired UserRepository userRepository;
    @Autowired MealRepository mealRepository;

    @BeforeEach
    void useJdkHttpClient() {
        rest.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private record Account(String email, String password, Long id, String token, String role) {}

    private String url(String path) { return "http://localhost:" + port + path; }

    private ResponseEntity<Map> call(HttpMethod method, String path, Object body, String token) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) h.setBearerAuth(token);
        return rest.exchange(url(path), method, new HttpEntity<>(body, h), Map.class);
    }

    /** GET returning a JSON array on success (error responses are JSON objects, hence Object). */
    private ResponseEntity<Object> callList(String path, String token) {
        HttpHeaders h = new HttpHeaders();
        if (token != null) h.setBearerAuth(token);
        return rest.exchange(url(path), HttpMethod.GET, new HttpEntity<>(h), Object.class);
    }

    private static List<?> list(ResponseEntity<Object> res) {
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        return (List<?>) res.getBody();
    }

    private Account register(String email) {
        String password = "Pw-" + UUID.randomUUID();
        ResponseEntity<Map> reg = call(HttpMethod.POST, "/api/auth/register",
                Map.of("name", "Test User", "email", email, "password", password), null);
        assertThat(reg.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return login(email, password);
    }

    private Account login(String email, String password) {
        ResponseEntity<Map> res = call(HttpMethod.POST, "/api/auth/login", Map.of("email", email, "password", password), null);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map b = res.getBody();
        return new Account(email, password, ((Number) b.get("userId")).longValue(), (String) b.get("token"), (String) b.get("role"));
    }

    private Account newCustomer() { return register("cust-" + UUID.randomUUID() + "@example.com"); }

    /** Passwords of accounts created in this class (JUnit uses a new instance per test). */
    private static final Map<String, String> passwords = new ConcurrentHashMap<>();

    private Account loginExisting(String email) {
        return login(email, passwords.get(email));
    }

    private Map orderBody(String key) {
        Meal meal = mealRepository.findAll().stream()
                .filter(m -> Boolean.TRUE.equals(m.getIsAvailable()) && m.getAvailableQuantity() != null && m.getAvailableQuantity() > 5)
                .findFirst().orElseThrow();
        return Map.of("pickupSlot", "1:00 – 1:15", "paymentMethod", "UPI", "idempotencyKey", key,
                "items", List.of(Map.of("menuItemId", meal.getId(), "qty", 1)));
    }

    // ── registration and customer login ─────────────────────────────────────

    @Test
    @DisplayName("Registration always creates a customer (ROLE_USER), even if the payload asks for admin")
    void registrationIgnoresRequestedRole() {
        String email = "selfpromo-" + UUID.randomUUID() + "@example.com";
        String password = "Pw-" + UUID.randomUUID();
        Map<String, Object> body = new HashMap<>(Map.of("name", "Mallory", "email", email, "password", password));
        body.put("role", "ROLE_ADMIN");
        body.put("isAdmin", true);
        assertThat(call(HttpMethod.POST, "/api/auth/register", body, null).getStatusCode()).isEqualTo(HttpStatus.CREATED);

        Account a = login(email, password);
        assertThat(a.role()).isEqualTo("ROLE_USER");
        assertThat(userRepository.findByEmail(email).orElseThrow().getRole()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("Student login returns ROLE_USER and every admin API is denied (403)")
    void studentCannotUseAdminApis() {
        Account s = newCustomer();
        assertThat(s.role()).isEqualTo("ROLE_USER");
        assertThat(call(HttpMethod.GET, "/api/admin/overview", null, s.token()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(callList("/api/admin/users", s.token()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(call(HttpMethod.PUT, "/api/admin/users/" + s.id() + "/role", Map.of("role", "ADMIN"), s.token())
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(userRepository.findById(s.id()).orElseThrow().getRole()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("Profile update cannot change the caller's role")
    void profileUpdateCannotChangeRole() {
        Account s = newCustomer();
        ResponseEntity<Map> res = call(HttpMethod.PUT, "/api/auth/profile",
                Map.of("name", "Still Student", "role", "ROLE_ADMIN"), s.token());
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).containsEntry("role", "ROLE_USER");
        assertThat(call(HttpMethod.GET, "/api/admin/overview", null, s.token()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ── administrator provisioning and access ───────────────────────────────

    @Test
    @DisplayName("Operator bootstrap promotes a registered account; admin can manage and also order food")
    void bootstrapAdminCanManageAndOrder() {
        String password = "Pw-" + UUID.randomUUID();
        if (userRepository.findByEmail(BOOTSTRAP_EMAIL).isEmpty()) {
            assertThat(call(HttpMethod.POST, "/api/auth/register",
                    Map.of("name", "Mess Admin", "email", BOOTSTRAP_EMAIL, "password", password), null)
                    .getStatusCode()).isEqualTo(HttpStatus.CREATED);
            passwords.put(BOOTSTRAP_EMAIL, password);
            // Freshly registered and not yet bootstrapped: plain customer
            assertThat(loginExisting(BOOTSTRAP_EMAIL).role()).isEqualTo("ROLE_USER");
        }

        adminBootstrap.run();

        Account admin = loginExisting(BOOTSTRAP_EMAIL);
        assertThat(admin.role()).isEqualTo("ROLE_ADMIN");
        assertThat(call(HttpMethod.GET, "/api/auth/me", null, admin.token()).getBody()).containsEntry("role", "ROLE_ADMIN");
        assertThat(call(HttpMethod.GET, "/api/admin/overview", null, admin.token()).getStatusCode()).isEqualTo(HttpStatus.OK);

        // The same account orders food as a customer
        ResponseEntity<Map> order = call(HttpMethod.POST, "/api/orders", orderBody("admin-" + UUID.randomUUID()), admin.token());
        assertThat(order.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(list(callList("/api/orders/user/" + admin.id(), admin.token()))).isNotEmpty();

        // An administrator cannot change their own role
        ResponseEntity<Map> self = call(HttpMethod.PUT, "/api/admin/users/" + admin.id() + "/role", Map.of("role", "USER"), admin.token());
        assertThat(self.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        // Bootstrap is idempotent
        adminBootstrap.run();
        assertThat(loginExisting(BOOTSTRAP_EMAIL).role()).isEqualTo("ROLE_ADMIN");
    }

    @Test
    @DisplayName("Admin promotion takes effect on the user's existing token; demotion removes access")
    void adminPromotesAndDemotes() {
        String password = "Pw-" + UUID.randomUUID();
        if (userRepository.findByEmail(BOOTSTRAP_EMAIL).isEmpty()) {
            call(HttpMethod.POST, "/api/auth/register", Map.of("name", "Mess Admin", "email", BOOTSTRAP_EMAIL, "password", password), null);
            passwords.put(BOOTSTRAP_EMAIL, password);
        }
        adminBootstrap.run();
        Account admin = loginExisting(BOOTSTRAP_EMAIL);
        Account staff = newCustomer();

        assertThat(call(HttpMethod.GET, "/api/admin/overview", null, staff.token()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        ResponseEntity<Map> promoted = call(HttpMethod.PUT, "/api/admin/users/" + staff.id() + "/role", Map.of("role", "ADMIN"), admin.token());
        assertThat(promoted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(promoted.getBody()).containsEntry("role", "ROLE_ADMIN");
        // role is read from the database on every request — the old token now has admin access
        assertThat(call(HttpMethod.GET, "/api/admin/overview", null, staff.token()).getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(call(HttpMethod.PUT, "/api/admin/users/" + staff.id() + "/role", Map.of("role", "USER"), admin.token())
                .getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(call(HttpMethod.GET, "/api/admin/overview", null, staff.token()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        assertThat(call(HttpMethod.PUT, "/api/admin/users/" + staff.id() + "/role", Map.of("role", "SUPERUSER"), admin.token())
                .getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(call(HttpMethod.PUT, "/api/admin/users/99999999/role", Map.of("role", "ADMIN"), admin.token())
                .getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        List<?> users = list(callList("/api/admin/users?q=" + staff.email(), admin.token()));
        assertThat(users).hasSize(1);
        assertThat((Map<String, Object>) users.get(0)).doesNotContainKey("password");
    }

    // ── subscriptions ───────────────────────────────────────────────────────

    @Test
    @DisplayName("Subscription lifecycle persists: subscribe, duplicate 409, pause, resume, skip today, re-login")
    void subscriptionLifecycle() {
        Account s = newCustomer();
        passwords.put(s.email(), s.password());

        assertThat(list(callList("/api/subscriptions/plans", s.token()))).hasSizeGreaterThanOrEqualTo(5);

        // FULL_BOARD serves every day, so "skip today" is valid whatever day the test runs
        ResponseEntity<Map> sub = call(HttpMethod.POST, "/api/subscriptions", Map.of("planCode", "FULL_BOARD", "paymentMethod", "UPI"), s.token());
        assertThat(sub.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(sub.getBody()).containsEntry("status", "ACTIVE").containsEntry("paymentSimulated", true)
                .containsEntry("amountCharged", 3200.0).containsEntry("mealsRemaining", 90);
        long id = ((Number) sub.getBody().get("id")).longValue();

        assertThat(call(HttpMethod.POST, "/api/subscriptions", Map.of("planCode", "FULL_BOARD"), s.token())
                .getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        assertThat(call(HttpMethod.POST, "/api/subscriptions/" + id + "/skip-today", null, s.token()).getBody())
                .containsEntry("mealsSkipped", 1).containsEntry("mealsRemaining", 89).containsEntry("canSkipToday", false);
        assertThat(call(HttpMethod.POST, "/api/subscriptions/" + id + "/skip-today", null, s.token())
                .getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        assertThat(call(HttpMethod.POST, "/api/subscriptions/" + id + "/pause", null, s.token()).getBody()).containsEntry("status", "PAUSED");
        assertThat(call(HttpMethod.POST, "/api/subscriptions/" + id + "/pause", null, s.token()).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(call(HttpMethod.POST, "/api/subscriptions/" + id + "/skip-today", null, s.token()).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(call(HttpMethod.POST, "/api/subscriptions/" + id + "/resume", null, s.token()).getBody()).containsEntry("status", "ACTIVE");
        assertThat(call(HttpMethod.POST, "/api/subscriptions/" + id + "/resume", null, s.token()).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        call(HttpMethod.POST, "/api/subscriptions/" + id + "/pause", null, s.token());

        // New login (new token): state comes back from the database
        Account again = loginExisting(s.email());
        List<?> mine = list(callList("/api/subscriptions/me", again.token()));
        assertThat(mine).hasSize(1);
        assertThat((Map<String, Object>) mine.get(0)).containsEntry("status", "PAUSED").containsEntry("mealsSkipped", 1);

        // Another customer cannot see or change it
        Account other = newCustomer();
        assertThat(call(HttpMethod.POST, "/api/subscriptions/" + id + "/resume", null, other.token()).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(list(callList("/api/subscriptions/me", other.token()))).isEmpty();

        // Unknown plan / unauthenticated
        assertThat(call(HttpMethod.POST, "/api/subscriptions", Map.of("planCode", "NOPE"), s.token()).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(callList("/api/subscriptions/me", null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Concurrent duplicate subscribe requests create exactly one subscription")
    void concurrentSubscribeCreatesOne() throws Exception {
        Account s = newCustomer();
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<HttpStatusCode> attempt = () -> {
            start.await();
            return call(HttpMethod.POST, "/api/subscriptions", Map.of("planCode", "MONTHLY_LUNCH"), s.token()).getStatusCode();
        };
        Future<HttpStatusCode> a = pool.submit(attempt);
        Future<HttpStatusCode> b = pool.submit(attempt);
        start.countDown();
        List<HttpStatusCode> codes = List.of(a.get(30, TimeUnit.SECONDS), b.get(30, TimeUnit.SECONDS));
        pool.shutdown();

        assertThat(codes).containsExactlyInAnyOrder(HttpStatus.CREATED, HttpStatus.CONFLICT);
        assertThat(list(callList("/api/subscriptions/me", s.token()))).hasSize(1);
    }
}
