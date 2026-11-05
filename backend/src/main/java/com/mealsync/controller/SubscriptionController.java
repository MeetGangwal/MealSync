package com.mealsync.controller;

import com.mealsync.dto.SubscriptionResponse;
import com.mealsync.model.SubscriptionPlan;
import com.mealsync.model.User;
import com.mealsync.repository.UserRepository;
import com.mealsync.service.SubscriptionService;
import com.mealsync.service.SubscriptionService.PaymentDeclinedException;
import com.mealsync.service.SubscriptionService.SubscriptionConflictException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.function.Supplier;

/**
 * Meal subscriptions of the authenticated user (customers and administrators).
 *
 *   GET  /api/subscriptions/plans            — plan catalogue
 *   GET  /api/subscriptions/me               — my subscriptions
 *   POST /api/subscriptions                  — { "planCode": "...", "paymentMethod": "UPI" }
 *   POST /api/subscriptions/{id}/pause | /resume | /skip-today
 *
 * The acting user is always the JWT principal; subscriptions of other users return 404.
 */
@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final UserRepository userRepository;

    public SubscriptionController(SubscriptionService subscriptionService, UserRepository userRepository) {
        this.subscriptionService = subscriptionService;
        this.userRepository = userRepository;
    }

    @GetMapping("/plans")
    public List<SubscriptionPlan> plans() {
        return subscriptionService.listPlans();
    }

    @GetMapping("/me")
    public ResponseEntity<?> mine(Authentication authentication) {
        return ResponseEntity.ok(subscriptionService.listForUser(currentUser(authentication)));
    }

    @PostMapping
    public ResponseEntity<?> subscribe(@RequestBody Map<String, String> body, Authentication authentication) {
        return handle(HttpStatus.CREATED, () -> subscriptionService.subscribe(
                currentUser(authentication), body.get("planCode"), body.get("paymentMethod")));
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<?> pause(@PathVariable Long id, Authentication authentication) {
        return handle(HttpStatus.OK, () -> subscriptionService.pause(currentUser(authentication), id));
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<?> resume(@PathVariable Long id, Authentication authentication) {
        return handle(HttpStatus.OK, () -> subscriptionService.resume(currentUser(authentication), id));
    }

    @PostMapping("/{id}/skip-today")
    public ResponseEntity<?> skipToday(@PathVariable Long id, Authentication authentication) {
        return handle(HttpStatus.OK, () -> subscriptionService.skipToday(currentUser(authentication), id));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new NoSuchElementException("User not found"));
    }

    private static ResponseEntity<?> handle(HttpStatus success, Supplier<SubscriptionResponse> action) {
        try {
            return ResponseEntity.status(success).body(action.get());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (SubscriptionConflictException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (PaymentDeclinedException e) {
            return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(Map.of("error", e.getMessage()));
        } catch (OptimisticLockingFailureException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "This subscription was changed by another request. Refresh and try again."));
        }
    }
}
