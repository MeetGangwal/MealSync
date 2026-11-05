package com.mealsync.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class OrderTimeTest {

    @Test
    void exposesTheStoredLocalTimeAsAnAbsoluteInstant() throws Exception {
        Order order = new Order();
        LocalDateTime stored = LocalDateTime.of(2026, 10, 29, 5, 50, 16);
        order.setOrderTime(stored);

        Instant expected = stored.atZone(ZoneId.systemDefault()).toInstant();
        assertThat(order.getOrderTimeUtc()).isEqualTo(expected);

        ObjectMapper json = new ObjectMapper().registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        assertThat(json.readTree(json.writeValueAsString(order)).get("orderTimeUtc").asText())
                .isEqualTo(expected.toString());
    }

    @Test
    void isNullBeforeTheOrderIsSaved() {
        assertThat(new Order().getOrderTimeUtc()).isNull();
    }
}
