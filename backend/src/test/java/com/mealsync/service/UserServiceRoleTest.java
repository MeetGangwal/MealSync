package com.mealsync.service;

import com.mealsync.model.User;
import com.mealsync.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceRoleTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @InjectMocks UserService userService;

    private static User user(long id, String email, String role) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setRole(role);
        return u;
    }

    @Test
    @DisplayName("The last administrator cannot be demoted")
    void lastAdminCannotBeDemoted() {
        User actor = user(1, "actor@example.com", "ROLE_ADMIN");
        User target = user(2, "target@example.com", "ROLE_ADMIN");
        when(userRepository.findAdminsForUpdate()).thenReturn(List.of(target));
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));
        when(userRepository.findByEmail("actor@example.com")).thenReturn(Optional.of(actor));

        assertThatThrownBy(() -> userService.changeRole("actor@example.com", 2L, "USER"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("last administrator");
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("An administrator cannot change their own role")
    void cannotChangeOwnRole() {
        User actor = user(1, "actor@example.com", "ROLE_ADMIN");
        when(userRepository.findAdminsForUpdate()).thenReturn(List.of(actor, user(3, "x@example.com", "ROLE_ADMIN")));
        when(userRepository.findById(1L)).thenReturn(Optional.of(actor));
        when(userRepository.findByEmail("actor@example.com")).thenReturn(Optional.of(actor));

        assertThatThrownBy(() -> userService.changeRole("actor@example.com", 1L, "USER"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("own role");
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Only ADMIN or USER can be assigned")
    void rejectsUnknownRole() {
        assertThatThrownBy(() -> userService.changeRole("a@example.com", 2L, "SUPERUSER"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> userService.changeRole("a@example.com", 2L, null))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(userRepository);
    }

    @Test
    @DisplayName("Promotion stores the normalized ROLE_ADMIN value")
    void promotesToAdmin() {
        User actor = user(1, "actor@example.com", "ROLE_ADMIN");
        User target = user(2, "target@example.com", "student");
        when(userRepository.findAdminsForUpdate()).thenReturn(List.of(actor));
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));
        when(userRepository.findByEmail("actor@example.com")).thenReturn(Optional.of(actor));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        assertThat(userService.changeRole("actor@example.com", 2L, "admin").getRole()).isEqualTo("ROLE_ADMIN");
    }

    @Test
    @DisplayName("Bootstrap requires an existing account and is idempotent")
    void bootstrapRules() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> userService.promoteBootstrapAdmin("Missing@Example.com"))
                .isInstanceOf(NoSuchElementException.class);

        User existingAdmin = user(5, "boss@example.com", "ROLE_ADMIN");
        when(userRepository.findByEmail("boss@example.com")).thenReturn(Optional.of(existingAdmin));
        assertThat(userService.promoteBootstrapAdmin("boss@example.com")).isFalse();
        verify(userRepository, never()).save(any());
    }
}
