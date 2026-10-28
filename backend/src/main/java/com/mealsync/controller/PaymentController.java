package com.mealsync.controller;

import com.mealsync.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller exposing payment methods and simulated payment verification.
 */
@RestController
@RequestMapping("/api/payments")
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
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @GetMapping("/methods")
    public ResponseEntity<?> getPaymentMethods() {
        return ResponseEntity.ok(List.of(
                Map.of("id", "UPI", "label", "UPI (GPay / PhonePe / Paytm)", "type", "SIMULATED_INSTANT", "note", "Simulated Instant Demo Payment"),
                Map.of("id", "Card", "label", "Debit / Credit Card", "type", "SIMULATED_INSTANT", "note", "Simulated Card Authorization"),
                Map.of("id", "Mess Wallet", "label", "Mess Wallet (Student RFID)", "type", "SIMULATED_INSTANT", "note", "Campus Card Account (Demo)"),
                Map.of("id", "Cash (at counter)", "label", "Pay Cash at Counter", "type", "SIMULATED_DEFERRED", "note", "Pay in cash upon food pickup")
        ));
    }

    @PostMapping("/simulate")
    public ResponseEntity<?> simulatePayment(@RequestBody Map<String, Object> req) {
        String method = req.get("method") != null ? req.get("method").toString() : "UPI";
        Double amount = req.get("amount") != null ? Double.valueOf(req.get("amount").toString()) : 0.0;
        PaymentService.PaymentResult result = paymentService.processPayment(method, amount);
        return ResponseEntity.ok(result);
    }
}
