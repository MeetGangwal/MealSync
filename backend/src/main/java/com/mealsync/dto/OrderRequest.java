package com.mealsync.dto;

import lombok.Data;
import java.util.List;

@Data
public class OrderRequest {
    private Long userId;
    private String pickupSlot;
    private List<OrderItemRequest> items;
    private String paymentMethod;
    private String idempotencyKey;
    private Boolean simulateFailure;
}
