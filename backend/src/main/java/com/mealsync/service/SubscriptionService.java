package com.mealsync.service;

import com.mealsync.dto.SubscriptionResponse;
import com.mealsync.model.MealSubscription;
import com.mealsync.model.SubscriptionPlan;
import com.mealsync.model.User;
import com.mealsync.repository.MealSubscriptionRepository;
import com.mealsync.repository.SubscriptionPlanRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Meal subscription rules (single place for all state transitions).
 *
 * Product rules implemented (derived from the existing subscription UI; see docs):
 *  - Subscribing creates an ACTIVE subscription for one month starting today, charged at the
 *    server-side plan price through the payment SIMULATOR (no real gateway).
 *  - At most one ACTIVE/PAUSED subscription per user and plan (DB-enforced via activeKey).
 *  - Pause: ACTIVE → PAUSED. Resume: PAUSED → ACTIVE. Pausing does not extend the end date.
 *  - Skip today: ACTIVE only, on a serving day within the period, at most once per day,
 *    while meals remain.
 *  - After the end date a subscription becomes EXPIRED; subscribing again starts a new period.
 *
 * Not implemented (no business rule exists): marking meals as used when a subscriber collects
 * food — there is no redemption flow linking subscriptions to counter pickup, so mealsUsed is
 * never incremented.
 */
@Service
public class SubscriptionService {

    /** Thrown for invalid state transitions or duplicate subscriptions (HTTP 409). */
    public static class SubscriptionConflictException extends RuntimeException {
        public SubscriptionConflictException(String message) { super(message); }
    }

    /** Thrown when the simulated payment is declined (HTTP 402). */
    public static class PaymentDeclinedException extends RuntimeException {
        public PaymentDeclinedException(String message) { super(message); }
    }

    private final SubscriptionPlanRepository planRepository;
    private final MealSubscriptionRepository subscriptionRepository;
    private final PaymentService paymentService;
    private final Clock clock;

    public SubscriptionService(SubscriptionPlanRepository planRepository,
                               MealSubscriptionRepository subscriptionRepository,
                               PaymentService paymentService,
                               Clock clock) {
        this.planRepository = planRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.paymentService = paymentService;
        this.clock = clock;
    }

    public List<SubscriptionPlan> listPlans() {
        return planRepository.findByActiveTrueOrderByMonthlyPriceAsc();
    }

    @Transactional
    public List<SubscriptionResponse> listForUser(User user) {
        LocalDate today = today();
        return subscriptionRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(s -> SubscriptionResponse.of(expireIfDue(s, today), today))
                .toList();
    }

    @Transactional
    public SubscriptionResponse subscribe(User user, String planCode, String paymentMethod) {
        if (planCode == null || planCode.isBlank()) {
            throw new IllegalArgumentException("planCode is required");
        }
        SubscriptionPlan plan = planRepository.findByCode(planCode.trim())
                .filter(p -> Boolean.TRUE.equals(p.getActive()))
                .orElseThrow(() -> new NoSuchElementException("Plan not found"));

        LocalDate today = today();
        String key = activeKey(user, plan);
        subscriptionRepository.findByActiveKey(key).ifPresent(existing -> {
            if (!MealSubscription.EXPIRED.equals(expireIfDue(existing, today).getStatus())) {
                throw new SubscriptionConflictException("You already have a subscription to this plan");
            }
        });

        PaymentService.PaymentResult payment = paymentService.processPayment(paymentMethod, plan.getMonthlyPrice(), false);
        if (!payment.success()) {
            throw new PaymentDeclinedException(payment.message());
        }

        MealSubscription s = new MealSubscription();
        s.setUser(user);
        s.setPlan(plan);
        s.setStatus(MealSubscription.ACTIVE);
        s.setActiveKey(key);
        s.setStartDate(today);
        s.setEndDate(today.plusMonths(1).minusDays(1));
        s.setAmountCharged(plan.getMonthlyPrice());
        s.setPaymentMethod(payment.paymentMethod());
        s.setPaymentStatus(payment.paymentStatus());
        s.setTransactionId(payment.transactionId());
        try {
            return SubscriptionResponse.of(subscriptionRepository.saveAndFlush(s), today);
        } catch (DataIntegrityViolationException e) {
            // Concurrent duplicate request lost the race on the unique activeKey
            throw new SubscriptionConflictException("You already have a subscription to this plan");
        }
    }

    @Transactional
    public SubscriptionResponse pause(User user, Long subscriptionId) {
        LocalDate today = today();
        MealSubscription s = expireIfDue(owned(user, subscriptionId), today);
        if (!MealSubscription.ACTIVE.equals(s.getStatus())) {
            throw new SubscriptionConflictException("Only an active subscription can be paused (current: " + s.getStatus() + ")");
        }
        s.setStatus(MealSubscription.PAUSED);
        return SubscriptionResponse.of(subscriptionRepository.saveAndFlush(s), today);
    }

    @Transactional
    public SubscriptionResponse resume(User user, Long subscriptionId) {
        LocalDate today = today();
        MealSubscription s = expireIfDue(owned(user, subscriptionId), today);
        if (!MealSubscription.PAUSED.equals(s.getStatus())) {
            throw new SubscriptionConflictException("Only a paused subscription can be resumed (current: " + s.getStatus() + ")");
        }
        s.setStatus(MealSubscription.ACTIVE);
        return SubscriptionResponse.of(subscriptionRepository.saveAndFlush(s), today);
    }

    @Transactional
    public SubscriptionResponse skipToday(User user, Long subscriptionId) {
        LocalDate today = today();
        MealSubscription s = expireIfDue(owned(user, subscriptionId), today);
        String reason = SubscriptionResponse.skipBlockedReason(s, today);
        if (reason != null) {
            throw new SubscriptionConflictException(reason);
        }
        s.setMealsSkipped(s.getMealsSkipped() + 1);
        s.setLastSkippedDate(today);
        return SubscriptionResponse.of(subscriptionRepository.saveAndFlush(s), today);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private LocalDate today() {
        return LocalDate.now(clock);
    }

    /** Subscriptions of other users are reported as not found (no enumeration). */
    private MealSubscription owned(User user, Long subscriptionId) {
        return subscriptionRepository.findByIdAndUserId(subscriptionId, user.getId())
                .orElseThrow(() -> new NoSuchElementException("Subscription not found"));
    }

    private MealSubscription expireIfDue(MealSubscription s, LocalDate today) {
        boolean live = MealSubscription.ACTIVE.equals(s.getStatus()) || MealSubscription.PAUSED.equals(s.getStatus());
        if (live && today.isAfter(s.getEndDate())) {
            s.setStatus(MealSubscription.EXPIRED);
            s.setActiveKey(null);
            return subscriptionRepository.saveAndFlush(s);
        }
        return s;
    }

    private static String activeKey(User user, SubscriptionPlan plan) {
        return user.getId() + ":" + plan.getId();
    }
}
