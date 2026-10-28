package com.mealsync.config;

import com.mealsync.model.Meal;
import com.mealsync.model.User;
import com.mealsync.repository.MealRepository;
import com.mealsync.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private MealRepository mealRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${mealsync.seed.demo-users:true}")
    private boolean seedDemoUsers;

    @Override
    public void run(String... args) throws Exception {
        // Safe, idempotent seeding: adds products only if they don't already exist by name.
        // Existing catalogue data is preserved.

        // ── Thalis & Combos ────────────────────────────────────────────────────────
        seedMealIfAbsent("Maharashtrian Thali", "2 Sabji, Dal, 3 Chapati, Rice, Papad, Pickle & Sweet", "thali", 120.0, 50, true, "🍱");
        seedMealIfAbsent("Special Punjabi Thali", "Paneer Butter Masala, Dal Makhani, 2 Butter Roti, Jeera Rice, Gulab Jamun", "thali", 140.0, 40, true, "🍱");
        seedMealIfAbsent("Regular Student Thali", "Dal Tadka, Aloo Gobhi, 3 Roti, Steamed Rice & Salad", "thali", 65.0, 80, true, "🍛");
        seedMealIfAbsent("South Indian Thali", "Sambar, Rasam, Kootu, 2 Poori, Rice, Curd & Appalam", "thali", 95.0, 45, true, "🍱");
        seedMealIfAbsent("Mini Meal Thali", "Dal Khichdi or Rajma Rice with Curd & Papad", "thali", 55.0, 60, true, "🍲");

        // ── Snacks & Street Food ───────────────────────────────────────────────────
        seedMealIfAbsent("Vada Pav", "Mumbai's favorite spiced potato patty in a soft bun with dry garlic chutney", "snacks", 20.0, 100, true, "🍔");
        seedMealIfAbsent("Samosa (2 pcs)", "Crispy golden pastry stuffed with spiced potato & peas served with mint & imli chutney", "snacks", 30.0, 90, true, "🥟");
        seedMealIfAbsent("Misal Pav", "Spicy sprouted moth bean curry topped with farsan, onions & 2 butter pavs", "snacks", 55.0, 60, true, "🍲");
        seedMealIfAbsent("Pav Bhaji", "Mashed spiced vegetable curry with generous butter served with 2 toasted pavs", "snacks", 75.0, 50, true, "🥘");
        seedMealIfAbsent("Bread Pakora", "Deep-fried bread fritter stuffed with spiced potato masala", "snacks", 25.0, 50, true, "🥪");
        seedMealIfAbsent("Kachori (2 pcs)", "Flaky crispy round snack filled with spiced lentils served with sweet tamarind chutney", "snacks", 30.0, 50, true, "🥟");
        seedMealIfAbsent("Dhokla (4 pcs)", "Steamed savory fermented gram flour cakes tempered with mustard seeds & green chilies", "snacks", 35.0, 60, true, "🟡");
        seedMealIfAbsent("Veg Frankie", "Warm flatbread rolled with spiced crunchy vegetables, onions & tangy spices", "snacks", 50.0, 55, true, "🌯");
        seedMealIfAbsent("Paneer Roll", "Grilled paneer cubes marinated in tikka spices wrapped in a crisp paratha", "snacks", 75.0, 40, true, "🌯");
        seedMealIfAbsent("Veg Sandwich", "Fresh cucumber, tomato, potato, green chutney, and spiced butter in sandwich bread", "snacks", 35.0, 50, true, "🥪");
        seedMealIfAbsent("Grilled Cheese Sandwich", "Golden grilled sandwich loaded with gooey melted cheese, capsicum & herbs", "snacks", 65.0, 45, true, "🥪");
        seedMealIfAbsent("Veg Burger", "Crispy vegetable patty with lettuce, tomatoes, creamy mayo in a toasted sesame bun", "snacks", 60.0, 40, true, "🍔");
        seedMealIfAbsent("French Fries", "Crispy golden salted potato fries served with ketchup & spiced dip", "snacks", 55.0, 50, true, "🍟");
        seedMealIfAbsent("Classic Maggi", "Classic 2-minute masala noodles with green peas, carrots & aromatic masala", "snacks", 40.0, 70, true, "🍜");
        seedMealIfAbsent("Cheese Burst Maggi", "Masala Maggi loaded with molten mozzarella and processed cheese", "snacks", 60.0, 45, true, "🧀");

        // ── Breakfast & South Indian ───────────────────────────────────────────────
        seedMealIfAbsent("Poha", "Flattened rice tempered with mustard seeds, roasted peanuts, turmeric, onions & fresh coriander", "south-indian", 30.0, 75, true, "🍚");
        seedMealIfAbsent("Upma", "Savory semolina porridge tempered with ginger, mustard, curry leaves & roasted cashews", "south-indian", 30.0, 50, true, "🥣");
        seedMealIfAbsent("Idli Sambar (2 pcs)", "Steamed soft fluffy rice cakes served with hot vegetable sambar & coconut chutney", "south-indian", 40.0, 80, true, "⚪");
        seedMealIfAbsent("Medu Vada (2 pcs)", "Crispy golden lentil donuts served with piping hot sambar & fresh coconut chutney", "south-indian", 45.0, 60, true, "🍩");
        seedMealIfAbsent("Plain Dosa", "Crispy thin fermented crepe made of rice & lentils served with sambar & chutneys", "south-indian", 45.0, 50, true, "🥞");
        seedMealIfAbsent("Masala Dosa", "Crispy crepe stuffed with savory spiced potato masala served with sambar & chutney", "south-indian", 75.0, 60, true, "🥞");
        seedMealIfAbsent("Onion Uttapam", "Thick savory rice pancake topped with finely chopped onions, tomatoes & green chilies", "south-indian", 65.0, 40, true, "🍳");

        // ── Meals & Rice Bowls ─────────────────────────────────────────────────────
        seedMealIfAbsent("Rajma Rice Bowl", "Slow-cooked Kashmiri red kidney beans in thick gravy over fragrant basmati rice", "meals", 75.0, 50, true, "🍛");
        seedMealIfAbsent("Chole Rice Bowl", "Spicy Punjabi chickpeas simmered in aromatic gravy served over warm steamed rice", "meals", 70.0, 50, true, "🍛");
        seedMealIfAbsent("Dal Khichdi", "Homestyle comforting rice and moong dal tempered with cumin, garlic & desi ghee", "meals", 60.0, 45, true, "🍲");
        seedMealIfAbsent("Veg Pulao", "Aromatic basmati rice cooked with fresh seasonal vegetables, bay leaf & mild spices", "meals", 75.0, 40, true, "🍚");
        seedMealIfAbsent("Veg Dum Biryani", "Layered basmati rice with marinated vegetables and whole spices, served with raita", "meals", 95.0, 50, true, "🥘");
        seedMealIfAbsent("Paneer Butter Masala", "Soft cottage cheese cubes in rich tomato, butter, and cashew nut gravy", "meals", 130.0, 35, true, "🍛");
        seedMealIfAbsent("Curd Rice", "Tempered southern curd rice with mustard, ginger, curry leaves, and pomegranate", "meals", 45.0, 40, true, "🥣");
        seedMealIfAbsent("Steamed Rice", "Fluffy steamed long grain basmati rice", "meals", 25.0, 60, true, "🍚");

        // ── Beverages & Refreshers ─────────────────────────────────────────────────
        seedMealIfAbsent("Masala Chai", "Freshly brewed Indian tea with ginger, cardamom, clove, and milk", "beverages", 15.0, 150, true, "☕");
        seedMealIfAbsent("Filter Coffee", "Authentic South Indian chicory-blend frothed milk coffee", "beverages", 25.0, 90, true, "☕");
        seedMealIfAbsent("Cold Coffee", "Chilled thick blended coffee with vanilla ice cream drizzle", "beverages", 45.0, 80, true, "🥤");
        seedMealIfAbsent("Spiced Buttermilk (Chaas)", "Cooling churned yogurt drink with roasted cumin, mint, and black salt", "beverages", 20.0, 100, true, "🥛");
        seedMealIfAbsent("Fresh Lime Soda", "Fizzy club soda with fresh lime juice, black salt, and sugar syrup", "beverages", 30.0, 60, true, "🍹");
        seedMealIfAbsent("Mango Lassi", "Rich, sweet yogurt smoothie infused with alphonso mango pulp", "beverages", 45.0, 50, true, "🥭");
        seedMealIfAbsent("Gulab Jamun (2 pcs)", "Warm melt-in-mouth milk-solid dumplings soaked in rose-cardamom sugar syrup", "snacks", 30.0, 70, true, "🍮");

        // ── Default Demo Users (Safe & Idempotent, Environment-Configurable) ──────
        if (seedDemoUsers) {
            seedUserIfAbsent("Aryan Student", "aryan@spit.edu", "password123", "ROLE_USER");
            seedUserIfAbsent("Mess Admin", "admin@spit.mess", "admin123", "ROLE_ADMIN");
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
