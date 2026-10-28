package com.mealsync.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for JwtUtils.
 * Tests token generation, parsing and validation without any Spring context.
 * Uses a fixed test secret of sufficient length (≥32 chars for HS256).
 */
class JwtUtilsTest {

    private JwtUtils jwtUtils;

    // Minimum 32-character test secret (NEVER use in production)
    private static final String TEST_SECRET = "test-secret-key-minimum-32-chars-padding";

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(jwtUtils, "jwtSecret", TEST_SECRET);
        ReflectionTestUtils.setField(jwtUtils, "jwtExpirationMs", 3600000L); // 1 hour
    }

    private Authentication mockAuthentication(String email) {
        return new UsernamePasswordAuthenticationToken(
                email, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    // ── Token generation ─────────────────────────────────────────────────────

    @Test
    @DisplayName("JWT: generateJwtToken returns a non-null, non-empty token string")
    void generateToken_returnsNonEmptyString() {
        Authentication auth = mockAuthentication("user@test.com");
        String token = jwtUtils.generateJwtToken(auth);
        assertThat(token).isNotNull().isNotEmpty();
    }

    @Test
    @DisplayName("JWT: generated token has three dot-separated parts (header.payload.signature)")
    void generateToken_hasThreeParts() {
        Authentication auth = mockAuthentication("user@test.com");
        String token = jwtUtils.generateJwtToken(auth);
        assertThat(token.split("\\.")).hasSize(3);
    }

    // ── Subject extraction ───────────────────────────────────────────────────

    @Test
    @DisplayName("JWT: subject extracted from token matches the email used to generate it")
    void getEmail_matchesOriginalEmail() {
        String email = "alice@example.com";
        Authentication auth = mockAuthentication(email);
        String token = jwtUtils.generateJwtToken(auth);
        assertThat(jwtUtils.getUserEmailFromJwtToken(token)).isEqualTo(email);
    }

    // ── Validation: valid token ───────────────────────────────────────────────

    @Test
    @DisplayName("JWT: fresh token is valid")
    void validateToken_freshToken_returnsTrue() {
        Authentication auth = mockAuthentication("user@test.com");
        String token = jwtUtils.generateJwtToken(auth);
        assertThat(jwtUtils.validateJwtToken(token)).isTrue();
    }

    // ── Validation: tampered token ────────────────────────────────────────────

    @Test
    @DisplayName("JWT: token with tampered signature is rejected")
    void validateToken_tamperedSignature_returnsFalse() {
        Authentication auth = mockAuthentication("user@test.com");
        String token = jwtUtils.generateJwtToken(auth);

        // Replace the last 4 characters of the signature to simulate tampering
        String tampered = token.substring(0, token.length() - 4) + "XXXX";
        assertThat(jwtUtils.validateJwtToken(tampered)).isFalse();
    }

    @Test
    @DisplayName("JWT: completely malformed string is rejected")
    void validateToken_malformedString_returnsFalse() {
        assertThat(jwtUtils.validateJwtToken("this.is.not.valid")).isFalse();
    }

    @Test
    @DisplayName("JWT: empty string is rejected")
    void validateToken_emptyString_returnsFalse() {
        assertThat(jwtUtils.validateJwtToken("")).isFalse();
    }

    @Test
    @DisplayName("JWT: null-like blank string is rejected")
    void validateToken_blankString_returnsFalse() {
        assertThat(jwtUtils.validateJwtToken("   ")).isFalse();
    }

    // ── Validation: expired token ─────────────────────────────────────────────

    @Test
    @DisplayName("JWT: token with negative expiry (already expired) is rejected")
    void validateToken_expiredToken_returnsFalse() {
        // Create a JwtUtils instance that issues tokens already expired
        JwtUtils expiredUtils = new JwtUtils();
        ReflectionTestUtils.setField(expiredUtils, "jwtSecret", TEST_SECRET);
        ReflectionTestUtils.setField(expiredUtils, "jwtExpirationMs", -1L); // expires in past

        Authentication auth = mockAuthentication("user@test.com");
        String expiredToken = expiredUtils.generateJwtToken(auth);

        // Validate with the normal JwtUtils (same secret, checks expiry)
        assertThat(jwtUtils.validateJwtToken(expiredToken)).isFalse();
    }

    // ── Token signed with different secret ────────────────────────────────────

    @Test
    @DisplayName("JWT: token signed with a different secret is rejected")
    void validateToken_differentSecret_returnsFalse() {
        JwtUtils otherUtils = new JwtUtils();
        ReflectionTestUtils.setField(otherUtils, "jwtSecret", "completely-different-secret-key-32chars");
        ReflectionTestUtils.setField(otherUtils, "jwtExpirationMs", 3600000L);

        Authentication auth = mockAuthentication("user@test.com");
        String tokenFromOther = otherUtils.generateJwtToken(auth);

        // Our jwtUtils (different secret) should reject it
        assertThat(jwtUtils.validateJwtToken(tokenFromOther)).isFalse();
    }
}
