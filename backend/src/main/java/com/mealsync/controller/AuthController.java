package com.mealsync.controller;

import com.mealsync.model.User;
import com.mealsync.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    // 1. Register API
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody User user) {
        try {
            User savedUser = userService.registerUser(user);
            return ResponseEntity.ok(Map.of("message", "User registered successfully!", "userId", savedUser.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 2. Login API
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        boolean isValid = userService.checkPassword(email, password);
        if (isValid) {
            // Later we will return a real JWT token here
            return ResponseEntity.ok(Map.of("message", "Login successful!", "token", "dummy-jwt-token-for-now"));
        } else {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
        }
    }

    // 3. Reset Password API
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String newPassword = request.get("newPassword");

        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        }

        boolean reset = userService.resetPassword(email, newPassword);
        if (reset) {
            return ResponseEntity.ok(Map.of("message", "Password reset successfully!"));
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found!"));
        }
    }
}
