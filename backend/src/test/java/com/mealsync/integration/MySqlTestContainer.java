package com.mealsync.integration;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.testcontainers.containers.MySQLContainer;

/**
 * One MySQL 8.4 container shared by all integration tests (started once per JVM).
 * Connection details are passed through the same DB_* variables that Docker Compose and
 * Kubernetes use, so the tests exercise the real datasource configuration in application.yml.
 */
final class MySqlTestContainer {

    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("mealsync")
            .withCommand("--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci");

    static {
        MYSQL.start();
    }

    private MySqlTestContainer() {
    }

    static void register(DynamicPropertyRegistry registry) {
        registry.add("DB_HOST", MYSQL::getHost);
        registry.add("DB_PORT", () -> MYSQL.getMappedPort(MySQLContainer.MYSQL_PORT));
        registry.add("DB_NAME", MYSQL::getDatabaseName);
        registry.add("DB_USERNAME", MYSQL::getUsername);
        registry.add("DB_PASSWORD", MYSQL::getPassword);
        // Test-only signing key generated per run; never a real secret.
        registry.add("JWT_SECRET", () -> "it-" + java.util.UUID.randomUUID() + java.util.UUID.randomUUID());
    }
}
