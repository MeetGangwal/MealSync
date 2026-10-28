package com.mealsync.repository;

import com.mealsync.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserIdOrderByOrderTimeDesc(Long userId);
    List<Order> findAllByOrderByOrderTimeDesc();
    long countByStatus(String status);
    Optional<Order> findByOrderNumber(String orderNumber);
    Optional<Order> findByIdempotencyKey(String idempotencyKey);
}

