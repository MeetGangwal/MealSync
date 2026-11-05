package com.mealsync.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "order_items")
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnoreProperties("items")
    private Order order;
    
    @ManyToOne
    @JoinColumn(name = "meal_id", nullable = false)
    private Meal meal;
    
    private Integer quantity;

    private Double priceAtTimeOfOrder;

    /**
     * Product name at the time of the order, so order history stays accurate after a product is
     * renamed. Nullable for backward compatibility: items created before this column existed
     * fall back to the current product name (see ReportingService.itemName).
     */
    @Column(name = "item_name")
    private String itemName;
}
