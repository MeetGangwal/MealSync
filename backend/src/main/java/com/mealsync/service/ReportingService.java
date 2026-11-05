package com.mealsync.service;

import com.mealsync.dto.FinancialSummary;
import com.mealsync.model.Order;
import com.mealsync.model.OrderItem;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

/**
 * Single source of truth for financial and reporting figures (Overview, Payment Records,
 * Analytics, Demand Forecast).
 *
 * MealSync has no separate payment table: each order carries exactly one payment state, and a
 * declined payment is rolled back (never persisted). So every order is one transaction and is
 * counted exactly once. Payment states actually written by the backend:
 *   PAID          — simulated online payment succeeded, or cash received at the counter
 *   PENDING_CASH  — cash to be paid at pickup
 *   REFUNDED      — a PAID order that was cancelled
 *   CANCELLED     — an unpaid order that was cancelled
 *
 * Definitions:
 *   collected revenue = PAID orders that are not cancelled
 *   pending           = PENDING_CASH / PENDING orders that are not cancelled
 *   refunded          = REFUNDED, or a cancelled order whose payment is still recorded as PAID
 *   order value       = total of all orders that are not cancelled (collected + pending)
 *
 * Order timestamps are stored in the server's time zone (UTC in containers); reporting days
 * use the campus business time zone from {@link Clock} (Asia/Kolkata by default).
 */
@Service
public class ReportingService {

    public enum Category { COLLECTED, PENDING, REFUNDED, CANCELLED_UNPAID, FAILED }

    private final Clock clock;
    /** Zone in which order timestamps are stored (the JVM default, UTC in containers). */
    private final ZoneId storageZone;

    @org.springframework.beans.factory.annotation.Autowired
    public ReportingService(Clock clock) {
        this(clock, ZoneId.systemDefault());
    }

    public ReportingService(Clock clock, ZoneId storageZone) {
        this.clock = clock;
        this.storageZone = storageZone;
    }

    public static boolean isCancelled(Order o) {
        return "CANCELLED".equalsIgnoreCase(o.getStatus());
    }

    public static Category categorize(Order o) {
        String pay = o.getPaymentStatus() == null ? "" : o.getPaymentStatus().trim().toUpperCase();
        if ("FAILED".equals(pay)) return Category.FAILED;
        if ("REFUNDED".equals(pay)) return Category.REFUNDED;
        if (isCancelled(o)) return "PAID".equals(pay) ? Category.REFUNDED : Category.CANCELLED_UNPAID;
        if ("PAID".equals(pay)) return Category.COLLECTED;
        if ("PENDING_CASH".equals(pay) || "PENDING".equals(pay)) return Category.PENDING;
        return "CANCELLED".equals(pay) ? Category.CANCELLED_UNPAID : Category.PENDING;
    }

