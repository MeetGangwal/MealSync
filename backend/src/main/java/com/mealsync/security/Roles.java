package com.mealsync.security;

import java.util.List;

/**
 * Single source of truth for interpreting the {@code users.role} column.
 *
 * Stored values may come from older data in different spellings ("student", "admin",
 * "ROLE_USER", ...). Everything that reads a role — Spring Security authorities, controllers
 * and API responses — goes through {@link #normalize(String)} so they always agree.
 *
 * Roles are only ever assigned server-side: registration always stores {@link #USER};
 * {@link #ADMIN} is granted by an existing administrator or the operator bootstrap
 * (see {@code AdminBootstrap}), never by a client request.
 */
public final class Roles {

    public static final String USER = "ROLE_USER";
    public static final String ADMIN = "ROLE_ADMIN";

    private Roles() {
    }

    /** Uppercase, "ROLE_"-prefixed form of a stored role; missing/blank roles are treated as {@link #USER}. */
    public static String normalize(String rawRole) {
        if (rawRole == null || rawRole.isBlank()) return USER;
        String trimmed = rawRole.trim().toUpperCase();
        return trimmed.startsWith("ROLE_") ? trimmed : "ROLE_" + trimmed;
    }

    public static boolean isAdmin(String rawRole) {
        return ADMIN.equals(normalize(rawRole));
    }

    /**
     * Spring Security authorities for a stored role. Administrators also hold {@link #USER},
     * so one account can manage the mess and order food as a customer.
     */
    public static List<String> authorities(String rawRole) {
        String role = normalize(rawRole);
        return ADMIN.equals(role) ? List.of(ADMIN, USER) : List.of(role);
    }
}
