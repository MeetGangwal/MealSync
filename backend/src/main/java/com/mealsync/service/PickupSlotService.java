package com.mealsync.service;

import com.mealsync.model.PickupSlot;
import com.mealsync.repository.OrderRepository;
import com.mealsync.repository.PickupSlotRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Pickup slot capacity. Portal orders are booked into today's slot (business day in the campus
 * time zone). {@link #reserve(String)} must run inside the order's transaction: it locks the
 * slot row, so concurrent bookings of the same slot are serialized and the capacity check sees
 * every order committed before it.
 */
@Service
public class PickupSlotService {

    /** Slot is full, inactive or unknown (HTTP 409 / 400). */
    public static class SlotUnavailableException extends RuntimeException {
        public SlotUnavailableException(String message) { super(message); }
    }

    private final PickupSlotRepository slotRepository;
    private final OrderRepository orderRepository;
    private final Clock clock;

    public PickupSlotService(PickupSlotRepository slotRepository, OrderRepository orderRepository, Clock clock) {
        this.slotRepository = slotRepository;
        this.orderRepository = orderRepository;
        this.clock = clock;
    }

    /** All slots with today's bookings (the count is a locking read, so not a read-only transaction). */
    @Transactional
    public List<Map<String, Object>> listWithBookings() {
        LocalDateTime[] day = todayRange();
        return slotRepository.findAllByOrderByStartTimeAsc().stream().map(s -> view(s, booked(s, day))).toList();
    }

    // Rejecting a slot changes nothing, so it must not mark the caller's order transaction
    // rollback-only (the controller turns the exception into a 409 response).
    @Transactional(propagation = Propagation.MANDATORY, noRollbackFor = SlotUnavailableException.class)
    public PickupSlot reserve(String label) {
        PickupSlot slot = slotRepository.findByLabelForUpdate(label == null ? "" : label.trim())
                .orElseThrow(() -> new SlotUnavailableException("Unknown pickup slot: " + label));
        if (!Boolean.TRUE.equals(slot.getActive())) {
            throw new SlotUnavailableException("Pickup slot " + slot.getLabel() + " is not open");
        }
        if (booked(slot, todayRange()) >= slot.getCapacity()) {
            throw new SlotUnavailableException("Pickup slot " + slot.getLabel() + " is full — please choose another slot");
        }
        return slot;
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body) {
        PickupSlot s = new PickupSlot();
        apply(s, body, true);
        if (slotRepository.existsByLabel(s.getLabel())) {
            throw new IllegalArgumentException("A slot with this label already exists");
        }
        PickupSlot saved = slotRepository.save(s);
        return view(saved, booked(saved, todayRange()));
    }

    @Transactional
    public Map<String, Object> update(Long id, Map<String, Object> body) {
        PickupSlot s = slotRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Slot not found"));
        // The label is stored on existing orders, so it is not editable (bookings are matched by label).
        apply(s, body, false);
        PickupSlot saved = slotRepository.save(s);
        return view(saved, booked(saved, todayRange()));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void apply(PickupSlot s, Map<String, Object> body, boolean creating) {
        if (creating) {
            String label = str(body.get("label"));
            if (label == null || label.isBlank() || label.length() > 50) throw new IllegalArgumentException("Label is required (max 50 characters)");
            s.setLabel(label.trim());
            String period = str(body.get("mealPeriod"));
            if (period == null || !List.of("breakfast", "lunch", "dinner").contains(period)) {
                throw new IllegalArgumentException("mealPeriod must be breakfast, lunch or dinner");
            }
            s.setMealPeriod(period);
            s.setStartTime(time(body.get("startTime"), "startTime"));
            s.setEndTime(time(body.get("endTime"), "endTime"));
            if (!s.getEndTime().isAfter(s.getStartTime())) throw new IllegalArgumentException("endTime must be after startTime");
        }
        if (body.containsKey("capacity") || creating) {
            Object c = body.get("capacity");
            int capacity;
            try {
                capacity = c instanceof Number n ? n.intValue() : Integer.parseInt(String.valueOf(c));
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("capacity must be a number");
            }
            if (capacity < 1 || capacity > 1000) throw new IllegalArgumentException("capacity must be between 1 and 1000");
            s.setCapacity(capacity);
        }
        if (body.containsKey("active")) s.setActive(Boolean.parseBoolean(String.valueOf(body.get("active"))));
        if (creating && s.getActive() == null) s.setActive(true);
    }

    private long booked(PickupSlot s, LocalDateTime[] day) {
        return orderRepository.countSlotBookings(s.getLabel(), day[0], day[1]);
    }

    /** Today's business day as [start, end) in the server time zone used for order timestamps. */
    private LocalDateTime[] todayRange() {
        LocalDate today = LocalDate.now(clock);
        ZoneId server = ZoneId.systemDefault();
        return new LocalDateTime[] {
                today.atStartOfDay(clock.getZone()).withZoneSameInstant(server).toLocalDateTime(),
                today.plusDays(1).atStartOfDay(clock.getZone()).withZoneSameInstant(server).toLocalDateTime(),
        };
    }

    private static Map<String, Object> view(PickupSlot s, long booked) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("label", s.getLabel());
        m.put("mealPeriod", s.getMealPeriod());
        m.put("startTime", s.getStartTime().toString());
        m.put("endTime", s.getEndTime().toString());
        m.put("capacity", s.getCapacity());
        m.put("booked", booked);
        m.put("remaining", Math.max(0, s.getCapacity() - booked));
        m.put("active", Boolean.TRUE.equals(s.getActive()));
        return m;
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }

    private static LocalTime time(Object o, String field) {
        try {
            return LocalTime.parse(String.valueOf(o));
        } catch (Exception e) {
            throw new IllegalArgumentException(field + " must be a time like 12:30");
        }
    }
}
