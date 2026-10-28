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
}
