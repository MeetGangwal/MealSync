package com.mealsync.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response body returned when an order is placed successfully.
 * Designed to carry only what the frontend needs — not full entity graphs.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class OrderResponse {
    private Long id;
    private String orderNumber;
    private String status;
    private Double totalAmount;
    private String pickupSlot;
    private String orderTime;
    private String qrCodeData;
    private String paymentMethod;
    private String paymentStatus;
    private String transactionId;
    private String orderSource;
    private String customerName;
    private String counterOperator;

    // Backward-compatible 7-arg constructor
    public OrderResponse(Long id, String orderNumber, String status, Double totalAmount, String pickupSlot, String orderTime, String qrCodeData) {
        this(id, orderNumber, status, totalAmount, pickupSlot, orderTime, qrCodeData, "UPI", "PAID", null, "PORTAL", null, null);
    }

    // Backward-compatible 10-arg constructor
    public OrderResponse(Long id, String orderNumber, String status, Double totalAmount, String pickupSlot, String orderTime, String qrCodeData, String paymentMethod, String paymentStatus, String transactionId) {
        this(id, orderNumber, status, totalAmount, pickupSlot, orderTime, qrCodeData, paymentMethod, paymentStatus, transactionId, "PORTAL", null, null);
    }
}
