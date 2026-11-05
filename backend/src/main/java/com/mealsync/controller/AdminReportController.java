package com.mealsync.controller;

import com.mealsync.dto.PaymentRecordResponse;
import com.mealsync.model.Order;
import com.mealsync.repository.OrderRepository;
import com.mealsync.service.ReportingService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * Administrator reporting (all under /api/admin/**, so ROLE_ADMIN is required by SecurityConfig).
 * Every figure is computed here from the database or from this backend's own metrics —
 * the frontend only displays it.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminReportController {

    private final OrderRepository orderRepository;
    private final ReportingService reporting;
    private final MeterRegistry meterRegistry;

    public AdminReportController(OrderRepository orderRepository, ReportingService reporting, MeterRegistry meterRegistry) {
        this.orderRepository = orderRepository;
        this.reporting = reporting;
        this.meterRegistry = meterRegistry;
    }

    /**
     * Payment records with a server-side summary of exactly the records returned.
     * Filter parameters accept both the short and the long names used by older clients.
     * status: ALL | PAID (collected) | PENDING | REFUNDED (refunded/cancelled) | FAILED
     */
    @GetMapping("/payment-records")
    public Map<String, Object> paymentRecords(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String orderSource,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String paymentStatus) {
        String src = first(source, orderSource);
        String mth = first(method, paymentMethod);
        String st = first(status, paymentStatus);
        String q = search == null ? "" : search.trim().toLowerCase();

        List<Order> filtered = orderRepository.findAllByOrderByOrderTimeDesc().stream()
                .filter(o -> src == null || src.equalsIgnoreCase(o.getOrderSource() == null ? "PORTAL" : o.getOrderSource()))
                .filter(o -> mth == null || (o.getPaymentMethod() != null && o.getPaymentMethod().toUpperCase().contains(mth.toUpperCase())))
                .filter(o -> st == null || matchesStatus(o, st))
                .filter(o -> q.isEmpty() || matchesSearch(o, q))
                .toList();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("records", filtered.stream().map(o -> PaymentRecordResponse.of(o, reporting)).toList());
        body.put("summary", reporting.summarize(filtered));
        return body;
    }

    /** Historical reporting for the last {@code days} business days (default 7, max 90). */
    @GetMapping("/analytics")
    public Map<String, Object> analytics(@RequestParam(defaultValue = "7") int days) {
        int d = Math.max(1, Math.min(days, 90));
        List<Order> orders = orderRepository.findAllByOrderByOrderTimeDesc();
        LocalDate start = reporting.today().minusDays(d - 1L);
        List<Order> inPeriod = orders.stream().filter(o -> {
            LocalDate bd = reporting.businessDate(o);
            return bd != null && !bd.isBefore(start);
        }).toList();
        LocalDate prevStart = start.minusDays(d);
        List<Order> previous = orders.stream().filter(o -> {
            LocalDate bd = reporting.businessDate(o);
            return bd != null && !bd.isBefore(prevStart) && bd.isBefore(start);
        }).toList();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("days", d);
        body.put("from", start.toString());
        body.put("to", reporting.today().toString());
        body.put("timeZone", reporting.zone().getId());
        body.put("summary", reporting.summarize(inPeriod));
        body.put("previousSummary", reporting.summarize(previous));
        body.put("daily", reporting.daily(orders, d));
        body.put("topItems", reporting.topItems(inPeriod, 10));
        return body;
    }

    /** Simple moving-average demand estimate per item (not a trained model). */
    @GetMapping("/forecast")
    public Map<String, Object> forecast(@RequestParam(defaultValue = "7") int days) {
        int d = Math.max(1, Math.min(days, 60));
        List<Order> orders = orderRepository.findAllByOrderByOrderTimeDesc();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("method", "Simple moving average: total quantity per item over the last " + d
                + " days divided by " + d + " (days without orders count as zero). Cancelled orders are excluded.");
        body.put("basedOnDays", d);
        body.put("timeZone", reporting.zone().getId());
        body.put("items", reporting.forecast(orders, d, 15));
        return body;
    }

    /**
     * Live metrics of THIS backend instance from its Micrometer registry, plus what is and is not
     * connected. Kubernetes and AWS figures are never invented: they are reported as unavailable
     * unless a real source exists.
     */
    @GetMapping("/monitoring")
    public Map<String, Object> monitoring() {
        Map<String, Object> app = new LinkedHashMap<>();
        app.put("processCpuUsage", gauge("process.cpu.usage"));
        app.put("systemCpuUsage", gauge("system.cpu.usage"));
        app.put("availableProcessors", Runtime.getRuntime().availableProcessors());
        app.put("heapUsedBytes", sumGauge("jvm.memory.used", "area", "heap"));
        app.put("heapMaxBytes", Runtime.getRuntime().maxMemory());
        app.put("uptimeSeconds", gauge("process.uptime"));
        app.put("dbConnectionsActive", gauge("hikaricp.connections.active"));
        app.put("dbConnectionsIdle", gauge("hikaricp.connections.idle"));

        long requests = 0, serverErrors = 0;
        double totalMs = 0, maxMs = 0;
        for (Timer t : meterRegistry.find("http.server.requests").timers()) {
            String uri = t.getId().getTag("uri");
            if (uri != null && uri.startsWith("/actuator")) continue;
            long c = t.count();
            requests += c;
            totalMs += t.totalTime(TimeUnit.MILLISECONDS);
            maxMs = Math.max(maxMs, t.max(TimeUnit.MILLISECONDS));
            String status = t.getId().getTag("status");
            if (status != null && status.startsWith("5")) serverErrors += c;
        }
        Map<String, Object> http = new LinkedHashMap<>();
        http.put("requestsSinceStart", requests);
        http.put("averageLatencyMs", requests == 0 ? null : Math.round(totalMs / requests * 10) / 10.0);
        http.put("maxLatencyMsRecent", Math.round(maxMs * 10) / 10.0);
        http.put("serverErrorsSinceStart", serverErrors);
        http.put("serverErrorRate", requests == 0 ? null : (double) serverErrors / requests);

        String k8sHost = System.getenv("KUBERNETES_SERVICE_HOST");
        Map<String, Object> runtime = new LinkedHashMap<>();
        runtime.put("environment", k8sHost != null ? "kubernetes" : "docker-or-local");
        runtime.put("instance", Optional.ofNullable(System.getenv("HOSTNAME")).orElse("unknown"));
        runtime.put("kubernetes", k8sHost != null
                ? "This backend runs inside Kubernetes; pod counts and HPA status are not queried by the application (see Grafana/kubectl)."
                : "Not running in Kubernetes — no pod or HPA data.");
        runtime.put("aws", "Not configured — no AWS resources are provisioned or monitored.");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("scope", "Live metrics of the backend instance that served this request (Spring Boot Actuator / Micrometer).");
        body.put("application", app);
        body.put("http", http);
        body.put("runtime", runtime);
        body.put("unavailable", List.of(
                "Active users — no session tracking exists (JWT is stateless)",
                "QR verifications — counter QR scanning is not recorded by the backend",
                "Container CPU/memory per service — available in Grafana (cAdvisor), not exposed to the app"));
        return body;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Double gauge(String name) {
        var g = meterRegistry.find(name).gauge();
        if (g == null) return null;
        double v = g.value();
        return Double.isNaN(v) ? null : v;
    }

    private Double sumGauge(String name, String tag, String value) {
        var gauges = meterRegistry.find(name).tag(tag, value).gauges();
        if (gauges.isEmpty()) return null;
        return gauges.stream().mapToDouble(x -> x.value()).filter(v -> !Double.isNaN(v)).sum();
    }

    private static String first(String a, String b) {
        String v = a != null && !a.isBlank() ? a : b;
        return v == null || v.isBlank() || "ALL".equalsIgnoreCase(v.trim()) ? null : v.trim();
    }

    private static boolean matchesStatus(Order o, String status) {
        ReportingService.Category c = ReportingService.categorize(o);
        return switch (status.toUpperCase()) {
            case "PAID", "COMPLETED", "COLLECTED" -> c == ReportingService.Category.COLLECTED;
            case "PENDING", "PENDING_CASH" -> c == ReportingService.Category.PENDING;
            case "REFUNDED", "CANCELLED" -> c == ReportingService.Category.REFUNDED || c == ReportingService.Category.CANCELLED_UNPAID;
            case "FAILED" -> c == ReportingService.Category.FAILED;
            default -> true;
        };
    }

    private static boolean matchesSearch(Order o, String q) {
        return contains(o.getOrderNumber(), q) || contains(o.getCustomerName(), q) || contains(o.getCustomerEmail(), q)
                || contains(o.getTransactionId(), q)
                || (o.getUser() != null && (contains(o.getUser().getName(), q) || contains(o.getUser().getEmail(), q) || contains(o.getUser().getUid(), q)));
    }

    private static boolean contains(String v, String q) {
        return v != null && v.toLowerCase().contains(q);
    }
}
