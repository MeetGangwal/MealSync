package com.mealsync.controller;

import com.mealsync.dto.LoginResponse;
import com.mealsync.dto.RegisterRequest;
import com.mealsync.model.User;
import com.mealsync.repository.UserRepository;
import com.mealsync.security.JwtUtils;
import com.mealsync.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtUtils jwtUtils;

    @InjectMocks
    private AuthController authController;

    private User sampleUser;
    private Authentication mockAuth;

    @BeforeEach
    void setUp() {
        sampleUser = new User();
        sampleUser.setId(10L);
        sampleUser.setName("Aryan Student");
        sampleUser.setEmail("aryan@spit.edu");
        sampleUser.setRole("ROLE_USER");
        sampleUser.setPassword("$2a$10$hashedpassword");

        mockAuth = mock(Authentication.class);
    }

    // ── Login Tests ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Login: succeeds with valid credentials and returns JWT plus user metadata")
    void login_validCredentials_returnsTokenAndUserInfo() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(mockAuth);
        when(jwtUtils.generateJwtToken(mockAuth)).thenReturn("mock.jwt.token");
        when(userRepository.findByEmail("aryan@spit.edu")).thenReturn(Optional.of(sampleUser));

        Map<String, String> request = Map.of(
                "email", "aryan@spit.edu",
                "password", "password123"
        );

        ResponseEntity<?> response = authController.login(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isInstanceOf(LoginResponse.class);

        LoginResponse body = (LoginResponse) response.getBody();
        assertThat(body.getToken()).isEqualTo("mock.jwt.token");
        assertThat(body.getUserId()).isEqualTo(10L);
        assertThat(body.getName()).isEqualTo("Aryan Student");
        assertThat(body.getEmail()).isEqualTo("aryan@spit.edu");
        assertThat(body.getRole()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("Login: trims and normalizes email casing")
    void login_whitespaceAndUpperCaseEmail_normalizesAndSucceeds() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(mockAuth);
        when(jwtUtils.generateJwtToken(mockAuth)).thenReturn("mock.jwt.token");
        when(userRepository.findByEmail("aryan@spit.edu")).thenReturn(Optional.of(sampleUser));

        Map<String, String> request = Map.of(
                "email", "  ARYAN@SPIT.EDU  ",
                "password", "password123"
        );

        ResponseEntity<?> response = authController.login(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(userRepository).findByEmail("aryan@spit.edu");
    }

    @Test
    @DisplayName("Login: returns 401 Unauthorized on invalid password")
    void login_invalidPassword_returns401() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        Map<String, String> request = Map.of(
                "email", "aryan@spit.edu",
                "password", "wrongpassword"
        );

        ResponseEntity<?> response = authController.login(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isInstanceOf(Map.class);

        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertThat(body.get("error")).isEqualTo("Invalid email or password");
    }

    @Test
    @DisplayName("Login: returns 400 Bad Request when email is missing")
    void login_missingEmail_returns400() {
        Map<String, String> request = Map.of("password", "password123");

        ResponseEntity<?> response = authController.login(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isInstanceOf(Map.class);

        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertThat(body.get("error")).isEqualTo("Email and password are required");
    }

    @Test
    @DisplayName("Login: returns 400 Bad Request when password is missing")
    void login_missingPassword_returns400() {
        Map<String, String> request = Map.of("email", "aryan@spit.edu");

        ResponseEntity<?> response = authController.login(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Login: returns 400 Bad Request when email is blank")
    void login_blankEmail_returns400() {
        Map<String, String> request = Map.of("email", "   ", "password", "password123");

        ResponseEntity<?> response = authController.login(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ── Registration Tests ─────────────────────────────────────────────────────

    @Test
    @DisplayName("Register: succeeds with valid input and returns 201 Created")
    void register_validInput_returns201() {
        RegisterRequest req = new RegisterRequest();
        req.setName("New Student");
        req.setEmail("new@spit.edu");
        req.setPassword("securePass123");

        User created = new User();
        created.setId(99L);
        created.setName("New Student");
        created.setEmail("new@spit.edu");
        created.setRole("ROLE_USER");

        when(userService.registerUser(any(RegisterRequest.class))).thenReturn(created);

        ResponseEntity<?> response = authController.register(req);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isInstanceOf(Map.class);

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertThat(body.get("message")).isEqualTo("User registered successfully!");
        assertThat(body.get("userId")).isEqualTo(99L);
    }

    @Test
    @DisplayName("Register: duplicate email returns 409 Conflict")
    void register_duplicateEmail_returns409Conflict() {
        RegisterRequest req = new RegisterRequest();
        req.setName("Duplicate User");
        req.setEmail("existing@spit.edu");
        req.setPassword("password123");

        when(userService.registerUser(any(RegisterRequest.class)))
                .thenThrow(new RuntimeException("Email is already registered!"));

        ResponseEntity<?> response = authController.register(req);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isInstanceOf(Map.class);

        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertThat(body.get("error")).contains("already exists");
    }

    @Test
    @DisplayName("Register: invalid input returns 400 Bad Request")
    void register_validationFailure_returns400BadRequest() {
        RegisterRequest req = new RegisterRequest();
        req.setName("");
        req.setEmail("invalid");
        req.setPassword("123");

        when(userService.registerUser(any(RegisterRequest.class)))
                .thenThrow(new IllegalArgumentException("Name is required"));

        ResponseEntity<?> response = authController.register(req);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ── Current User Profile Tests ────────────────────────────────────────────

    @Test
    @DisplayName("GET /auth/me: authenticated user returns user profile")
    void getCurrentUser_authenticated_returnsProfile() {
        when(mockAuth.isAuthenticated()).thenReturn(true);
        when(mockAuth.getName()).thenReturn("aryan@spit.edu");
        when(userRepository.findByEmail("aryan@spit.edu")).thenReturn(Optional.of(sampleUser));

        ResponseEntity<?> response = authController.getCurrentUser(mockAuth);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertThat(body.get("email")).isEqualTo("aryan@spit.edu");
        assertThat(body.get("userId")).isEqualTo(10L);
        assertThat(body.get("role")).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("GET /auth/me: unauthenticated request returns 401")
    void getCurrentUser_unauthenticated_returns401() {
        ResponseEntity<?> response = authController.getCurrentUser(null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
