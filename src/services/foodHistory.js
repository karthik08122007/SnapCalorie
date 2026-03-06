import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'snapcalorie_food_history';
const MAX_ITEMS = 30;

// Normalize food name for matching (lowercase, trim, collapse spaces)
function normalizeName(name) {
  return name?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
}

export async function saveFoodToHistory(food) {
  try {
    const existing = await getFoodHistory();
    const normalized = normalizeName(food.food_name);
    // Remove any previous entry for the same food
    const filtered = existing.filter(f => normalizeName(f.food_name) !== normalized);
    // Add to front, cap at MAX_ITEMS
    const updated = [food, ...filtered].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export async function getFoodHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function findSimilarFood(foodName) {
  try {
    const history = await getFoodHistory();
    const normalized = normalizeName(foodName);
    if (!normalized) return null;
    // Exact match first
    const exact = history.find(f => normalizeName(f.food_name) === normalized);
    if (exact) return exact;
    // Partial match: if analyzed name contains or is contained by a history name
    const partial = history.find(f => {
      const h = normalizeName(f.food_name);
      return h.includes(normalized) || normalized.includes(h);
    });
    return partial || null;
  } catch {
    return null;
  }
}

export async function clearFoodHistory() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