    /** Business date of an order in the campus time zone. */
    public LocalDate businessDate(Order o) {
        LocalDateTime t = o.getOrderTime();
        if (t == null) return null;
        return t.atZone(storageZone).withZoneSameInstant(clock.getZone()).toLocalDate();
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    public ZoneId zone() {
        return clock.getZone();
    }

    public FinancialSummary summarize(Collection<Order> orders) {
        double collected = 0, pending = 0, refunded = 0, portal = 0, counter = 0, orderValue = 0;
        long collectedCount = 0, pendingCount = 0, refundedCount = 0, cancelledCount = 0, failedCount = 0;
        long portalCount = 0, counterCount = 0;
        for (Order o : orders) {
            double amount = o.getTotalAmount() == null ? 0 : o.getTotalAmount();
            boolean isCounter = "COUNTER".equalsIgnoreCase(o.getOrderSource());
            if (isCounter) counterCount++; else portalCount++;
            if (isCancelled(o)) cancelledCount++;
            switch (categorize(o)) {
                case COLLECTED -> {
                    collected += amount; collectedCount++; orderValue += amount;
                    if (isCounter) counter += amount; else portal += amount;
                }
                case PENDING -> { pending += amount; pendingCount++; orderValue += amount; }
                case REFUNDED -> { refunded += amount; refundedCount++; }
                case FAILED -> failedCount++;
                case CANCELLED_UNPAID -> { /* no money involved */ }
            }
        }
        return new FinancialSummary(orders.size(), round(collected), collectedCount, round(pending), pendingCount,
                round(refunded), refundedCount, cancelledCount, failedCount, round(orderValue),
                round(portal), portalCount, round(counter), counterCount, zone().getId());
    }

    public List<Order> onDay(Collection<Order> orders, LocalDate day) {
        return orders.stream().filter(o -> day.equals(businessDate(o))).toList();
    }

    /** One entry per day for the last {@code days} business days (oldest first). */
    public List<Map<String, Object>> daily(Collection<Order> orders, int days) {
        LocalDate today = today();
        Map<LocalDate, List<Order>> byDay = new HashMap<>();
        for (Order o : orders) {
            LocalDate d = businessDate(o);
            if (d != null) byDay.computeIfAbsent(d, k -> new ArrayList<>()).add(o);
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            List<Order> list = byDay.getOrDefault(d, List.of());
            FinancialSummary s = summarize(list);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date", d.toString());
            row.put("orders", list.stream().filter(o -> !isCancelled(o)).count());
            row.put("collectedRevenue", s.collectedRevenue());
            row.put("pendingAmount", s.pendingAmount());
            row.put("cancelled", s.cancelledCount());
            out.add(row);
        }
        return out;
    }

    /** Item popularity over non-cancelled orders: quantity and value at the price charged. */
    public List<Map<String, Object>> topItems(Collection<Order> orders, int limit) {
        Map<String, double[]> agg = new HashMap<>(); // name -> [qty, value, orders]
        for (Order o : orders) {
            if (isCancelled(o) || o.getItems() == null) continue;
            for (OrderItem it : o.getItems()) {
                String name = itemName(it);
                int qty = it.getQuantity() == null ? 0 : it.getQuantity();
                double price = it.getPriceAtTimeOfOrder() == null ? 0 : it.getPriceAtTimeOfOrder();
                double[] a = agg.computeIfAbsent(name, k -> new double[3]);
                a[0] += qty; a[1] += qty * price; a[2] += 1;
            }
        }
        return agg.entrySet().stream()
                .sorted((x, y) -> Double.compare(y.getValue()[0], x.getValue()[0]))
                .limit(limit)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name", e.getKey());
                    m.put("quantity", (long) e.getValue()[0]);
                    m.put("value", round(e.getValue()[1]));
                    m.put("orders", (long) e.getValue()[2]);
                    return m;
                }).toList();
    }

    /**
     * Demand estimate per item: average daily quantity over the last {@code days} business days
     * (simple moving average of non-cancelled orders, days without orders count as zero).
     * This is an estimate, not a trained model.
     */
    public List<Map<String, Object>> forecast(Collection<Order> orders, int days, int limit) {
        LocalDate today = today();
        LocalDate from = today.minusDays(days);
        Map<String, Long> qty = new HashMap<>();
        Set<LocalDate> activeDays = new HashSet<>();
        for (Order o : orders) {
            LocalDate d = businessDate(o);
            if (d == null || isCancelled(o) || !d.isAfter(from) || d.isAfter(today) || o.getItems() == null) continue;
            activeDays.add(d);
            for (OrderItem it : o.getItems()) {
                qty.merge(itemName(it), (long) (it.getQuantity() == null ? 0 : it.getQuantity()), Long::sum);
            }
        }
        return qty.entrySet().stream()
                .sorted((x, y) -> Long.compare(y.getValue(), x.getValue()))
                .limit(limit)
                .map(e -> {
                    double avg = (double) e.getValue() / days;
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name", e.getKey());
                    m.put("totalQuantity", e.getValue());
                    m.put("averagePerDay", Math.round(avg * 10) / 10.0);
                    m.put("suggestedPrep", (long) Math.ceil(avg));
                    m.put("daysWithOrders", activeDays.size());
                    return m;
                }).toList();
    }

    /** Historical item name: the snapshot taken at order time, else the current product name. */
    public static String itemName(OrderItem it) {
        if (it.getItemName() != null && !it.getItemName().isBlank()) return it.getItemName();
        if (it.getMeal() != null && it.getMeal().getName() != null) return it.getMeal().getName();
        return "Item unavailable";
    }

    private static double round(double v) {
        return Math.round(v * 100) / 100.0;
    }
}
