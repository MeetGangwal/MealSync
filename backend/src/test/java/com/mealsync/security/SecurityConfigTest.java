package com.mealsync.security;

import com.mealsync.config.SecurityConfig;
import com.mealsync.controller.AdminController;
import com.mealsync.controller.AuthController;
import com.mealsync.controller.MealController;
import com.mealsync.controller.OrderController;
import com.mealsync.model.User;
import com.mealsync.repository.MealRepository;
import com.mealsync.repository.OrderRepository;
import com.mealsync.repository.UserRepository;
import com.mealsync.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {
        AuthController.class,
        MealController.class,
        OrderController.class,
        AdminController.class
})
@Import(SecurityConfig.class)
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @MockBean
    private JwtUtils jwtUtils;

    @MockBean
    private UserService userService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private MealRepository mealRepository;

    @MockBean
    private OrderRepository orderRepository;

    @MockBean
    private com.mealsync.service.PaymentService paymentService;

    @MockBean
    private AuthenticationManager authenticationManager;

    // ── Public Access Tests (No Token Required) ───────────────────────────────

    @Test
    @DisplayName("Security: POST /api/auth/login is publicly accessible without JWT token")
    void login_publiclyAccessible_returns200() throws Exception {
        Authentication mockAuth = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(mockAuth);
        when(jwtUtils.generateJwtToken(mockAuth)).thenReturn("mock.jwt.token");

        User user = new User();
        user.setId(1L);
        user.setName("Aryan");
        user.setEmail("aryan@spit.edu");
        user.setRole("ROLE_USER");
        when(userRepository.findByEmail("aryan@spit.edu")).thenReturn(Optional.of(user));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"aryan@spit.edu\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mock.jwt.token"))
                .andExpect(jsonPath("$.email").value("aryan@spit.edu"));
    }

    @Test
    @DisplayName("Security: GET /api/meals is publicly accessible without JWT token")
    void getMeals_publiclyAccessible_returns200() throws Exception {
        when(mealRepository.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/meals"))
                .andExpect(status().isOk());
    }

    // ── CORS from Port 5174 Tests ──────────────────────────────────────────────

    @Test
    @DisplayName("CORS: OPTIONS preflight from http://localhost:5174 is allowed")
    void cors_optionsPreflightFromPort5174_isAllowed() throws Exception {
        mockMvc.perform(options("/api/auth/login")
                        .header("Origin", "http://localhost:5174")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5174"));
    }

    @Test
    @DisplayName("CORS: POST /api/auth/login from http://localhost:5174 returns CORS header")
    void cors_postLoginFromPort5174_hasCorsHeader() throws Exception {
        Authentication mockAuth = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(mockAuth);
        when(jwtUtils.generateJwtToken(mockAuth)).thenReturn("mock.jwt.token");

        User user = new User();
        user.setId(1L);
        user.setName("Aryan");
        user.setEmail("aryan@spit.edu");
        user.setRole("ROLE_USER");
        when(userRepository.findByEmail("aryan@spit.edu")).thenReturn(Optional.of(user));

        mockMvc.perform(post("/api/auth/login")
                        .header("Origin", "http://localhost:5174")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"aryan@spit.edu\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5174"));
    }

    // ── Protected Endpoints Without Token ──────────────────────────────────────

    @Test
    @DisplayName("Security: POST /api/orders without token is rejected with 401 Unauthorized")
    void postOrders_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pickupSlot\":\"12:30 PM\",\"items\":[]}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Security: GET /api/admin/overview without token is rejected with 401 Unauthorized")
    void getAdminOverview_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/admin/overview"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Security: POST /api/auth/register is publicly accessible without token")
    void register_publiclyAccessible_returns201() throws Exception {
        User saved = new User();
        saved.setId(55L);
        saved.setName("New Student");
        saved.setEmail("new@spit.edu");
        saved.setRole("ROLE_USER");
        when(userService.registerUser(any())).thenReturn(saved);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"New Student\",\"email\":\"new@spit.edu\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").value(55L));
    }

    @Test
    @DisplayName("Security: Student token (ROLE_USER) cannot access /api/admin/overview -> 403 Forbidden")
    void adminOverview_withStudentToken_returns403Forbidden() throws Exception {
        when(jwtUtils.validateJwtToken("student.jwt")).thenReturn(true);
        when(jwtUtils.getUserEmailFromJwtToken("student.jwt")).thenReturn("student@spit.edu");

        org.springframework.security.core.userdetails.UserDetails studentDetails =
                org.springframework.security.core.userdetails.User
                        .withUsername("student@spit.edu")
                        .password("")
                        .authorities("ROLE_USER")
                        .build();
        when(userDetailsService.loadUserByUsername("student@spit.edu")).thenReturn(studentDetails);

        mockMvc.perform(get("/api/admin/overview")
                        .header("Authorization", "Bearer student.jwt"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security: Admin token (ROLE_ADMIN) can access /api/admin/overview -> 200 OK")
    void adminOverview_withAdminToken_returns200Ok() throws Exception {
        when(jwtUtils.validateJwtToken("admin.jwt")).thenReturn(true);
        when(jwtUtils.getUserEmailFromJwtToken("admin.jwt")).thenReturn("admin@spit.mess");

        org.springframework.security.core.userdetails.UserDetails adminDetails =
                org.springframework.security.core.userdetails.User
                        .withUsername("admin@spit.mess")
                        .password("")
                        .authorities("ROLE_ADMIN")
                        .build();
        when(userDetailsService.loadUserByUsername("admin@spit.mess")).thenReturn(adminDetails);

        when(orderRepository.findAllByOrderByOrderTimeDesc()).thenReturn(List.of());
        when(mealRepository.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/overview")
                        .header("Authorization", "Bearer admin.jwt"))
                .andExpect(status().isOk());
    }
}
