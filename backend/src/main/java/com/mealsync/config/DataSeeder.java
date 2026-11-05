package com.mealsync.config;

import com.mealsync.model.Meal;
import com.mealsync.model.SubscriptionPlan;
import com.mealsync.model.PickupSlot;
import com.mealsync.model.User;
import com.mealsync.repository.MealRepository;
import com.mealsync.repository.SubscriptionPlanRepository;
import com.mealsync.repository.PickupSlotRepository;
import com.mealsync.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private MealRepository mealRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubscriptionPlanRepository planRepository;

    @Autowired
    private PickupSlotRepository slotRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final Logger logger = LoggerFactory.getLogger(DataSeeder.class);

    /** Demo accounts are opt-in (MEALSYNC_SEED_DEMO_USERS=true); never enabled by default. */
    @Value("${mealsync.seed.demo-users:false}")
    private boolean seedDemoUsers;

    @Value("${mealsync.seed.demo-student-password:}")
    private String demoStudentPassword;

    @Value("${mealsync.seed.demo-admin-password:}")
    private String demoAdminPassword;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private static final String SEED_LOCK = "mealsync_seed";
    private static final int SEED_LOCK_TIMEOUT_SECONDS = 120;

    /**
     * Several backend replicas can start at the same time (e.g. Kubernetes), and the
     * check-then-insert seeding below is not safe to run concurrently. A MySQL named lock,
     * held on a dedicated connection, serializes it; the lock is released only after the
     * seed transaction has committed, so the next replica sees the rows already inserted.
     */
    @Override
    public void run(String... args) throws Exception {
        try (Connection lockConnection = dataSource.getConnection()) {
            acquireSeedLock(lockConnection);
            try {
                new TransactionTemplate(transactionManager).executeWithoutResult(status -> seed());
            } finally {
                releaseSeedLock(lockConnection);
            }
        }
    }

    private void acquireSeedLock(Connection connection) throws SQLException {
        try (PreparedStatement ps = connection.prepareStatement("SELECT GET_LOCK(?, ?)")) {
            ps.setString(1, SEED_LOCK);
            ps.setInt(2, SEED_LOCK_TIMEOUT_SECONDS);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next() || rs.getInt(1) != 1) {
                    throw new IllegalStateException("Timed out waiting for the data-seeding lock");
                }
            }
        }
    }

    private void releaseSeedLock(Connection connection) throws SQLException {
        try (PreparedStatement ps = connection.prepareStatement("SELECT RELEASE_LOCK(?)")) {
            ps.setString(1, SEED_LOCK);
            ps.execute();
        }
    }

    private void seed() {
        // Safe, idempotent seeding: adds products only if they don't already exist by name.
        // Existing catalogue data is preserved.

        // ── Thalis & Combos ────────────────────────────────────────────────────────
        seedMealIfAbsent("Maharashtrian Thali", "2 Sabji, Dal, 3 Chapati, Rice, Papad, Pickle & Sweet", "thali", 120.0, 50, true, "🍱");
        seedMealIfAbsent("Special Punjabi Thali", "Paneer Butter Masala, Dal Makhani, 2 Butter Roti, Jeera Rice, Gulab Jamun", "thali", 140.0, 40, true, "🍱");
        seedMealIfAbsent("Regular Student Thali", "Dal Tadka, Aloo Gobhi, 3 Roti, Steamed Rice & Salad", "thali", 65.0, 80, true, "🍛");
        seedMealIfAbsent("South Indian Thali", "Sambar, Rasam, Kootu, 2 Poori, Rice, Curd & Appalam", "thali", 95.0, 45, true, "🍱");
        seedMealIfAbsent("Mini Meal Thali", "Dal Khichdi or Rajma Rice with Curd & Papad", "thali", 55.0, 60, true, "🍲");

        // ── Other-dishes counter: the mess's printed menu (see MessMenu) ────────────
        // Earlier demo dishes are no longer seeded; existing rows stay (order history refers to them).
        for (MessMenu.Dish dish : MessMenu.OTHER_DISHES) {
            seedMealIfAbsent(dish.name(), null, dish.category(), dish.price(), MessMenu.DEFAULT_STOCK, true, null);
        }
        List<Meal> reconciled = MessMenu.reconcileLegacy(mealRepository.findAll());
        if (!reconciled.isEmpty()) {
            mealRepository.saveAll(reconciled);
            logger.info("Menu update: {} earlier demo dishes reconciled with the printed menu (retired or repriced).", reconciled.size());
        }

        // ── Subscription plan catalogue ────────────────────────────────────────────
        // Names, prices, meals and days match the plans already shown in the UI. Meal counts
        // for the last three are derived from their serving days (Mon–Sat ≈ 26, 2 × 22, 3 × 30).
        seedPlanIfAbsent("MONTHLY_LUNCH", "Monthly Lunch", "Weekday lunch", "Lunch", "1-5", 22, 1200.0);
        seedPlanIfAbsent("MONTHLY_DINNER", "Monthly Dinner", "Weekday dinner", "Dinner", "1-5", 22, 1400.0);
        seedPlanIfAbsent("BREAKFAST_ONLY", "Breakfast Only", "Daily morning breakfast", "Breakfast", "1-6", 26, 800.0);
        seedPlanIfAbsent("LUNCH_DINNER", "Lunch + Dinner", "Both meals, best value", "Lunch + Dinner", "1-5", 44, 2400.0);
        seedPlanIfAbsent("FULL_BOARD", "Full Board", "All three meals daily", "Breakfast + Lunch + Dinner", "1-7", 90, 3200.0);

        // ── Pickup slots (same windows the UI used to hard-code; capacity enforced server-side) ──
        seedSlotIfAbsent("7:30 – 7:45", "breakfast", "07:30", "07:45", 40);
        seedSlotIfAbsent("7:45 – 8:00", "breakfast", "07:45", "08:00", 40);
        seedSlotIfAbsent("12:30 – 12:45", "lunch", "12:30", "12:45", 50);
        seedSlotIfAbsent("12:45 – 1:00", "lunch", "12:45", "13:00", 50);
        seedSlotIfAbsent("1:00 – 1:15", "lunch", "13:00", "13:15", 50);
        seedSlotIfAbsent("1:15 – 1:30", "lunch", "13:15", "13:30", 50);
        seedSlotIfAbsent("7:30 – 7:45 PM", "dinner", "19:30", "19:45", 50);
        seedSlotIfAbsent("7:45 – 8:00 PM", "dinner", "19:45", "20:00", 50);

        // ── Demo Users (explicit opt-in only; passwords come from the environment) ──
        if (seedDemoUsers) {
            if (demoStudentPassword.isBlank() || demoAdminPassword.isBlank()) {
                logger.warn("Demo user seeding is enabled but MEALSYNC_DEMO_STUDENT_PASSWORD or "
                        + "MEALSYNC_DEMO_ADMIN_PASSWORD is not set; skipping demo users.");
            } else {
                seedUserIfAbsent("Aryan Student", "aryan@spit.edu", demoStudentPassword, "ROLE_USER");
                seedUserIfAbsent("Mess Admin", "admin@spit.mess", demoAdminPassword, "ROLE_ADMIN");
                logger.info("Demo users seeded (opt-in).");
            }
        }
    }

    private void seedUserIfAbsent(String name, String email, String rawPassword, String role) {
        var existing = userRepository.findByEmail(email.toLowerCase());
        if (existing.isEmpty()) {
            User user = new User();
            user.setName(name);
            user.setEmail(email.toLowerCase());
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setRole(role);
            user.setPhone(role.contains("ADMIN") ? "+91 98765 43215" : "+91 98765 43210");
            user.setUid(role.contains("ADMIN") ? "ADMIN001" : "2025510014");
            userRepository.save(user);
        } else {
            User user = existing.get();
            boolean modified = false;
            if (!role.equalsIgnoreCase(user.getRole())) {
                user.setRole(role);
                modified = true;
            }
            if (rawPassword != null && !passwordEncoder.matches(rawPassword, user.getPassword())) {
                user.setPassword(passwordEncoder.encode(rawPassword));
                modified = true;
            }
            if (user.getPhone() == null || user.getPhone().isBlank()) {
                user.setPhone(role.contains("ADMIN") ? "+91 98765 43215" : "+91 98765 43210");
                modified = true;
            }
            if (user.getUid() == null || user.getUid().isBlank()) {
                user.setUid(role.contains("ADMIN") ? "ADMIN001" : "2025510014");
                modified = true;
            }
            if (modified) {
                userRepository.save(user);
            }
        }
    }

    private void seedSlotIfAbsent(String label, String period, String start, String end, int capacity) {
        if (!slotRepository.existsByLabel(label)) {
            PickupSlot slot = new PickupSlot();
            slot.setLabel(label);
            slot.setMealPeriod(period);
            slot.setStartTime(java.time.LocalTime.parse(start));
            slot.setEndTime(java.time.LocalTime.parse(end));
            slot.setCapacity(capacity);
            slot.setActive(true);
            slotRepository.save(slot);
        }
    }

    private void seedPlanIfAbsent(String code, String name, String description, String meals,
                                  String servingDays, int mealsPerPeriod, double monthlyPrice) {
        if (!planRepository.existsByCode(code)) {
            SubscriptionPlan plan = new SubscriptionPlan();
            plan.setCode(code);
            plan.setName(name);
            plan.setDescription(description);
            plan.setMeals(meals);
            plan.setServingDays(servingDays);
            plan.setMealsPerPeriod(mealsPerPeriod);
            plan.setMonthlyPrice(monthlyPrice);
            plan.setActive(true);
            planRepository.save(plan);
        }
    }

    private void seedMealIfAbsent(String name, String description, String category, Double price, Integer quantity, Boolean isAvailable, String imageUrl) {
        if (!mealRepository.existsByName(name)) {
            Meal meal = new Meal();
            meal.setName(name);
            meal.setDescription(description);
            meal.setCategory(category);
            meal.setPrice(price);
            meal.setAvailableQuantity(quantity);
            meal.setIsAvailable(isAvailable);
            meal.setImageUrl(imageUrl);
            mealRepository.save(meal);
        }
    }
}
