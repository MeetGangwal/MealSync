package com.mealsync.model;

import jakarta.persistence.*;
import lombok.Data;

/**
 * A monthly meal plan offered by the mess (catalogue, seeded server-side).
 * Prices are always taken from this table, never from the client.
 */
@Data
@Entity
@Table(name = "subscription_plans")
public class SubscriptionPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Stable identifier used by the API, e.g. "MONTHLY_LUNCH". */
    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false)
    private String name;

    private String description;

    /** Meals covered, e.g. "Lunch", "Lunch + Dinner". */
    private String meals;

    /** Serving days as a range of ISO day numbers, e.g. "1-5" = Mon–Fri, "1-7" = every day. */
    @Column(nullable = false, length = 10)
    private String servingDays;

    /** Meals included in one monthly period. */
    @Column(nullable = false)
    private Integer mealsPerPeriod;

    @Column(nullable = false)
    private Double monthlyPrice;

    @Column(nullable = false)
    private Boolean active = true;
}
