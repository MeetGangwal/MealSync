package com.mealsync.service;

import com.mealsync.dto.FinancialSummary;
import com.mealsync.dto.PaymentRecordResponse;
import com.mealsync.model.Meal;
import com.mealsync.model.Order;
import com.mealsync.model.OrderItem;
import com.mealsync.model.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Financial definitions, IST business days and order-item mapping with fixed clocks and fixtures. */
class ReportingServiceTest {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    // "Now" = 29 Oct 2026, 11:30 IST (06:00 UTC); timestamps are stored in UTC like in the containers
    private final ReportingService reporting = new ReportingService(
            Clock.fixed(Instant.parse("2026-10-29T06:00:00Z"), IST), ZoneOffset.UTC);

    private static Order order(String source, String status, String payment, double total, String utcTime) {
        Order o = new Order();
        o.setOrderSource(source);
        o.setStatus(status);
        o.setPaymentStatus(payment);
        o.setTotalAmount(total);
        o.setOrderTime(LocalDateTime.parse(utcTime));
        o.setItems(new ArrayList<>());
        return o;
    }

    private static OrderItem item(Order o, String snapshot, String mealName, int qty, double price) {
        OrderItem it = new OrderItem();
        it.setOrder(o);
        if (mealName != null) {
            Meal m = new Meal();
            m.setName(mealName);
            it.setMeal(m);
        }
        it.setItemName(snapshot);
        it.setQuantity(qty);
        it.setPriceAtTimeOfOrder(price);
        o.getItems().add(it);
        return it;
    }

