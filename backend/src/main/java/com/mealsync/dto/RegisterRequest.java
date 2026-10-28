package com.mealsync.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Safe registration request DTO.
 * Accepts only the fields users are allowed to provide.
 * Role is deliberately excluded — it is always forced to ROLE_USER server-side.
 */
@Data
@NoArgsConstructor
public class RegisterRequest {
    private String name;
    private String email;
    private String password;
}
