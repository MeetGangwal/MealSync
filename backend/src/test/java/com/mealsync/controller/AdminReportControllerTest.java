package com.mealsync.controller;

import com.mealsync.dto.FinancialSummary;
import com.mealsync.dto.PaymentRecordResponse;
import com.mealsync.model.Order;
import com.mealsync.repository.OrderRepository;
import com.mealsync.service.ReportingService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AdminReportControllerTest {

    private AdminReportController controller;

    @BeforeEach
    void setUp() {
        Order counterOrder = new Order();
        counterOrder.setId(301L);
        counterOrder.setOrderNumber("MS-CTR-12345");
        counterOrder.setOrderSource("COUNTER");
        counterOrder.setCustomerName("Rahul Sharma");
        counterOrder.setPaymentMethod("UPI");
        counterOrder.setStatus("COMPLETED");
        counterOrder.setPaymentStatus("PAID");
        counterOrder.setTotalAmount(150.0);
        counterOrder.setOrderTime(LocalDateTime.now());

        Order portalOrder = new Order();
        portalOrder.setId(302L);
        portalOrder.setOrderNumber("MS10999");
        portalOrder.setOrderSource("PORTAL");
        portalOrder.setCustomerName("Aryan Student");
        portalOrder.setPaymentMethod("CARD");
        portalOrder.setStatus("CONFIRMED");
        portalOrder.setPaymentStatus("PENDING_CASH");
        portalOrder.setTotalAmount(200.0);
        portalOrder.setOrderTime(LocalDateTime.now());

        OrderRepository repo = mock(OrderRepository.class);
        when(repo.findAllByOrderByOrderTimeDesc()).thenReturn(List.of(counterOrder, portalOrder));
        controller = new AdminReportController(repo, new ReportingService(Clock.systemDefaultZone()), new SimpleMeterRegistry());
    }

    @SuppressWarnings("unchecked")
    private static List<PaymentRecordResponse> records(Map<String, Object> body) {
        return (List<PaymentRecordResponse>) body.get("records");
    }

    @Test
    @DisplayName("Payment records: source filter (both parameter names) and search query")
    void filters() {
        assertThat(records(controller.paymentRecords(null, "COUNTER", null, null, null, null, null)))
                .extracting(PaymentRecordResponse::orderNumber).containsExactly("MS-CTR-12345");
        assertThat(records(controller.paymentRecords(null, null, "COUNTER", null, null, null, null)))
                .extracting(PaymentRecordResponse::orderNumber).containsExactly("MS-CTR-12345");
        assertThat(records(controller.paymentRecords("aryan", null, null, null, null, null, null)))
                .extracting(PaymentRecordResponse::customerName).containsExactly("Aryan Student");
    }

    @Test
    @DisplayName("Payment records: status filter uses the shared categories and the summary matches the returned rows")
    void statusAndSummary() {
        Map<String, Object> paid = controller.paymentRecords(null, null, null, null, null, null, "PAID");
        assertThat(records(paid)).extracting(PaymentRecordResponse::orderNumber).containsExactly("MS-CTR-12345");
        assertThat(((FinancialSummary) paid.get("summary")).collectedRevenue()).isEqualTo(150.0);

        Map<String, Object> all = controller.paymentRecords(null, "ALL", null, null, null, "ALL", null);
        FinancialSummary s = (FinancialSummary) all.get("summary");
        assertThat(s.transactionCount()).isEqualTo(2);
        assertThat(s.collectedRevenue()).isEqualTo(150.0);
        assertThat(s.pendingAmount()).isEqualTo(200.0);
        assertThat(s.counterCollected()).isEqualTo(150.0);
    }

    @Test
    @DisplayName("Monitoring reports only real sources and marks Kubernetes/AWS/active users as unavailable")
    @SuppressWarnings("unchecked")
    void monitoringIsHonest() {
        Map<String, Object> m = controller.monitoring();
        Map<String, Object> runtime = (Map<String, Object>) m.get("runtime");
        assertThat((String) runtime.get("aws")).startsWith("Not configured");
        assertThat((List<String>) m.get("unavailable")).anyMatch(s -> s.startsWith("Active users"));
        Map<String, Object> http = (Map<String, Object>) m.get("http");
        assertThat(http.get("requestsSinceStart")).isEqualTo(0L);
        assertThat(http.get("averageLatencyMs")).isNull(); // no requests yet → no invented latency
    }
}
