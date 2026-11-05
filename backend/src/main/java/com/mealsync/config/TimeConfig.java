package com.mealsync.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * Business-day clock. Containers run in UTC, but "today" for subscriptions (skip today,
 * subscription periods) must follow the campus time zone.
 */
@Configuration
public class TimeConfig {

    @Bean
    public Clock clock(@Value("${mealsync.time-zone:Asia/Kolkata}") String timeZone) {
        return Clock.system(ZoneId.of(timeZone));
    }
}
