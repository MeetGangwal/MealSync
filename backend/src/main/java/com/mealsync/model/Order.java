package com.mealsync.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // The visual ID shown to users, e.g., MS10290
    private String orderNumber;
    
    // Connects this order to a specific User (nullable for walk-in guest counter orders)
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = true)
    @JsonIgnoreProperties("password") // Prevent sending hashed passwords back to frontend
    private User user;

    // Order Origin: PORTAL or COUNTER
    @Column(name = "order_source", length = 50)
    private String orderSource = "PORTAL";

    // Customer details for display / walk-in identification
    private String customerName;
    private String customerPhone;
    private String customerEmail;

    // Authenticated admin / counter operator who handled this sale
    private String counterOperator;
    
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("order") // Prevent infinite JSON recursion
    private List<OrderItem> items = new ArrayList<>();
    
    // CONFIRMED, PARTIALLY_SERVED, COMPLETED, CANCELLED
    private String status;
    
    private Double totalAmount;
    
    // The data encoded in the QR ticket for this order
    private String qrCodeData;
    
    // The time pickup slot they selected
    private String pickupSlot;
    
    // Payment simulation fields
    private String paymentMethod;
    private String paymentStatus;
    private String transactionId;

    // Idempotency token to prevent double submissions
    @Column(unique = true)
    private String idempotencyKey;

    @CreationTimestamp
    private LocalDateTime orderTime;
}
