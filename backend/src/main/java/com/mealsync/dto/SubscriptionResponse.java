package com.mealsync.dto;

import com.mealsync.model.MealSubscription;
import com.mealsync.model.SubscriptionPlan;

import java.time.DayOfWeek;
import java.time.LocalDate;

/** A subscription as returned to its owner, including what actions are currently allowed. */
public record SubscriptionResponse(
        Long id,
        String planCode,
        String planName,
        String meals,
        String servingDays,
        String status,
        LocalDate startDate,
        LocalDate endDate,
        int mealsPerPeriod,
        int mealsUsed,
        int mealsSkipped,
        int mealsRemaining,
        Double amountCharged,
        String paymentMethod,
        String paymentStatus,
        String transactionId,
        boolean paymentSimulated,
        boolean canPause,
        boolean canResume,
        boolean canSkipToday,
        String skipBlockedReason
) {

    public static SubscriptionResponse of(MealSubscription s, LocalDate today) {
        SubscriptionPlan p = s.getPlan();
        String skipReason = skipBlockedReason(s, today);
        return new SubscriptionResponse(
                s.getId(), p.getCode(), p.getName(), p.getMeals(), describeDays(p.getServingDays()),
                s.getStatus(), s.getStartDate(), s.getEndDate(),
                p.getMealsPerPeriod(), s.getMealsUsed(), s.getMealsSkipped(), remaining(s),
                s.getAmountCharged(), s.getPaymentMethod(), s.getPaymentStatus(), s.getTransactionId(),
                true,
                MealSubscription.ACTIVE.equals(s.getStatus()),
                MealSubscription.PAUSED.equals(s.getStatus()),
                skipReason == null,
                skipReason);
    }

    /** Why "skip today" is not allowed right now, or null if it is. */
    public static String skipBlockedReason(MealSubscription s, LocalDate today) {
        if (!MealSubscription.ACTIVE.equals(s.getStatus())) return "Only an active subscription can skip a meal";
        if (today.isBefore(s.getStartDate()) || today.isAfter(s.getEndDate())) return "Today is outside the subscription period";
        if (!servesOn(s.getPlan().getServingDays(), today.getDayOfWeek())) return "This plan does not serve meals today";
        if (today.equals(s.getLastSkippedDate())) return "Today's meal is already skipped";
        if (remaining(s) <= 0) return "No meals remaining in this period";
        return null;
    }

    public static int remaining(MealSubscription s) {
        return Math.max(0, s.getPlan().getMealsPerPeriod() - s.getMealsUsed() - s.getMealsSkipped());
    }

    /** servingDays is "from-to" in ISO day numbers (1 = Monday … 7 = Sunday). */
    public static boolean servesOn(String servingDays, DayOfWeek day) {
        String[] range = servingDays.split("-");
        int from = Integer.parseInt(range[0].trim());
        int to = Integer.parseInt(range[range.length - 1].trim());
        int d = day.getValue();
        return d >= from && d <= to;
    }

    public static String describeDays(String servingDays) {
        String[] range = servingDays.split("-");
        DayOfWeek from = DayOfWeek.of(Integer.parseInt(range[0].trim()));
        DayOfWeek to = DayOfWeek.of(Integer.parseInt(range[range.length - 1].trim()));
        return from == to ? shortName(from) : shortName(from) + "–" + shortName(to);
    }

    private static String shortName(DayOfWeek d) {
        String n = d.name();
        return n.charAt(0) + n.substring(1, 3).toLowerCase();
    }
}
