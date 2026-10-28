package com.mealsync.controller;

import com.mealsync.dto.LoginResponse;
import com.mealsync.dto.RegisterRequest;
import com.mealsync.model.User;
import com.mealsync.repository.UserRepository;
import com.mealsync.security.JwtUtils;
import com.mealsync.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Authentication REST controller.
 *
 * Public endpoints (no JWT required):
 *   POST /api/auth/register  — Create a new account. Role is always forced to ROLE_USER server-side.
 *   POST /api/auth/login     — Authenticate and receive a signed JWT plus user metadata.
 *
 * CORS: configured here for local development only (http://localhost:5173).
 * In production this should be set in a global CorsConfigurationSource bean
 * or handled by the API gateway / reverse proxy.
 *
 * Password Reset: The old email-only reset endpoint has been permanently removed.
 * Implement a secure token-based flow before re-enabling any reset functionality.
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(
    origins = {
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000"
    },
    originPatterns = {"http://localhost:*", "http://127.0.0.1:*"}
)
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtils jwtUtils;

    // -----------------------------------------------------------------------
    // Registration
    // -----------------------------------------------------------------------

    /**
     * Registers a new user account.
     *
     * Uses a dedicated RegisterRequest DTO (not the User entity) so the caller
     * cannot inject a role, createdAt, or any other field they shouldn't control.
     *
     * Returns HTTP 409 Conflict on duplicate email (not 400) so the frontend can
     * distinguish "bad input" from "email already taken".
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            User saved = userService.registerUser(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "message", "User registered successfully!",
                    "userId",  saved.getId()
            ));
        } catch (IllegalArgumentException e) {
            // Validation errors (e.g. weak password, malformed email)
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            // Duplicate email
            if (e.getMessage() != null && e.getMessage().contains("already registered")) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "An account with this email already exists."));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // -----------------------------------------------------------------------
    // Login
    // -----------------------------------------------------------------------

    /**
     * Authenticates the user and returns a signed JWT plus user metadata.
     *
     * Request body:  { "email": "...", "password": "..." }
     * Success (200): { "token": "eyJ...", "userId": 1, "name": "Meet", "email": "...", "role": "ROLE_USER" }
     * Failure (401): { "error": "Invalid email or password" }
     *
     * The generic "Invalid email or password" message intentionally does not reveal
     * whether the email address exists in the system.
     *
     * The token must be sent as "Authorization: Bearer <token>" on protected endpoints.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email    = request.get("email");
        String password = request.get("password");

        if (email == null || password == null || email.trim().isEmpty() || password.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Email and password are required"));
        }

        email = email.trim().toLowerCase();

        try {
            // Authenticate via Spring Security → BCrypt comparison happens here
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password));

            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Generate signed JWT
            String jwt = jwtUtils.generateJwtToken(authentication);

            // Load full user record to return display name and role
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found after authentication"));

            LoginResponse body = new LoginResponse(
                    jwt,
                    user.getId(),
                    user.getName(),
                    user.getEmail(),
                    user.getRole()
            );

            return ResponseEntity.ok(body);

        } catch (AuthenticationException e) {
            // Bad credentials or invalid login details
            logger.warn("Authentication failed for email '{}': {}", email, e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password"));
        } catch (Exception e) {
            // Unexpected internal error (e.g. JWT signing misconfiguration)
            logger.error("Internal error during login for email '{}': {}", email, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal authentication error: " + e.getMessage()));
        }
    }

    // -----------------------------------------------------------------------
    // Current User Profile
    // -----------------------------------------------------------------------

    /**
     * Returns the currently authenticated user's profile based on the JWT token.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not found"));
        }

        Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("userId", user.getId());
        resp.put("name", user.getName());
        resp.put("email", user.getEmail());
        resp.put("role", user.getRole());
        resp.put("phone", user.getPhone() != null ? user.getPhone() : "");
        resp.put("uid", user.getUid() != null ? user.getUid() : "");
        return ResponseEntity.ok(resp);
    }

    /**
     * Updates the authenticated user's permitted profile fields (name, phone, uid).
     * Protected: email and role cannot be forged through this endpoint.
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> request,
                                           Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not found"));
        }

        String newName = request.get("name");
        String newPhone = request.get("phone");
        String newUid = request.get("uid");

        if (newName != null && !newName.trim().isEmpty()) {
            user.setName(newName.trim());
        }
        if (newPhone != null) {
            user.setPhone(newPhone.trim());
        }
        if (newUid != null) {
            user.setUid(newUid.trim());
        }

        User saved = userRepository.save(user);

        Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("userId", saved.getId());
        resp.put("name", saved.getName());
        resp.put("email", saved.getEmail());
        resp.put("role", saved.getRole());
        resp.put("phone", saved.getPhone() != null ? saved.getPhone() : "");
        resp.put("uid", saved.getUid() != null ? saved.getUid() : "");
        return ResponseEntity.ok(resp);
    }

    // -----------------------------------------------------------------------
    // Password Reset — DISABLED
    // -----------------------------------------------------------------------
    //
    // POST /api/auth/reset-password was removed because it allowed anyone with
    // a known email to change a password with no identity verification.
    //
    // TODO (future): implement a secure token-based flow:
    //   1. POST /api/auth/forgot-password — email a time-limited signed link
    //   2. POST /api/auth/reset-password  — accept token + new password, verify token
}
