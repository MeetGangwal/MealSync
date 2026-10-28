package com.mealsync.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentServiceTest {

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService();
    }

    @Test
    @DisplayName("UPI: Returns PAID status with transaction id")
    void processPayment_upi_returnsPaid() {
        PaymentService.PaymentResult result = paymentService.processPayment("UPI", 150.0);

        assertThat(result.success()).isTrue();
        assertThat(result.paymentMethod()).isEqualTo("UPI");
        assertThat(result.paymentStatus()).isEqualTo("PAID");
        assertThat(result.transactionId()).startsWith("TXN_SIM_");
    }

    @Test
    @DisplayName("Card: Returns PAID status with transaction id")
    void processPayment_card_returnsPaid() {
        PaymentService.PaymentResult result = paymentService.processPayment("Card", 250.0);

        assertThat(result.success()).isTrue();
        assertThat(result.paymentMethod()).isEqualTo("CARD");
        assertThat(result.paymentStatus()).isEqualTo("PAID");
        assertThat(result.transactionId()).startsWith("TXN_SIM_");
    }

    @Test
    @DisplayName("Mess Wallet: Returns PAID status with transaction id")
    void processPayment_wallet_returnsPaid() {
        PaymentService.PaymentResult result = paymentService.processPayment("Mess Wallet", 75.0);

        assertThat(result.success()).isTrue();
        assertThat(result.paymentMethod()).isEqualTo("MESS_WALLET");
        assertThat(result.paymentStatus()).isEqualTo("PAID");
        assertThat(result.transactionId()).startsWith("TXN_SIM_");
    }

    @Test
    @DisplayName("Cash: Returns PENDING_CASH status")
    void processPayment_cash_returnsPendingCash() {
        PaymentService.PaymentResult result = paymentService.processPayment("Cash (at counter)", 120.0);

        assertThat(result.success()).isTrue();
        assertThat(result.paymentMethod()).isEqualTo("CASH");
        assertThat(result.paymentStatus()).isEqualTo("PENDING_CASH");
        assertThat(result.transactionId()).startsWith("TXN_SIM_");
    }

    @Test
    @DisplayName("Null method: Defaults to UPI with PAID status")
    void processPayment_nullMethod_defaultsToUpi() {
        PaymentService.PaymentResult result = paymentService.processPayment(null, 50.0);

        assertThat(result.success()).isTrue();
        assertThat(result.paymentMethod()).isEqualTo("UPI");
        assertThat(result.paymentStatus()).isEqualTo("PAID");
    }
}
