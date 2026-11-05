package com.mealsync.dto;

import com.mealsync.model.Order;
import com.mealsync.model.OrderItem;
import com.mealsync.model.User;
import com.mealsync.service.ReportingService;

import java.util.List;

/**
 * One payment record (= one order) for the admin Payment Records page.
 * Flat, explicit fields so the frontend never has to dig into JPA entity structure.
 */
public record PaymentRecordResponse(
        Long id,
        String orderNumber,
        String orderSource,
        String orderStatus,
        String paymentStatus,
        String paymentCategory,
        String paymentMethod,
        String transactionId,
        Double totalAmount,
        String orderTime,
        String businessDate,
        String pickupSlot,
        String counterOperator,
        Long customerId,
        String customerName,
        String customerEmail,
        boolean registeredCustomer,
        String qrCodeData,
        List<Item> items
) {

    public record Item(String name, int quantity, double unitPrice, double subtotal) {}

    public static PaymentRecordResponse of(Order o, ReportingService reporting) {
        User u = o.getUser();
        // Registered customer: the account is authoritative. Walk-in: the details captured at the counter.
        String name = u != null && u.getName() != null ? u.getName() : o.getCustomerName();
        String email = u != null && u.getEmail() != null ? u.getEmail() : o.getCustomerEmail();
        List<Item> items = o.getItems() == null ? List.of() : o.getItems().stream().map(PaymentRecordResponse::item).toList();
        var date = reporting.businessDate(o);
        return new PaymentRecordResponse(
                o.getId(), o.getOrderNumber(),
                o.getOrderSource() == null ? "PORTAL" : o.getOrderSource(),
                o.getStatus(), o.getPaymentStatus(), ReportingService.categorize(o).name(),
                o.getPaymentMethod(), o.getTransactionId(), o.getTotalAmount(),
                o.getOrderTime() == null ? null : o.getOrderTime().atZone(java.time.ZoneId.systemDefault()).toOffsetDateTime().toString(),
                date == null ? null : date.toString(),
                o.getPickupSlot(), o.getCounterOperator(),
                u == null ? null : u.getId(), name, email, u != null,
                o.getQrCodeData(), items);
    }

    private static Item item(OrderItem it) {
        int qty = it.getQuantity() == null ? 0 : it.getQuantity();
        double price = it.getPriceAtTimeOfOrder() == null ? 0 : it.getPriceAtTimeOfOrder();
        return new Item(ReportingService.itemName(it), qty, price, Math.round(qty * price * 100) / 100.0);
    }
}
