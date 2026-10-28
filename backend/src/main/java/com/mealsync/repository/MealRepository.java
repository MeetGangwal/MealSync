package com.mealsync.repository;

import com.mealsync.model.Meal;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MealRepository extends JpaRepository<Meal, Long> {
    Optional<Meal> findByName(String name);
    boolean existsByName(String name);

    /**
     * Pessimistic write lock (SELECT ... FOR UPDATE) to guarantee atomic stock checks
     * and decrements across concurrent student transactions without overbooking.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Meal m WHERE m.id = :id")
    Optional<Meal> findByIdForUpdate(@Param("id") Long id);
}

