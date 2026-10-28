package com.mealsync.service;

import com.mealsync.dto.RegisterRequest;
import com.mealsync.model.User;
import com.mealsync.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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
        user.setRole("ROLE_USER");

        // Hash the password with BCrypt before persisting
        user.setPassword(passwordEncoder.encode(req.getPassword()));

        return userRepository.save(user);
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
