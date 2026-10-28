package com.mealsync.dto;

import com.mealsync.model.Order;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminOverviewResponse {
    private long totalOrders;
    private long todayOrders;
    private double todaySales;
    private long pendingOrders;
    private long availableProducts;
    private long soldOutProducts;
    private List<Order> recentOrders;
}
