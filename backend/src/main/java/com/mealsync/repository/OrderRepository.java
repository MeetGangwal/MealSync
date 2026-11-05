package com.mealsync.repository;

import com.mealsync.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserIdOrderByOrderTimeDesc(Long userId);
    List<Order> findAllByOrderByOrderTimeDesc();
    long countByStatus(String status);
    Optional<Order> findByOrderNumber(String orderNumber);
    Optional<Order> findByIdempotencyKey(String idempotencyKey);

    /**
     * Non-cancelled portal orders booked into a pickup slot within [from, to) (server time zone).
     * A locking read (FOR SHARE): under MySQL's REPEATABLE READ a plain SELECT would read the
     * transaction's earlier snapshot and miss bookings committed by a concurrent order that held
     * the slot lock first.
     */
    @Query(value = "SELECT COUNT(*) FROM orders o WHERE o.pickup_slot = :slot AND o.order_time >= :from AND o.order_time < :to "
            + "AND (o.status IS NULL OR UPPER(o.status) <> 'CANCELLED') AND (o.order_source IS NULL OR o.order_source <> 'COUNTER') "
            + "FOR SHARE", nativeQuery = true)
    long countSlotBookings(@Param("slot") String slot, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}

