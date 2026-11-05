package com.mealsync.controller;

import com.mealsync.service.PickupSlotService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Pickup slots with today's bookings.
 *   GET  /api/slots              — any signed-in user (used by checkout)
 *   POST /api/admin/slots        — administrators: create a slot
 *   PUT  /api/admin/slots/{id}   — administrators: change capacity / open-closed
 * Capacity is enforced when an order is placed (PickupSlotService.reserve).
 */
@RestController
public class PickupSlotController {

    private final PickupSlotService slotService;

    public PickupSlotController(PickupSlotService slotService) {
        this.slotService = slotService;
    }

    @GetMapping("/api/slots")
    public List<Map<String, Object>> list() {
        return slotService.listWithBookings();
    }

    @PostMapping("/api/admin/slots")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(slotService.create(body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/api/admin/slots/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(slotService.update(id, body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }
}
