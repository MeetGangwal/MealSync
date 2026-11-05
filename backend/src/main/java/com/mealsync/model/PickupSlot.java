package com.mealsync.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalTime;

/**
 * A daily pickup window with a capacity. Orders reference a slot by its label
 * (orders.pickup_slot); bookings are counted per business day.
 */
@Data
@Entity
@Table(name = "pickup_slots")
public class PickupSlot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Display label, also stored on orders, e.g. "12:30 – 12:45". */
    @Column(nullable = false, unique = true, length = 50)
    private String label;

    /** breakfast | lunch | dinner */
    @Column(nullable = false, length = 20)
    private String mealPeriod;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Column(nullable = false)
    private Integer capacity;

    @Column(nullable = false)
    private Boolean active = true;
}
