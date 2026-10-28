package com.mealsync.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "meals")
public class Meal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String description;
    
    // e.g., THALI, BEVERAGE, EXTRA
    private String category; 
    
    private Double price;
    private Integer availableQuantity;
    private Boolean isAvailable;
    
    // Optional: URL to an image of the meal
    private String imageUrl;
}
