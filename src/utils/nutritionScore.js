/**
 * calculateDailyNutritionScore
 * Pure function — no side effects, no imports.
 *
 * @param {object} params
 * @param {number} params.caloriesConsumed
 * @param {number} params.calorieGoal
 * @param {number} params.proteinConsumed
 * @param {number} params.proteinGoal
 * @param {number} params.carbsConsumed
 * @param {number} params.fatConsumed
 * @param {number} params.waterConsumed  (glasses)
 * @param {number} params.waterGoal      (glasses)
 * @returns {{ score: number, breakdown: { calories: number, protein: number, carbs: number, fat: number, water: number } }}
 */
export function calculateDailyNutritionScore({
  caloriesConsumed = 0,
  calorieGoal = 2000,
  proteinConsumed = 0,
  proteinGoal = 150,
  carbsConsumed = 0,
  fatConsumed = 0,
  waterConsumed = 0,
  waterGoal = 8,
}) {
  // ── 1. Calorie Goal Accuracy (30 pts) ──────────────────────────────────────
  let calories = 0;
  if (calorieGoal > 0) {
    const calorieDiff = Math.abs(caloriesConsumed - calorieGoal) / calorieGoal;
    if (calorieDiff <= 0.05) calories = 30;
    else if (calorieDiff <= 0.10) calories = 20;
    else if (calorieDiff <= 0.20) calories = 10;
  }

  // ── 2. Protein Intake (30 pts) ─────────────────────────────────────────────
  let protein = 0;
  if (proteinGoal > 0) {
    const proteinRatio = proteinConsumed / proteinGoal;
    if (proteinRatio >= 1.0) protein = 30;
    else if (proteinRatio >= 0.8) protein = 20;
    else if (proteinRatio >= 0.6) protein = 10;
  }

  // ── 3. Carbohydrate Balance (20 pts) ───────────────────────────────────────
  let carbs = 0;
  if (caloriesConsumed > 0) {
    const carbCals = carbsConsumed * 4; // 4 kcal/g
    const carbRatio = carbCals / caloriesConsumed;
    // Recommended: 45–65% of calories
    if (carbRatio >= 0.45 && carbRatio <= 0.65) {
      carbs = 20;
    } else if (carbRatio >= 0.35 && carbRatio <= 0.75) {
      carbs = 10; // slightly outside ±10%
    }
  }

  // ── 4. Fat Balance (10 pts) ────────────────────────────────────────────────
  let fat = 0;
  if (caloriesConsumed > 0) {
    const fatCals = fatConsumed * 9; // 9 kcal/g
    const fatRatio = fatCals / caloriesConsumed;
    // Recommended: 20–35% of calories
    if (fatRatio >= 0.20 && fatRatio <= 0.35) {
      fat = 10;
    }
  }

  // ── 5. Water Intake (10 pts) ───────────────────────────────────────────────
  let water = 0;
  if (waterGoal > 0) {
    const waterRatio = waterConsumed / waterGoal;
    if (waterRatio >= 1.0) water = 10;
    else if (waterRatio >= 0.7) water = 5;
  }

  const score = calories + protein + carbs + fat + water;

  return {
    score,
    breakdown: { calories, protein, carbs, fat, water },
  };
}

/**
 * Returns a message based on the score.
 * @param {number} score
 * @returns {{ message: string, color: string }}
 */
export function getScoreMessage(score) {
  if (score >= 90) return { message: 'Excellent nutrition today', color: '#4CAF50' };
  if (score >= 70) return { message: 'Good job, minor improvements possible', color: '#45B7D1' };
  if (score >= 50) return { message: 'Decent, but you can improve your balance', color: '#FF9800' };
  return { message: 'Your nutrition could be improved today', color: '#FF6B6B' };
}
