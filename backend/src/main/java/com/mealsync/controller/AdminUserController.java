package com.mealsync.controller;

import com.mealsync.model.User;
import com.mealsync.repository.UserRepository;
import com.mealsync.security.Roles;
import com.mealsync.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Administrator management of user roles.
 *
 * All paths are under /api/admin/** and therefore require ROLE_ADMIN (SecurityConfig).
 * Role changes always use the authenticated principal as the acting administrator.
 *
 *   GET /api/admin/users?q=     — list accounts (no password hashes)
 *   PUT /api/admin/users/{id}/role  { "role": "ADMIN" | "USER" }
 */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository userRepository;
    private final UserService userService;

    public AdminUserController(UserRepository userRepository, UserService userService) {
        this.userRepository = userRepository;
        this.userService = userService;
    }

    @GetMapping
    public List<Map<String, Object>> listUsers(@RequestParam(required = false, defaultValue = "") String q) {
        String query = q.trim();
        List<User> users = query.isEmpty()
                ? userRepository.findAll()
                : userRepository.findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(query, query);
        return users.stream()
                .sorted(Comparator.comparing(User::getId))
                .map(AdminUserController::toSummary)
                .toList();
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<?> changeRole(@PathVariable Long id,
                                        @RequestBody Map<String, String> body,
                                        Authentication authentication) {
        try {
            User updated = userService.changeRole(authentication.getName(), id, body.get("role"));
            return ResponseEntity.ok(toSummary(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    private static Map<String, Object> toSummary(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("name", u.getName());
        m.put("email", u.getEmail());
        m.put("role", Roles.normalize(u.getRole()));
        m.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : null);
        return m;
    }
}
