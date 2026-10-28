package com.mealsync.service;

import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Service for handling simulated payments for campus canteen orders.
 * Supports UPI, Debit/Credit Card, Mess RFID Wallet, and Cash on Delivery.
 * No real money is charged.
 */
@Service
public class PaymentService {

    public record PaymentResult(
            boolean success,
            String transactionId,
            String paymentStatus,
            String paymentMethod,
            String message
    ) {}

    /**
     * Simulates payment processing for campus meal orders.
     *
     * @param paymentMethod payment method selected by the user (UPI, Card, Mess Wallet, Cash)
     * @param amount order total amount
     * @return PaymentResult containing transaction details and confirmation status
     */
    public PaymentResult processPayment(String paymentMethod, Double amount) {
        return processPayment(paymentMethod, amount, false);
    }

    /**
     * Simulates payment processing for campus meal orders.
     * Supports controlled failure for verification testing.
     *
     * @param paymentMethod payment method selected by the user (UPI, Card, Mess Wallet, Cash)
     * @param amount order total amount
     * @param simulateFailure whether to trigger a controlled simulated payment failure
     * @return PaymentResult containing transaction details and confirmation status
     */
    public PaymentResult processPayment(String paymentMethod, Double amount, Boolean simulateFailure) {
        if (paymentMethod == null || paymentMethod.trim().isEmpty()) {
            paymentMethod = "UPI";
        }

        String normalizedMethod = paymentMethod.trim().toUpperCase();

        // Controlled test failure case
        if (Boolean.TRUE.equals(simulateFailure) || normalizedMethod.contains("FAIL")) {
            return new PaymentResult(
                    false,
                    null,
                    "FAILED",
                    normalizedMethod,
                    "Simulated payment declined by issuer: Card/UPI test authorization failure."
            );
        }

        String txnId = "TXN_SIM_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();

        if (normalizedMethod.contains("CASH")) {
            return new PaymentResult(
                    true,
                    txnId,
                    "PENDING_CASH",
                    "CASH",
                    "Simulated cash order placed. Pay at mess counter upon pickup."
            );
        } else if (normalizedMethod.contains("CARD")) {
            return new PaymentResult(
                    true,
                    txnId,
                    "PAID",
                    "CARD",
                    "Simulated card authorization successful."
            );
        } else if (normalizedMethod.contains("WALLET") || normalizedMethod.contains("RFID")) {
            return new PaymentResult(
                    true,
                    txnId,
                    "PAID",
                    "MESS_WALLET",
                    "Simulated campus mess wallet / RFID deduction successful."
            );
        } else {
            // Default UPI
            return new PaymentResult(
                    true,
                    txnId,
                    "PAID",
                    "UPI",
                    "Simulated UPI payment verified successfully."
            );
        }
    }
}
