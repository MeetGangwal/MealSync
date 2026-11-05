package com.mealsync.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * A user's subscription to a {@link SubscriptionPlan} for one monthly period.
 *
 * Status transitions: ACTIVE ⇄ PAUSED; ACTIVE/PAUSED → EXPIRED after {@code endDate}.
 * {@code activeKey} is set to "userId:planId" while the subscription is ACTIVE or PAUSED and
 * cleared otherwise; its unique constraint guarantees at most one live subscription per
 * user and plan, even under concurrent requests.
 */
@Data
@Entity
@Table(name = "meal_subscriptions")
public class MealSubscription {

    public static final String ACTIVE = "ACTIVE";
    public static final String PAUSED = "PAUSED";
    public static final String EXPIRED = "EXPIRED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private SubscriptionPlan plan;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(unique = true, length = 64)
    private String activeKey;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(nullable = false)
    private Integer mealsUsed = 0;

    @Column(nullable = false)
    private Integer mealsSkipped = 0;

    private LocalDate lastSkippedDate;

    /** Amount charged at subscription time (server-side plan price). */
    private Double amountCharged;

    private String paymentMethod;
    /** Payment simulator result, e.g. "PAID" — no real payment gateway is integrated. */
    private String paymentStatus;
    private String transactionId;

    /** Optimistic locking for concurrent pause/resume/skip requests. */
    @Version
    private Long version;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
