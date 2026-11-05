package com.mealsync.service;

import com.mealsync.dto.RegisterRequest;
import com.mealsync.model.User;
import com.mealsync.repository.UserRepository;
import com.mealsync.security.Roles;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * Service layer for user-account operations.
 *
 * Security invariants enforced here:
 *  1. Role is ALWAYS set to "ROLE_USER" on registration — ignoring any submitted value.
 *  2. Passwords are BCrypt-hashed before persistence — plaintext never stored.
 *  3. Duplicate emails are rejected with a clear RuntimeException.
 *  4. Server-side validation complements (but does not replace) Bean Validation annotations.
 *  5. resetPassword() has been removed. Do not re-add it without a secure token flow.
 */
@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Registers a new user account from a safe RegisterRequest DTO.
     *
     * @param req the registration request (name, email, password only)
     * @return the persisted User entity
     * @throws IllegalArgumentException if input validation fails
     * @throws RuntimeException         if the email is already registered
     */
    public User registerUser(RegisterRequest req) {
        // Server-side validation (supplements any Bean Validation on the DTO)
        validateRegistrationInput(req);

        if (userRepository.findByEmail(req.getEmail().trim().toLowerCase()).isPresent()) {
            throw new RuntimeException("Email is already registered!");
        }

        User user = new User();
        user.setName(req.getName().trim());
        user.setEmail(req.getEmail().trim().toLowerCase());

        // Force role to ROLE_USER — never trust the client-supplied value
        user.setRole(Roles.USER);

        // Hash the password with BCrypt before persisting
        user.setPassword(passwordEncoder.encode(req.getPassword()));

        return userRepository.save(user);
    }

    // -----------------------------------------------------------------------
    // Role management (administrators only — enforced by SecurityConfig on /api/admin/**)
    // -----------------------------------------------------------------------

    /**
     * Changes a user's role to {@link Roles#ADMIN} or {@link Roles#USER}.
     *
     * Rules: the target must exist; an administrator cannot change their own role (prevents
     * accidental lock-out and makes every promotion a second person's decision); the last
     * administrator cannot be demoted. Administrator rows are locked for the duration of the
     * transaction so concurrent demotions cannot remove every administrator.
     *
     * @param actorEmail email of the authenticated administrator (from the JWT principal)
     * @param targetUserId user to change
     * @param requestedRole "ADMIN" or "USER" (case-insensitive, optional "ROLE_" prefix)
     * @throws IllegalArgumentException invalid role value
     * @throws java.util.NoSuchElementException target user not found
     * @throws IllegalStateException rule violation (own role, last administrator)
     */
    @Transactional
    public User changeRole(String actorEmail, Long targetUserId, String requestedRole) {
        String newRole = requestedRole == null ? "" : Roles.normalize(requestedRole);
        if (!Roles.ADMIN.equals(newRole) && !Roles.USER.equals(newRole)) {
            throw new IllegalArgumentException("Role must be ADMIN or USER");
        }

        List<User> admins = userRepository.findAdminsForUpdate();
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        User actor = userRepository.findByEmail(actorEmail)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));

        if (actor.getId().equals(target.getId())) {
            throw new IllegalStateException("You cannot change your own role");
        }
        if (newRole.equals(Roles.normalize(target.getRole()))) {
            return target; // no change
        }
        if (Roles.USER.equals(newRole) && Roles.isAdmin(target.getRole()) && admins.size() <= 1) {
            throw new IllegalStateException("Cannot remove the last administrator");
        }

        target.setRole(newRole);
        User saved = userRepository.save(target);
        logger.info("Role changed: user id {} -> {} by administrator id {}", saved.getId(), newRole, actor.getId());
        return saved;
    }

    /**
     * Operator bootstrap: promotes an already-registered account to administrator.
     * Called only at start-up with the operator-configured MEALSYNC_BOOTSTRAP_ADMIN_EMAIL.
     *
     * @return true if the account was promoted, false if it was already an administrator
     * @throws java.util.NoSuchElementException no account with that email exists
     */
    @Transactional
    public boolean promoteBootstrapAdmin(String email) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new NoSuchElementException("No registered account for the bootstrap administrator email"));
        if (Roles.isAdmin(user.getRole())) {
            return false;
        }
        user.setRole(Roles.ADMIN);
        userRepository.save(user);
        logger.info("Bootstrap administrator granted to user id {}", user.getId());
        return true;
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private void validateRegistrationInput(RegisterRequest req) {
        if (req.getName() == null || req.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Name is required");
        }
        if (req.getName().trim().length() < 2 || req.getName().trim().length() > 100) {
            throw new IllegalArgumentException("Name must be between 2 and 100 characters");
        }
        if (req.getEmail() == null || req.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (!req.getEmail().trim().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new IllegalArgumentException("Please provide a valid email address");
        }
        if (req.getPassword() == null || req.getPassword().length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }
        if (req.getPassword().length() > 72) {
            // BCrypt silently truncates at 72 bytes — reject rather than silently truncate
            throw new IllegalArgumentException("Password must not exceed 72 characters");
        }
    }
}
