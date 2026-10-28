package com.mealsync.security;

import com.mealsync.model.User;
import com.mealsync.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Spring Security UserDetailsService implementation.
 * Loads a user from the database by email (used as the username/principal).
 * Required by AuthenticationManager and AuthTokenFilter to authenticate users.
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    /**
     * Loads a user by email. Called by AuthenticationManager during login
     * and by AuthTokenFilter when validating JWT tokens on subsequent requests.
     *
     * @param email the email address used as username
     * @return Spring Security UserDetails wrapping the User entity
     * @throws UsernameNotFoundException if no user with the given email exists
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "User not found with email: " + email));

        // Safely normalize role (e.g. "student", "ROLE_USER", "admin") to GrantedAuthority
        String rawRole = user.getRole();
        String normalizedRole = "ROLE_USER";
        if (rawRole != null && !rawRole.isBlank()) {
            String trimmed = rawRole.trim();
            if (trimmed.startsWith("ROLE_")) {
                normalizedRole = trimmed.toUpperCase();
            } else {
                normalizedRole = "ROLE_" + trimmed.toUpperCase();
            }
        }

        SimpleGrantedAuthority authority = new SimpleGrantedAuthority(normalizedRole);

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())     // already BCrypt-hashed
                .authorities(List.of(authority))
                .build();
    }
}
