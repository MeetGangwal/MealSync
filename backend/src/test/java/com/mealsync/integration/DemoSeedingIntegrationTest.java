package com.mealsync.integration;

import com.mealsync.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Demo users are created only when seeding is explicitly enabled, with environment-supplied passwords. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "management.server.port=0")
class DemoSeedingIntegrationTest {

    private static final String ADMIN_PASSWORD = "Adm-" + UUID.randomUUID();

    @DynamicPropertySource
    static void config(DynamicPropertyRegistry registry) {
        MySqlTestContainer.register(registry);
        registry.add("MEALSYNC_SEED_DEMO_USERS", () -> "true");
        registry.add("MEALSYNC_DEMO_STUDENT_PASSWORD", () -> "Stu-" + UUID.randomUUID());
        registry.add("MEALSYNC_DEMO_ADMIN_PASSWORD", () -> ADMIN_PASSWORD);
    }

    @LocalServerPort
    int port;

    @Autowired
    TestRestTemplate rest;

    @Autowired
    UserRepository userRepository;

    /** The MySQL container is shared with other test classes; remove the demo accounts afterwards. */
    @AfterEach
    void removeDemoUsers() {
        userRepository.findByEmail("aryan@spit.edu").ifPresent(userRepository::delete);
        userRepository.findByEmail("admin@spit.mess").ifPresent(userRepository::delete);
    }

    @Test
    @DisplayName("Opt-in seeding creates the demo admin with the configured password and ROLE_ADMIN access")
    void demoAdminSeededWhenEnabled() {
        ResponseEntity<Map> login = rest.postForEntity("http://localhost:" + port + "/api/auth/login",
                Map.of("email", "admin@spit.mess", "password", ADMIN_PASSWORD), Map.class);
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(login.getBody()).containsEntry("role", "ROLE_ADMIN");
    }
}