    @Test
    @DisplayName("Mixed payment states: only PAID and not-cancelled money is collected; each order counted once")
    void mixedStates() {
        List<Order> orders = List.of(
                order("PORTAL", "CONFIRMED", "PAID", 120, "2026-10-29T05:00:00"),          // collected (portal)
                order("COUNTER", "COMPLETED", "PAID", 60, "2026-10-29T05:10:00"),          // collected (counter)
                order("PORTAL", "CONFIRMED", "PENDING_CASH", 80, "2026-10-29T05:20:00"),   // pending
                order("PORTAL", "CANCELLED", "REFUNDED", 200, "2026-10-29T05:30:00"),      // refunded
                order("PORTAL", "CANCELLED", "PAID", 40, "2026-10-29T05:35:00"),           // legacy: cancelled but still PAID → refund
                order("PORTAL", "CANCELLED", "CANCELLED", 30, "2026-10-29T05:40:00"),      // cancelled, unpaid
                order("COUNTER", "CONFIRMED", "FAILED", 70, "2026-10-29T05:50:00"));       // failed

        FinancialSummary s = reporting.summarize(orders);

        assertThat(s.transactionCount()).isEqualTo(7);
        assertThat(s.collectedRevenue()).isEqualTo(180.0);
        assertThat(s.collectedCount()).isEqualTo(2);
        assertThat(s.portalCollected()).isEqualTo(120.0);
        assertThat(s.counterCollected()).isEqualTo(60.0);
        assertThat(s.pendingAmount()).isEqualTo(80.0);
        assertThat(s.refundedAmount()).isEqualTo(240.0);
        assertThat(s.refundedCount()).isEqualTo(2);
        assertThat(s.cancelledCount()).isEqualTo(3);
        assertThat(s.failedCount()).isEqualTo(1);
        assertThat(s.orderValue()).isEqualTo(260.0); // collected + pending
        assertThat(s.portalCount()).isEqualTo(5);
        assertThat(s.counterCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("Business day uses the campus time zone, not the server's UTC date")
    void istDateBoundaries() {
        Order lateUtcPreviousDay = order("PORTAL", "CONFIRMED", "PAID", 100, "2026-10-28T19:00:00"); // 00:30 IST on 29 Oct
        Order beforeIstMidnight = order("PORTAL", "CONFIRMED", "PAID", 50, "2026-10-28T18:20:00");   // 23:50 IST on 28 Oct

        assertThat(reporting.businessDate(lateUtcPreviousDay)).isEqualTo(LocalDate.of(2026, 10, 29));
        assertThat(reporting.businessDate(beforeIstMidnight)).isEqualTo(LocalDate.of(2026, 10, 28));
        assertThat(reporting.today()).isEqualTo(LocalDate.of(2026, 10, 29));

        List<Order> today = reporting.onDay(List.of(lateUtcPreviousDay, beforeIstMidnight), reporting.today());
        assertThat(today).containsExactly(lateUtcPreviousDay);
        assertThat(reporting.summarize(today).collectedRevenue()).isEqualTo(100.0);
    }

    @Test
    @DisplayName("Daily series covers every day in the period, including days without orders")
    void dailySeries() {
        List<Order> orders = List.of(
                order("PORTAL", "CONFIRMED", "PAID", 100, "2026-10-29T04:00:00"),
                order("PORTAL", "CANCELLED", "REFUNDED", 70, "2026-10-29T04:30:00"),
                order("COUNTER", "COMPLETED", "PAID", 40, "2026-10-27T04:00:00"));
        List<Map<String, Object>> daily = reporting.daily(orders, 3);

        assertThat(daily).extracting(d -> d.get("date")).containsExactly("2026-10-27", "2026-10-28", "2026-10-29");
        assertThat(daily).extracting(d -> d.get("collectedRevenue")).containsExactly(40.0, 0.0, 100.0);
        assertThat(daily).extracting(d -> d.get("orders")).containsExactly(1L, 0L, 1L);
    }

    @Test
    @DisplayName("Top items and forecast exclude cancelled orders and use historical names and prices")
    void itemsAndForecast() {
        Order a = order("PORTAL", "CONFIRMED", "PAID", 0, "2026-10-29T04:00:00");
        item(a, "Vada Pav", "Vada Pav (renamed)", 3, 20);
        item(a, null, "Masala Chai", 2, 15);
        Order cancelled = order("PORTAL", "CANCELLED", "REFUNDED", 0, "2026-10-29T04:10:00");
        item(cancelled, "Vada Pav", null, 50, 20);

        List<Map<String, Object>> top = reporting.topItems(List.of(a, cancelled), 5);
        assertThat(top.get(0)).containsEntry("name", "Vada Pav").containsEntry("quantity", 3L).containsEntry("value", 60.0);
        assertThat(top.get(1)).containsEntry("name", "Masala Chai").containsEntry("quantity", 2L);

        List<Map<String, Object>> fc = reporting.forecast(List.of(a, cancelled), 7, 5);
        assertThat(fc.get(0)).containsEntry("name", "Vada Pav").containsEntry("totalQuantity", 3L)
                .containsEntry("averagePerDay", 0.4).containsEntry("suggestedPrep", 1L);
    }

    @Test
    @DisplayName("Payment record DTO: item names/quantities/prices for multi-item orders; registered vs walk-in customers")
    void paymentRecordMapping() {
        Order portal = order("PORTAL", "CONFIRMED", "PAID", 85, "2026-10-29T05:00:00");
        User u = new User();
        u.setId(7L);
        u.setName("Asha Rao");
        u.setEmail("asha@example.com");
        portal.setUser(u);
        portal.setCustomerName(null);
        item(portal, "Vada Pav", "Vada Pav", 2, 20);
        item(portal, null, "Masala Dosa", 1, 45);   // older row without a snapshot → current product name
        item(portal, null, null, 1, 0);              // product missing entirely → explicit fallback

        PaymentRecordResponse r = PaymentRecordResponse.of(portal, reporting);
        assertThat(r.customerName()).isEqualTo("Asha Rao");
        assertThat(r.customerEmail()).isEqualTo("asha@example.com");
        assertThat(r.registeredCustomer()).isTrue();
        assertThat(r.paymentCategory()).isEqualTo("COLLECTED");
        assertThat(r.businessDate()).isEqualTo("2026-10-29");
        assertThat(r.items()).extracting(PaymentRecordResponse.Item::name).containsExactly("Vada Pav", "Masala Dosa", "Item unavailable");
        assertThat(r.items()).extracting(PaymentRecordResponse.Item::quantity).containsExactly(2, 1, 1);
        assertThat(r.items()).extracting(PaymentRecordResponse.Item::subtotal).containsExactly(40.0, 45.0, 0.0);

        Order walkIn = order("COUNTER", "CONFIRMED", "PENDING_CASH", 30, "2026-10-29T05:00:00");
        walkIn.setCustomerName("Guest");
        PaymentRecordResponse w = PaymentRecordResponse.of(walkIn, reporting);
        assertThat(w.customerName()).isEqualTo("Guest");
        assertThat(w.customerEmail()).isNull();
        assertThat(w.registeredCustomer()).isFalse();
        assertThat(w.paymentCategory()).isEqualTo("PENDING");
        assertThat(w.items()).isEmpty();
    }
}
