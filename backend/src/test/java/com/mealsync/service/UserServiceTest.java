package com.mealsync.service;

import com.mealsync.dto.RegisterRequest;
import com.mealsync.model.User;
import com.mealsync.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UserService.
 * Uses Mockito to isolate the service from the database.
 * Does NOT touch the real mealsync database.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private RegisterRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = new RegisterRequest();
        validRequest.setName("Test User");
        validRequest.setEmail("test@example.com");
        validRequest.setPassword("password123");
    }

    // ── Registration success ──────────────────────────────────────────────────

    @Test
    @DisplayName("Registration: succeeds with valid input")
    void register_validInput_savesUser() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("$2a$10$hashedpassword");

        User saved = new User();
        saved.setId(1L);
        saved.setName("Test User");
        saved.setEmail("test@example.com");
        saved.setRole("ROLE_USER");
        saved.setPassword("$2a$10$hashedpassword");
        when(userRepository.save(any(User.class))).thenReturn(saved);

        User result = userService.registerUser(validRequest);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Registration: password is hashed, never stored as plaintext")
    void register_passwordIsBCryptHashed() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("$2a$10$hashedvalue");

        User saved = new User();
        saved.setPassword("$2a$10$hashedvalue");
        saved.setRole("ROLE_USER");
        when(userRepository.save(any(User.class))).thenReturn(saved);

        userService.registerUser(validRequest);

        verify(passwordEncoder).encode("password123");
        // Ensure the save was called with a hashed password, not the raw one
        verify(userRepository).save(argThat(u -> !"password123".equals(u.getPassword())));
    }

    @Test
    @DisplayName("Registration: ROLE_USER is always assigned regardless of any submitted role")
    void register_roleIsAlwaysRoleUser() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("$2a$10$hashed");

        User saved = new User();
        saved.setRole("ROLE_USER");
        when(userRepository.save(any(User.class))).thenReturn(saved);

        userService.registerUser(validRequest);

        // Verify the entity passed to save always has ROLE_USER
        verify(userRepository).save(argThat(u -> "ROLE_USER".equals(u.getRole())));
    }

    @Test
    @DisplayName("Registration: email is normalized to lowercase")
    void register_emailNormalizedToLowercase() {
        validRequest.setEmail("  Test@EXAMPLE.COM  ");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("$2a$10$hashed");

        User saved = new User();
        saved.setEmail("test@example.com");
        saved.setRole("ROLE_USER");
        when(userRepository.save(any(User.class))).thenReturn(saved);

        userService.registerUser(validRequest);

        verify(userRepository).save(argThat(u -> "test@example.com".equals(u.getEmail())));
    }

    // ── Duplicate email ───────────────────────────────────────────────────────

    @Test
    @DisplayName("Registration: duplicate email throws RuntimeException")
    void register_duplicateEmail_throwsException() {
        User existing = new User();
        existing.setEmail("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> userService.registerUser(validRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("already registered");

        verify(userRepository, never()).save(any());
    }

    // ── Input validation ──────────────────────────────────────────────────────

    @Test
    @DisplayName("Registration: null name throws IllegalArgumentException")
    void register_nullName_throwsIllegalArgument() {
        validRequest.setName(null);
        assertThatThrownBy(() -> userService.registerUser(validRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Name is required");
    }

    @Test
    @DisplayName("Registration: empty name throws IllegalArgumentException")
    void register_emptyName_throwsIllegalArgument() {
        validRequest.setName("  ");
        assertThatThrownBy(() -> userService.registerUser(validRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Name is required");
    }

    @Test
    @DisplayName("Registration: invalid email format throws IllegalArgumentException")
    void register_invalidEmail_throwsIllegalArgument() {
        validRequest.setEmail("not-an-email");
        assertThatThrownBy(() -> userService.registerUser(validRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("valid email");
    }

    @Test
    @DisplayName("Registration: password shorter than 6 characters throws IllegalArgumentException")
    void register_shortPassword_throwsIllegalArgument() {
        validRequest.setPassword("abc");
        assertThatThrownBy(() -> userService.registerUser(validRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("at least 6 characters");
    }

    @Test
    @DisplayName("Registration: password longer than 72 characters throws IllegalArgumentException (BCrypt truncation guard)")
    void register_tooLongPassword_throwsIllegalArgument() {
        validRequest.setPassword("a".repeat(73));
        assertThatThrownBy(() -> userService.registerUser(validRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("72 characters");
    }

    // ── BCrypt sanity check ───────────────────────────────────────────────────

    @Test
    @DisplayName("BCrypt: hashed password is not equal to original plaintext")
    void bcrypt_hashIsNotPlaintext() {
        PasswordEncoder encoder = new BCryptPasswordEncoder();
        String raw = "MySecurePass1!";
        String hashed = encoder.encode(raw);

        assertThat(hashed).isNotEqualTo(raw);
        assertThat(hashed).startsWith("$2a$");
        assertThat(encoder.matches(raw, hashed)).isTrue();
        assertThat(encoder.matches("wrongPassword", hashed)).isFalse();
    }
}
