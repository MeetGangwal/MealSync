package com.mealsync.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

/**
 * Utility class for generating and validating JWT tokens using the JJWT 0.11.5 library.
 * The signing secret is read from the JWT_SECRET environment variable via application.yml.
 * Algorithm: HS256 (HMAC-SHA256) — a symmetric algorithm that uses a shared secret
 * to both sign and verify tokens.
 */
@Component
public class JwtUtils {

    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    /**
     * JWT signing secret injected from application.yml → ${JWT_SECRET} env var.
     * Must be at least 32 characters (256 bits) for HS256.
     */
    @Value("${jwt.secret}")
    private String jwtSecret;

    /**
     * Token validity window in milliseconds. Defaults to 86400000 (24 hours).
     */
    @Value("${jwt.expirationMs:86400000}")
    private long jwtExpirationMs;

    @jakarta.annotation.PostConstruct
    public void validateKey() {
        if (jwtSecret == null || jwtSecret.trim().isEmpty()) {
            throw new IllegalStateException("JWT signing secret (jwt.secret / JWT_SECRET) is missing or empty.");
        }
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                "JWT signing secret is too weak: only " + keyBytes.length + " bytes (" + (keyBytes.length * 8) + 
                " bits). HS256 requires at least 32 bytes (256 bits). Value was: '" + jwtSecret + "'."
            );
        }
    }

    /**
     * Derives a signing key from the secret string.
     */
    private Key signingKey() {
        // Use the raw bytes of the secret string as the HMAC key.
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generates a signed JWT for the given authenticated principal.
     *
     * @param authentication the authenticated user (principal name = email)
     * @return compact JWT string, e.g. "eyJhbGci..."
     */
    public String generateJwtToken(Authentication authentication) {
        String email = authentication.getName();
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(signingKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Extracts the username (email) from a validated JWT token.
     *
     * @param token compact JWT string
     * @return the subject (email address)
     */
    public String getUserEmailFromJwtToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    /**
     * Validates a JWT token. Returns false (and logs the reason) on any failure.
     *
     * @param token compact JWT string
     * @return true if valid and not expired, false otherwise
     */
    public boolean validateJwtToken(String token) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(signingKey())
                .build()
                .parseClaimsJws(token);
            return true;
        } catch (MalformedJwtException e) {
            logger.warn("JWT validation failed - malformed token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            logger.warn("JWT validation failed - token expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            logger.warn("JWT validation failed - unsupported token: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.warn("JWT validation failed - empty claims: {}", e.getMessage());
        } catch (JwtException e) {
            logger.warn("JWT validation failed: {}", e.getMessage());
        }
        return false;
    }
}
