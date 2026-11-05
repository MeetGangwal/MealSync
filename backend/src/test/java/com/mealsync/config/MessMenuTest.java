package com.mealsync.config;

import com.mealsync.model.Meal;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class MessMenuTest {

    private static final Set<String> CATEGORIES =
            Set.of("accompaniments", "soups", "chinese-starters", "vegetables", "breads", "rice-noodles", "rice");

    @Test
    void matchesThePrintedCard() {
        // Items 1–81 on the card, which has no item 66
        assertThat(MessMenu.OTHER_DISHES).hasSize(80);
        assertThat(MessMenu.OTHER_DISHES).allSatisfy(d -> {
            assertThat(CATEGORIES).contains(d.category());
            assertThat(d.price()).isPositive();
        });
        Set<String> names = MessMenu.OTHER_DISHES.stream().map(d -> d.name().toLowerCase()).collect(Collectors.toSet());
        assertThat(names).hasSize(80);
        assertThat(MessMenu.OTHER_DISHES).anySatisfy(d -> {
            assertThat(d.name()).isEqualTo("Paneer Bhurji");
            assertThat(d.price()).isEqualTo(126);
        });
    }

    @Test
    void retiresDemoDishesAndRepricesOnesOnTheCard() {
        Meal vadaPav = meal("Vada Pav", "snacks", 20, true);
        Meal curdRice = meal("Curd Rice", "meals", 45, true);
        Meal thali = meal("Maharashtrian Thali", "thali", 120, true);
        Meal soup = meal("Tomato Soup", "soups", 70, true); // already on the new menu, admin-edited price

        List<Meal> changed = MessMenu.reconcileLegacy(List.of(vadaPav, curdRice, thali, soup));

        assertThat(changed).containsExactlyInAnyOrder(vadaPav, curdRice);
        assertThat(vadaPav.getCategory()).isEqualTo(MessMenu.RETIRED);
        assertThat(vadaPav.getIsAvailable()).isFalse();
        assertThat(curdRice.getCategory()).isEqualTo("rice");
        assertThat(curdRice.getPrice()).isEqualTo(69);
        assertThat(curdRice.getIsAvailable()).isTrue();
        assertThat(thali.getCategory()).isEqualTo("thali");
        assertThat(soup.getPrice()).isEqualTo(70);

        // Running again changes nothing: reconciled rows have left the legacy categories
        assertThat(MessMenu.reconcileLegacy(List.of(vadaPav, curdRice, thali, soup))).isEmpty();
    }

    private static Meal meal(String name, String category, double price, boolean available) {
        Meal m = new Meal();
        m.setName(name);
        m.setCategory(category);
        m.setPrice(price);
        m.setIsAvailable(available);
        m.setAvailableQuantity(10);
        return m;
    }
}
