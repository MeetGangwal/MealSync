package com.mealsync.controller;

import com.mealsync.model.Meal;
import com.mealsync.repository.MealRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meals")
@CrossOrigin(
    origins = {
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000"
    },
    originPatterns = {"http://localhost:*", "http://127.0.0.1:*"}
)
public class MealController {

    @Autowired
    private MealRepository mealRepository;

    @GetMapping
    public List<Meal> getAllMeals() {
        return mealRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Meal> getMealById(@PathVariable Long id) {
        return mealRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
