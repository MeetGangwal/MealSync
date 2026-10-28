package com.mealsync.config;

import com.mealsync.security.AuthTokenFilter;
import com.mealsync.security.JwtUtils;
import com.mealsync.security.UserDetailsServiceImpl;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Spring Security configuration:
 *  - Stateless JWT-based authentication (no server-side sessions).
 *  - BCrypt password hashing (strength 10, the default).
 *  - CSRF disabled (safe for stateless REST APIs using Authorization headers).
 *  - Centrally managed CORS policy supporting ports 5173, 5174, etc.
 *  - Public endpoints: /api/auth/** (register, login), GET /api/meals/**
 *  - Protected:        /api/orders/** requires USER, STUDENT, or ADMIN
 *                      /api/admin/** requires ADMIN
 *  - All others:       require any authenticated user
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Autowired
    private JwtUtils jwtUtils;

    // -----------------------------------------------------------------------
    // Beans
    // -----------------------------------------------------------------------

    /**
     * BCryptPasswordEncoder with default strength (10 rounds).
     * OWASP recommends salted adaptive hashing; BCrypt satisfies this requirement.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * DaoAuthenticationProvider wires our UserDetailsService and PasswordEncoder
     * into Spring Security's authentication infrastructure.
     */
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    /**
     * Exposes the AuthenticationManager bean so AuthController can call
     * authenticationManager.authenticate(...) directly.
     */
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    /**
     * The JWT filter that validates Bearer tokens on every request.
     * Constructed manually (not @Component) to avoid circular-bean issues.
     */
    @Bean
    public AuthTokenFilter authenticationJwtTokenFilter() {
        return new AuthTokenFilter(jwtUtils, userDetailsService);
    }

    // -----------------------------------------------------------------------
    // Security filter chain & CORS
    // -----------------------------------------------------------------------

    /**
     * Centrally managed CORS policy for local development and production.
     * Supports standard Vite dev server ports (5173, 5174, 5175, 3000)
     * as well as localhost origin patterns.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*"
        ));
        config.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "http://localhost:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174",
                "http://127.0.0.1:5175",
                "http://127.0.0.1:3000"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(false); // stateless JWT — no cookies

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Apply centrally managed CORS policy
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Disable CSRF — stateless JWT APIs don't use cookies/sessions
            .csrf(csrf -> csrf.disable())

            // Enforce stateless sessions — no HttpSession created by Spring Security
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Exception handling for unauthenticated (401) and forbidden (403) access
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Invalid email or password\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Access denied: insufficient permissions\"}");
                })
            )

            // Endpoint access rules
            .authorizeHttpRequests(auth -> auth
                // Allow CORS preflight requests without authentication
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Public: authentication endpoints (register, login)
                .requestMatchers("/api/auth/login", "/api/auth/register").permitAll()
                // Authenticated: user profile
                .requestMatchers("/api/auth/me", "/api/auth/profile").authenticated()
                // Public: read-only menu access (no token required to browse)
                .requestMatchers(HttpMethod.GET, "/api/meals/**").permitAll()
                // Payment simulation endpoints (methods list is public, processing requires student role)
                .requestMatchers(HttpMethod.GET, "/api/payments/methods").permitAll()
                .requestMatchers("/api/payments/**").hasAnyRole("USER", "STUDENT")
                // Admin: product management, admin orders, dashboard overview
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                // Protected: student order checkout & history (admins cannot place orders as students)
                .requestMatchers(HttpMethod.POST, "/api/orders").hasAnyRole("USER", "STUDENT")
                .requestMatchers("/api/orders/user/**").hasAnyRole("USER", "STUDENT")
                .requestMatchers(HttpMethod.PUT, "/api/orders/*/cancel").hasAnyRole("USER", "STUDENT", "ADMIN")
                .requestMatchers("/api/orders/**").hasAnyRole("USER", "STUDENT")
                // All other endpoints require authentication
                .anyRequest().authenticated()
            )

            // Wire up the DaoAuthenticationProvider
            .authenticationProvider(authenticationProvider())

            // Insert JWT filter before Spring's UsernamePasswordAuthenticationFilter
            .addFilterBefore(authenticationJwtTokenFilter(),
                UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
