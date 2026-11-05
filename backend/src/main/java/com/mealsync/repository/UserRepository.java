package com.mealsync.repository;

import com.mealsync.model.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(String name, String email);

    /**
     * All administrator rows, locked for update. Used when changing roles so two concurrent
     * demotions cannot leave the system without an administrator.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE UPPER(u.role) IN ('ROLE_ADMIN', 'ADMIN')")
    List<User> findAdminsForUpdate();
}
