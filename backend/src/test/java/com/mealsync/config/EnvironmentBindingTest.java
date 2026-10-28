package com.mealsync.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves how operating-system environment variables reach the Spring properties defined in
 * application.yml, using the same property-source types Spring Boot uses at runtime.
 */
class EnvironmentBindingTest {

    private static StandardEnvironment environmentWith(Map<String, Object> osEnv) throws IOException {
        StandardEnvironment env = new StandardEnvironment();
        MutablePropertySources sources = env.getPropertySources();
        sources.replace(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                new SystemEnvironmentPropertySource(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME, osEnv));
        new YamlPropertySourceLoader().load("application.yml", new ClassPathResource("application.yml"))
                .forEach(sources::addLast);
        return env;
    }

    @Test
    @DisplayName("Demo seeding is disabled when MEALSYNC_SEED_DEMO_USERS is not set")
    void seedingDisabledByDefault() throws IOException {
        StandardEnvironment env = environmentWith(Map.of());
        assertThat(env.getProperty("mealsync.seed.demo-users", Boolean.class)).isFalse();
    }

    @Test
    @DisplayName("MEALSYNC_SEED_DEMO_USERS=true enables mealsync.seed.demo-users")
    void seedingEnabledByEnvironmentVariable() throws IOException {
        StandardEnvironment env = environmentWith(Map.of("MEALSYNC_SEED_DEMO_USERS", "true"));
        assertThat(env.getProperty("mealsync.seed.demo-users", Boolean.class)).isTrue();
    }

    @Test
    @DisplayName("Datasource URL defaults to localhost and uses DB_HOST/DB_PORT/DB_NAME when set")
    void datasourceUrlFromDbVariables() throws IOException {
        assertThat(environmentWith(Map.of()).getProperty("spring.datasource.url"))
                .startsWith("jdbc:mysql://localhost:3306/mealsync?");
        assertThat(environmentWith(Map.of("DB_HOST", "db", "DB_PORT", "3307", "DB_NAME", "ms")).getProperty("spring.datasource.url"))
                .startsWith("jdbc:mysql://db:3307/ms?");
    }

    @Test
    @DisplayName("JWT expiry and credentials come from JWT_EXPIRATION_MS / DB_USERNAME")
    void otherVariables() throws IOException {
        StandardEnvironment env = environmentWith(Map.of("JWT_EXPIRATION_MS", "1000", "DB_USERNAME", "mealsync_user"));
        assertThat(env.getProperty("jwt.expirationMs", Long.class)).isEqualTo(1000L);
        assertThat(env.getProperty("spring.datasource.username")).isEqualTo("mealsync_user");
    }
}
