package com.mealsync.repository;

import com.mealsync.model.PickupSlot;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PickupSlotRepository extends JpaRepository<PickupSlot, Long> {
    List<PickupSlot> findAllByOrderByStartTimeAsc();
    Optional<PickupSlot> findByLabel(String label);
    boolean existsByLabel(String label);

    /** Locks the slot row so concurrent bookings of the same slot are serialized. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM PickupSlot s WHERE s.label = :label")
    Optional<PickupSlot> findByLabelForUpdate(@Param("label") String label);
}
