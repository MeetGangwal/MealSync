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

        // Role comes from the database on every request (not from the JWT), so role changes
        // take effect immediately. Administrators also receive ROLE_USER (see Roles).
        List<SimpleGrantedAuthority> authorities = Roles.authorities(user.getRole()).stream()
                .map(SimpleGrantedAuthority::new)
                .toList();

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())     // already BCrypt-hashed
                .authorities(authorities)
                .build();
    }
}
