package com.mealsync.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Response body returned on successful login.
 * Contains only the information the frontend requires — never the password hash.
 */
@Data
@AllArgsConstructor
public class LoginResponse {
    /** Signed JWT — must be sent as "Authorization: Bearer <token>" on protected requests. */
    private String token;

    /** Database user ID (used by the frontend to fetch the user's orders). */
    private Long userId;

    /** Display name, e.g. "Meet Gangwal". */
    private String name;

    /** Email address used as the principal identifier. */
    private String email;

    /**
     * The user's role stored in the database, e.g. "ROLE_USER".
     * NOTE: this is informational only. All access decisions are enforced server-side.
     * Never trust a role received from the client.
     */
    private String role;
}
