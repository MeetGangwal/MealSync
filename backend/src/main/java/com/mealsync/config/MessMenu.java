package com.mealsync.config;

import com.mealsync.model.Meal;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The mess's printed menu for the other-dishes counter (items 1–81; the card has no item 66).
 * Names and prices follow the card, with obvious misprints corrected ("Crisy", "Tripple", "Haka").
 * Thalis are served at the thali counter and seeded separately.
 */
final class MessMenu {

    record Dish(String category, String name, double price) {}

    /** Starting stock for newly seeded dishes; the mess sets real quantities in the Product catalog. */
    static final int DEFAULT_STOCK = 50;

    static final List<Dish> OTHER_DISHES = List.of(
            // Accompaniments
            new Dish("accompaniments", "Green Salad", 23),
            new Dish("accompaniments", "Veg Raita", 38),
            new Dish("accompaniments", "Boondi Raita", 38),
            new Dish("accompaniments", "Plain Curd", 32),
            new Dish("accompaniments", "Roasted / Fried Papad", 8),
            new Dish("accompaniments", "Masala Papad", 15),
            // Soups
            new Dish("soups", "Veg Sweet Corn Soup", 63),
            new Dish("soups", "Veg Manchow Soup", 53),
            new Dish("soups", "Hot & Sour Soup", 53),
            new Dish("soups", "Vegetable Clear Soup", 53),
            new Dish("soups", "Tomato Soup", 63),
            new Dish("soups", "Palak Soup", 63),
            // Chinese starters
            new Dish("chinese-starters", "Crispy Veg", 69),
            new Dish("chinese-starters", "Paneer Szechwan Dry", 110),
            new Dish("chinese-starters", "Paneer Chilly Dry", 110),
            new Dish("chinese-starters", "Mushroom Chilly Dry", 96),
            new Dish("chinese-starters", "Veg Manchurian Dry", 63),
            new Dish("chinese-starters", "Potato Chilli Dry", 95),
            new Dish("chinese-starters", "Soyabean Chilli Dry", 105),
            new Dish("chinese-starters", "Paneer Crispy", 126),
            // Vegetables
            new Dish("vegetables", "Aloo Jeera", 53),
            new Dish("vegetables", "Dal Fry", 40),
            new Dish("vegetables", "Chana Masala", 69),
            new Dish("vegetables", "Rajma Masala", 75),
            new Dish("vegetables", "Dal Handi", 58),
            new Dish("vegetables", "Dal Makhani", 63),
            new Dish("vegetables", "Dal Hariyali", 58),
            new Dish("vegetables", "Bhindi Masala Dry", 81),
            new Dish("vegetables", "Aloo Gobi Tomato Masala", 69),
            new Dish("vegetables", "Paneer Kadai", 96),
            new Dish("vegetables", "Veg Kolhapuri", 77),
            new Dish("vegetables", "Veg Makhanwala", 81),
            new Dish("vegetables", "Veg Handi", 81),
            new Dish("vegetables", "Egg Masala", 58),
            new Dish("vegetables", "Paneer Palak", 83),
            new Dish("vegetables", "Paneer Mutter", 81),
            new Dish("vegetables", "Paneer Makhanwala", 95),
            new Dish("vegetables", "Mushroom Mutter", 83),
            new Dish("vegetables", "Paneer Masala", 86),
            new Dish("vegetables", "Veg Kadai", 76),
            new Dish("vegetables", "Aloo Methi", 58),
            new Dish("vegetables", "Paneer Kalamiri", 98),
            new Dish("vegetables", "Aloo Palak", 84),
            new Dish("vegetables", "Veg Jaipuri", 95),
            new Dish("vegetables", "Veg Amritsari", 95),
            new Dish("vegetables", "Paneer Amritsari", 105),
            new Dish("vegetables", "Veg Kofta", 95),
            new Dish("vegetables", "Paneer Kofta", 105),
            new Dish("vegetables", "Veg Hyderabadi", 95),
            new Dish("vegetables", "Paneer Bhurji", 126),
            // Chapati / paratha
            new Dish("breads", "Chapati", 7),
            new Dish("breads", "Ghee Chapati", 8),
            new Dish("breads", "Aloo Paratha Tawa", 46),
            new Dish("breads", "Paneer Paratha Tawa", 69),
            // Rice & noodles
            new Dish("rice-noodles", "Veg Fried Rice", 83),
            new Dish("rice-noodles", "Veg Szechwan Fried Rice", 95),
            new Dish("rice-noodles", "Mushroom Fried Rice", 95),
            new Dish("rice-noodles", "Veg Hakka Noodles", 83),
            new Dish("rice-noodles", "Veg Szechwan Noodles", 92),
            new Dish("rice-noodles", "Egg Hakka Noodles", 102),
            new Dish("rice-noodles", "Egg Fried Rice", 116),
            new Dish("rice-noodles", "Egg Szechwan Fried Rice", 116),
            new Dish("rice-noodles", "Egg Szechwan Noodles", 127),
            new Dish("rice-noodles", "Paneer Manchurian", 105),
            new Dish("rice-noodles", "Mushroom Manchurian", 83),
            new Dish("rice-noodles", "Veg Manchurian Rice", 116),
            new Dish("rice-noodles", "Garlic Fried Rice", 95),
            new Dish("rice-noodles", "Veg Triple Rice", 147),
            new Dish("rice-noodles", "Veg Triple Noodles", 147),
            // Rice
            new Dish("rice", "Steam Rice", 46),
            new Dish("rice", "Jeera Rice", 63),
            new Dish("rice", "Peas Pulav", 63),
            new Dish("rice", "Veg Pulav", 63),
            new Dish("rice", "Veg Biryani", 63),
            new Dish("rice", "Egg Biryani", 63),
            new Dish("rice", "Dal Khichdi", 83),
            new Dish("rice", "Curd Rice", 69),
            new Dish("rice", "Soyabean Biryani", 69),
            new Dish("rice", "Paneer Biryani", 84),
            new Dish("rice", "Paneer Khichdi", 74));

    /** Categories of the earlier demo catalogue, replaced by the printed menu. */
    static final Set<String> LEGACY_CATEGORIES = Set.of("snacks", "south-indian", "meals", "beverages");

    /** Category for demo dishes taken off the menu; rows are kept because past orders refer to them. */
    static final String RETIRED = "retired";

    /**
     * One-time move from the demo catalogue to the printed menu, applied to dishes still in a legacy
     * category: a dish that is on the card takes the card's category and price; any other is retired
     * and hidden. Changed rows leave the legacy categories, so later edits are never overwritten.
     *
     * @return the meals that were changed (to be saved)
     */
    static List<Meal> reconcileLegacy(List<Meal> meals) {
        Map<String, Dish> byName = OTHER_DISHES.stream()
                .collect(Collectors.toMap(d -> d.name().toLowerCase(), Function.identity()));
        List<Meal> changed = new ArrayList<>();
        for (Meal meal : meals) {
            if (meal.getCategory() == null || !LEGACY_CATEGORIES.contains(meal.getCategory())) continue;
            Dish dish = meal.getName() == null ? null : byName.get(meal.getName().trim().toLowerCase());
            if (dish != null) {
                meal.setCategory(dish.category());
                meal.setPrice(dish.price());
            } else {
                meal.setCategory(RETIRED);
                meal.setIsAvailable(false);
            }
            changed.add(meal);
        }
        return changed;
    }

    private MessMenu() {
    }
}
