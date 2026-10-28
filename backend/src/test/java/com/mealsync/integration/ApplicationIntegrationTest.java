package com.mealsync.integration;

import com.mealsync.config.DataSeeder;
import com.mealsync.model.Meal;
import com.mealsync.repository.MealRepository;
import com.mealsync.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.actuate.observability.AutoConfigureObservability;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalManagementPort;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end tests against a real MySQL database with the default configuration
 * (demo-user seeding not enabled).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "management.server.port=0")
@AutoConfigureObservability // tests disable metrics export by default; re-enable to test /actuator/prometheus
class ApplicationIntegrationTest {

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        MySqlTestContainer.register(registry);
    }

    @LocalServerPort
    int port;

    @LocalManagementPort
    int managementPort;

    @Autowired
    TestRestTemplate rest;

    @Autowired
    MealRepository mealRepository;

    @Autowired
    UserRepository userRepository;

    /** java.net.http client: reads 401 bodies on POST (HttpURLConnection cannot in streaming mode). */
    @BeforeEach
    void useJdkHttpClient() {
        rest.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
    }

    private String api(String path) {
        return "http://localhost:" + port + path;
    }

    private String management(String path) {
        return "http://localhost:" + managementPort + path;
    }

    @Test
    @DisplayName("Meal catalogue is seeded into MySQL and served publicly")
    void mealsAreSeededAndPublic() {
        assertThat(mealRepository.count()).isGreaterThan(0);
        ResponseEntity<List> res = rest.getForEntity(api("/api/meals"), List.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).isNotEmpty();
    }

    @Autowired
    DataSeeder dataSeeder;

    @Test
    @DisplayName("Concurrent seeding (e.g. several replicas starting together) creates no duplicate meals")
    void concurrentSeedingCreatesNoDuplicates() throws Exception {
        long before = mealRepository.count();
        // Remove two catalogue rows so both seeders race to re-insert them
        List<Meal> victims = mealRepository.findAll().stream()
                .filter(m -> m.getName().equals("Vada Pav") || m.getName().equals("Masala Chai")).toList();
        mealRepository.deleteAll(victims);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> runs = List.of(
                pool.submit(() -> { start.await(); dataSeeder.run(); return null; }),
                pool.submit(() -> { start.await(); dataSeeder.run(); return null; }));
        start.countDown();
        for (Future<?> f : runs) f.get(60, TimeUnit.SECONDS);
        pool.shutdown();

        Map<String, Long> perName = mealRepository.findAll().stream()
                .collect(Collectors.groupingBy(Meal::getName, Collectors.counting()));
        assertThat(perName.values()).allMatch(n -> n == 1L);
        assertThat(mealRepository.count()).isEqualTo(before);
    }

    @Test
    @DisplayName("Demo users are NOT seeded unless explicitly enabled")
    void demoUsersNotSeededByDefault() {
        assertThat(userRepository.findByEmail("aryan@spit.edu")).isEmpty();
        assertThat(userRepository.findByEmail("admin@spit.mess")).isEmpty();
    }

    @Test
    @DisplayName("Register -> login -> /api/auth/me works; student is denied admin; no token is 401")
    void registerLoginAndAuthorize() {
        String email = "it-" + UUID.randomUUID() + "@example.com";
        String password = "Pw-" + UUID.randomUUID();

        ResponseEntity<Map> reg = rest.postForEntity(api("/api/auth/register"),
                Map.of("name", "Integration Student", "email", email, "password", password), Map.class);
        assertThat(reg.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        ResponseEntity<Map> dup = rest.postForEntity(api("/api/auth/register"),
                Map.of("name", "Integration Student", "email", email, "password", password), Map.class);
        assertThat(dup.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        ResponseEntity<Map> badLogin = rest.postForEntity(api("/api/auth/login"),
                Map.of("email", email, "password", password + "-wrong"), Map.class);
        assertThat(badLogin.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        ResponseEntity<Map> login = rest.postForEntity(api("/api/auth/login"),
                Map.of("email", email.toUpperCase(), "password", password), Map.class);
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(login.getBody()).containsEntry("role", "ROLE_USER").containsKeys("token", "userId", "name", "email");
        String token = (String) login.getBody().get("token");

        HttpHeaders auth = new HttpHeaders();
        auth.setBearerAuth(token);
        ResponseEntity<Map> me = rest.exchange(api("/api/auth/me"), HttpMethod.GET, new HttpEntity<>(auth), Map.class);
        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(me.getBody()).containsEntry("email", email);

        ResponseEntity<String> admin = rest.exchange(api("/api/admin/overview"), HttpMethod.GET, new HttpEntity<>(auth), String.class);
        assertThat(admin.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<String> noToken = rest.getForEntity(api("/api/auth/me"), String.class);
        assertThat(noToken.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Health and Prometheus metrics are served on the management port only")
    void actuatorOnManagementPortOnly() {
        ResponseEntity<Map> health = rest.getForEntity(management("/actuator/health"), Map.class);
        assertThat(health.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(health.getBody()).containsEntry("status", "UP");

        ResponseEntity<Map> readiness = rest.getForEntity(management("/actuator/health/readiness"), Map.class);
        assertThat(readiness.getStatusCode()).isEqualTo(HttpStatus.OK);

        rest.getForEntity(api("/api/meals"), String.class); // generate an HTTP metric
        ResponseEntity<String> prom = rest.getForEntity(management("/actuator/prometheus"), String.class);
        assertThat(prom.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(prom.getBody()).contains("http_server_requests_seconds_count", "jvm_memory_used_bytes",
                "application=\"mealsync-backend\"");

        // Other actuator endpoints are not exposed.
        assertThat(rest.getForEntity(management("/actuator/env"), String.class).getStatusCode())
                .isNotEqualTo(HttpStatus.OK);
        // Actuator is not served on the public application port.
        assertThat(rest.getForEntity(api("/actuator/health"), String.class).getStatusCode())
                .isNotEqualTo(HttpStatus.OK);
        assertThat(rest.getForEntity(api("/actuator/prometheus"), String.class).getStatusCode())
                .isNotEqualTo(HttpStatus.OK);
    }
}
