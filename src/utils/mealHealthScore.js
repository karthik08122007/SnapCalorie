/**
 * calculateMealHealthScore
 * Rates a single meal on a 0–10 scale based on:
 *  - Protein density (calories from protein / total calories)
 *  - Calorie density (how filling vs heavy the meal is)
 *  - Macro balance (avoid extreme skew to fat or carbs)
 *
 * @param {{ calories: number, protein_g: number, carbs_g: number, fat_g: number }} nutrition
 * @returns {{ score: number, message: string }}
 */
export function calculateMealHealthScore({ calories = 0, protein_g = 0, carbs_g = 0, fat_g = 0 }) {
  if (calories <= 0) return { score: 0, message: 'Not enough data to score this meal.' };

  // ── 1. Protein density (0–4 pts) ────────────────────────────────────────────
  // Protein calories / total calories. Good meals: ≥25%
  const proteinCalRatio = (protein_g * 4) / calories;
  let proteinScore = 0;
  if (proteinCalRatio >= 0.30) proteinScore = 4;
  else if (proteinCalRatio >= 0.20) proteinScore = 3;
  else if (proteinCalRatio >= 0.12) proteinScore = 2;
  else if (proteinCalRatio >= 0.06) proteinScore = 1;

  // ── 2. Calorie density (0–3 pts) ────────────────────────────────────────────
  // Ideal single meal: 300–700 kcal. Heavy meals (>900) or near-zero penalised.
  let calScore = 0;
  if (calories >= 200 && calories <= 600) calScore = 3;
  else if (calories > 600 && calories <= 800) calScore = 2;
  else if (calories > 100 && calories <= 900) calScore = 1;

  // ── 3. Macro balance (0–3 pts) ──────────────────────────────────────────────
  // Fat calories should be 20–40%, carbs 35–65% of total
  const fatRatio  = (fat_g * 9) / calories;
  const carbRatio = (carbs_g * 4) / calories;
  const fatOk  = fatRatio  >= 0.15 && fatRatio  <= 0.45;
  const carbOk = carbRatio >= 0.30 && carbRatio <= 0.70;
  let macroScore = (fatOk ? 1 : 0) + (carbOk ? 1 : 0) + (fatOk && carbOk ? 1 : 0);

  const raw = proteinScore + calScore + macroScore;
  // raw is 0–10
  const score = Math.min(10, Math.max(0, raw));

  // ── Message ─────────────────────────────────────────────────────────────────
  const issues = [];
  if (proteinCalRatio < 0.12) issues.push('low protein');
  if (calories > 800)          issues.push('high calorie meal');
  if (fatRatio > 0.45)         issues.push('fat is high');
  if (carbRatio > 0.70)        issues.push('carbs are high');

  let message;
  if (score >= 9)      message = 'Outstanding macro balance!';
  else if (score >= 7) message = issues.length ? `Good meal — ${issues[0]} though.` : 'Good macro balance.';
  else if (score >= 5) message = issues.length ? `Decent, but ${issues.join(' and ')}.` : 'Decent nutritional balance.';
  else                 message = issues.length ? `${issues.join(', ')} — consider adjusting.` : 'Room for improvement.';

  return { score, message };
}
