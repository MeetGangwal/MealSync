package com.mealsync.dto;

import com.mealsync.model.MealSubscription;
import com.mealsync.model.SubscriptionPlan;
import com.mealsync.security.Roles;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** Date- and role-dependent rules with fixed dates (independent of the day the build runs). */
class SubscriptionRulesTest {

    private static MealSubscription sub(String servingDays, String status, LocalDate start) {
        SubscriptionPlan p = new SubscriptionPlan();
        p.setCode("P"); p.setName("Plan"); p.setServingDays(servingDays); p.setMealsPerPeriod(22); p.setMonthlyPrice(1.0);
        MealSubscription s = new MealSubscription();
        s.setPlan(p); s.setStatus(status); s.setStartDate(start); s.setEndDate(start.plusMonths(1).minusDays(1));
        return s;
    }

    private static final LocalDate MONDAY = LocalDate.of(2026, 11, 2);
    private static final LocalDate SUNDAY = LocalDate.of(2026, 11, 8);

    @Test
    @DisplayName("Skip today is only allowed on serving days of an active subscription, once per day")
    void skipRules() {
        MealSubscription weekday = sub("1-5", MealSubscription.ACTIVE, MONDAY);
        assertThat(SubscriptionResponse.skipBlockedReason(weekday, MONDAY)).isNull();
        assertThat(SubscriptionResponse.skipBlockedReason(weekday, SUNDAY)).contains("does not serve");

        weekday.setLastSkippedDate(MONDAY);
        assertThat(SubscriptionResponse.skipBlockedReason(weekday, MONDAY)).contains("already skipped");

        MealSubscription paused = sub("1-7", MealSubscription.PAUSED, MONDAY);
        assertThat(SubscriptionResponse.skipBlockedReason(paused, MONDAY)).contains("active");

        MealSubscription used = sub("1-7", MealSubscription.ACTIVE, MONDAY);
        used.setMealsSkipped(22);
        assertThat(SubscriptionResponse.skipBlockedReason(used, MONDAY)).contains("No meals remaining");
        assertThat(SubscriptionResponse.skipBlockedReason(sub("1-7", MealSubscription.ACTIVE, MONDAY), MONDAY.plusMonths(2)))
                .contains("outside");
    }

    @Test
    @DisplayName("Serving-day ranges and labels")
    void servingDays() {
        assertThat(SubscriptionResponse.servesOn("1-6", DayOfWeek.SATURDAY)).isTrue();
        assertThat(SubscriptionResponse.servesOn("1-6", DayOfWeek.SUNDAY)).isFalse();
        assertThat(SubscriptionResponse.describeDays("1-5")).isEqualTo("Mon–Fri");
        assertThat(SubscriptionResponse.describeDays("1-7")).isEqualTo("Mon–Sun");
    }

    @Test
    @DisplayName("Role normalization: legacy spellings map to ROLE_*; admins also hold ROLE_USER")
    void roles() {
        assertThat(Roles.normalize("admin")).isEqualTo(Roles.ADMIN);
        assertThat(Roles.normalize(" role_user ")).isEqualTo(Roles.USER);
        assertThat(Roles.normalize(null)).isEqualTo(Roles.USER);
        assertThat(Roles.isAdmin("ROLE_ADMIN")).isTrue();
        assertThat(Roles.isAdmin("ROLE_USER")).isFalse();
        assertThat(Roles.authorities("ROLE_ADMIN")).containsExactly(Roles.ADMIN, Roles.USER);
        assertThat(Roles.authorities("student")).containsExactly("ROLE_STUDENT");
    }
}
