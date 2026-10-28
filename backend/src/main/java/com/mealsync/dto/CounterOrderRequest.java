package com.mealsync.dto;

import lombok.Data;
import java.util.List;

@Data
public class CounterOrderRequest {
    /** Optional registered user ID if counter sale is for a registered student */
    private Long userId;

    /** Walk-in customer name or registered student name */
    private String customerName;

    /** Optional contact phone */
    private String customerPhone;

    /** Optional contact email */
    private String customerEmail;

    /** Pickup timing, e.g. "Immediate Counter Pickup" */
    private String pickupSlot;

    /** List of meals and quantities */
    private List<OrderItemRequest> items;

    /** Payment method: CASH, UPI, CARD, MESS_WALLET */
    private String paymentMethod;

    /** Whether cash was received at counter (true = PAID, false = PENDING_CASH) */
    private Boolean paymentReceived;

    /** Prevents double clicks / duplicate submissions */
    private String idempotencyKey;

    /** Controlled failure mode for testing */
    private Boolean simulateFailure;
}
