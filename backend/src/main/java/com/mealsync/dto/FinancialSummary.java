package com.mealsync.dto;

/**
 * Financial totals computed by {@code ReportingService} (see its Javadoc for definitions).
 * Amounts are in Indian rupees.
 */
public record FinancialSummary(
        long transactionCount,
        double collectedRevenue,
        long collectedCount,
        double pendingAmount,
        long pendingCount,
        double refundedAmount,
        long refundedCount,
        long cancelledCount,
        long failedCount,
        double orderValue,
        double portalCollected,
        long portalCount,
        double counterCollected,
        long counterCount,
        String timeZone
) {}
