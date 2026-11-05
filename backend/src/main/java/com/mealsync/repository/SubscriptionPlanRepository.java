package com.mealsync.repository;

import com.mealsync.model.SubscriptionPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, Long> {
    Optional<SubscriptionPlan> findByCode(String code);
    boolean existsByCode(String code);
    List<SubscriptionPlan> findByActiveTrueOrderByMonthlyPriceAsc();
}
