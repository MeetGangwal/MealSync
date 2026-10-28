package com.mealsync.dto;

import lombok.Data;

@Data
public class OrderItemRequest {
    private Long menuItemId;
    private Integer qty;
}
