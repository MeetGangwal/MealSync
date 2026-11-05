package com.mealsync.config;

import com.mealsync.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.NoSuchElementException;

/**
 * Operator-controlled provisioning of the first mess administrator.
 *
 * Public registration only ever creates customer accounts. To grant the first administrator,
 * the operator (whoever controls the deployment configuration) sets
 * MEALSYNC_BOOTSTRAP_ADMIN_EMAIL to the email of an account that has already registered
 * through the normal sign-up form. On start-up that account is promoted to ROLE_ADMIN.
 * Further administrators are then managed in-app by an administrator (/api/admin/users).
 *
 * The account must already exist, so the bootstrap never creates credentials and never
 * needs a password in configuration. It is idempotent and safe with several replicas.
 */
@Component
public class AdminBootstrap implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserService userService;

    @Value("${mealsync.bootstrap.admin-email:}")
    private String bootstrapAdminEmail;

    public AdminBootstrap(UserService userService) {
        this.userService = userService;
    }

    @Override
    public void run(String... args) {
        if (bootstrapAdminEmail == null || bootstrapAdminEmail.isBlank()) {
            logger.info("MEALSYNC_BOOTSTRAP_ADMIN_EMAIL is not set; skipping administrator bootstrap");
            return;
        }
        try {
            if (!userService.promoteBootstrapAdmin(bootstrapAdminEmail)) {
                logger.info("Bootstrap administrator account is already an administrator");
            }
        } catch (NoSuchElementException e) {
            logger.warn("MEALSYNC_BOOTSTRAP_ADMIN_EMAIL is set but no account with that email has registered yet; "
                    + "register it through the normal sign-up form and restart the backend.");
        }
    }
}
