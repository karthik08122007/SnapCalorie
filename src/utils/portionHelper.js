/**
 * Portion size multipliers for Small / Medium / Large
 */
export const PORTION_SIZES = {
  small:  { label: 'Small',  multiplier: 0.75 },
  medium: { label: 'Medium', multiplier: 1.00 },
  large:  { label: 'Large',  multiplier: 1.35 },
};

/**
 * adjustNutritionByPortion
 * Scales calorie + macro values by the multiplier for the chosen size.
 *
 * @param {object} nutrition - { calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, cholesterol_mg, estimated_weight_g }
 * @param {'small'|'medium'|'large'} portionSize
 * @returns {object} - updated nutrition object with rounded values
 */
export function adjustNutritionByPortion(nutrition, portionSize) {
  const { multiplier } = PORTION_SIZES[portionSize] || PORTION_SIZES.medium;
  const round1 = (v) => (v != null ? Math.round(v * multiplier * 10) / 10 : v);

  return {
    ...nutrition,
    calories:         round1(nutrition.calories),
    protein_g:        round1(nutrition.protein_g),
    carbs_g:          round1(nutrition.carbs_g),
    fat_g:            round1(nutrition.fat_g),
    fiber_g:          round1(nutrition.fiber_g),
    sugar_g:          round1(nutrition.sugar_g),
    sodium_mg:        round1(nutrition.sodium_mg),
    cholesterol_mg:   round1(nutrition.cholesterol_mg),
    estimated_weight_g: round1(nutrition.estimated_weight_g),
    _portionSize: portionSize,
  };
}
