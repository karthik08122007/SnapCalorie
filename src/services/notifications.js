import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GOAL_ALERTS_KEY = 'goal_alerts_enabled';
const MEAL_IDS_KEY = 'meal_reminder_ids';
const SUMMARY_IDS_KEY = 'daily_summary_ids';
const TIPS_IDS_KEY = 'nutrition_tips_ids';
const WEEKLY_IDS_KEY = 'weekly_report_ids';

const triggeredKey = () => 'goal_notif_triggered_' + new Date().toDateString();

const NUTRITION_TIPS = [
  { title: '🥦 Eat the rainbow!', body: 'Try to include 5 different coloured vegetables in your meals today.' },
  { title: '💧 Hydration check', body: 'Even mild dehydration can feel like hunger. Drink water before your next snack.' },
  { title: '🥚 Protein at breakfast', body: 'A protein-rich breakfast keeps you fuller longer and reduces cravings.' },
  { title: '🍽️ Slow down to slim down', body: 'It takes 20 minutes for your brain to register fullness — eat slowly.' },
  { title: '🌾 Choose whole grains', body: 'Swap white rice or bread for whole grain versions to boost fibre intake.' },
  { title: '🥑 Healthy fats matter', body: 'Avocado, nuts, and olive oil support brain function and keep you satisfied.' },
  { title: '🍎 Fibre is your friend', body: 'Aim for 25–30g of fibre daily from fruits, vegetables, and legumes.' },
  { title: '🧂 Watch the sodium', body: 'Excess sodium causes water retention. Check labels and choose low-sodium options.' },
  { title: '🍓 Snack smart', body: 'Pair carbs with protein for a snack that sustains energy — like apple with peanut butter.' },
  { title: '🌙 Night-time eating', body: 'Avoid heavy meals 2–3 hours before bed to improve digestion and sleep quality.' },
  { title: '🫐 Antioxidant power', body: 'Berries, dark chocolate, and green tea are loaded with antioxidants. Add one today!' },
  { title: '🥗 Prep ahead', body: 'Meal prepping on Sundays makes healthy eating easier all week long.' },
  { title: '🍋 Start with lemon water', body: 'A glass of warm lemon water in the morning aids digestion and boosts Vitamin C.' },
  { title: '🥜 Mindful portions', body: 'Use smaller plates — studies show it helps people eat 20–30% less without feeling deprived.' },
  { title: '🫀 Omega-3s for heart health', body: 'Eat fatty fish like salmon twice a week for heart-healthy omega-3 fatty acids.' },
  { title: '🌿 Herbs over salt', body: 'Season food with herbs and spices instead of salt to reduce sodium without losing flavour.' },
  { title: '🍌 Potassium power', body: 'Bananas, sweet potatoes, and spinach are rich in potassium which helps regulate blood pressure.' },
  { title: '☕ Limit sugary drinks', body: 'Liquid calories add up fast. Swap sodas and juices for water, herbal tea, or black coffee.' },
  { title: '🥛 Calcium for bones', body: 'Dairy, fortified plant milks, and leafy greens are great calcium sources for strong bones.' },
  { title: '🍜 Portion your carbs', body: 'Fill half your plate with vegetables, a quarter with lean protein, a quarter with carbs.' },
  { title: '🧘 Stress and eating', body: 'High stress raises cortisol which triggers cravings. Take 5 deep breaths before eating.' },
  { title: '🫘 Legumes are superfoods', body: 'Lentils, chickpeas, and beans are high in protein, fibre, and keep blood sugar stable.' },
  { title: '🌞 Vitamin D', body: 'Get 15 mins of morning sunlight or eat eggs, fatty fish, and fortified foods for Vitamin D.' },
  { title: '🍵 Green tea benefits', body: 'Green tea boosts metabolism slightly and is packed with catechins. Try a cup today.' },
  { title: '🥩 Lean protein choices', body: 'Chicken breast, turkey, tofu, and fish are lean protein options that support muscle repair.' },
  { title: '🫙 Read the label', body: 'The first 3 ingredients on a food label tell you the most about what you\'re really eating.' },
  { title: '🍦 The 80/20 rule', body: 'Eat nutritiously 80% of the time — that leaves 20% for enjoying treats guilt-free.' },
  { title: '🥕 Eat before shopping', body: 'Never grocery shop on an empty stomach — you\'ll make much healthier choices when full.' },
  { title: '🏃 Exercise boosts appetite control', body: 'Even a 10-minute walk after meals improves digestion and blood sugar regulation.' },
  { title: '🌰 Iron-rich foods', body: 'Spinach, lentils, and pumpkin seeds help prevent iron-deficiency fatigue — eat them regularly.' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function cancelByKey(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    const ids = raw ? JSON.parse(raw) : [];
    for (const id of ids) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await AsyncStorage.removeItem(key);
  } catch {}
}

async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Goal Alerts ──────────────────────────────────────────────────────────────

export async function isGoalAlertsEnabled() {
  const val = await AsyncStorage.getItem(GOAL_ALERTS_KEY);
  return val === 'true';
}

export async function setGoalAlertsEnabled(enabled) {
  if (enabled) {
    if (!(await requestPermissions())) return false;
  } else {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.goalAlert) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  }
  await AsyncStorage.setItem(GOAL_ALERTS_KEY, String(enabled));
  return true;
}

export async function checkGoalNotifications(consumed, goal) {
  const enabled = await isGoalAlertsEnabled();
  if (!enabled || !goal || goal <= 0) return;

  const pct = consumed / goal;
  const key = triggeredKey();
  const raw = await AsyncStorage.getItem(key);
  const triggered = raw ? JSON.parse(raw) : {};

  if (pct >= 0.75 && !triggered['75']) {
    triggered['75'] = true;
    await AsyncStorage.setItem(key, JSON.stringify(triggered));
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "You're crushing it! 💪",
        body: `${Math.round(pct * 100)}% of your daily goal reached. Keep it up — you're almost there!`,
        sound: true,
        categoryIdentifier: 'goal_alert',
        data: { goalAlert: true },
      },
      trigger: null,
    });
  }

  if (pct >= 0.25 && pct < 0.75 && !triggered['25']) {
    triggered['25'] = true;
    await AsyncStorage.setItem(key, JSON.stringify(triggered));
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.goalAlert25) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'You got this! 🌟',
        body: 'Great start today! Keep logging your meals and hit that goal.',
        sound: true,
        categoryIdentifier: 'goal_alert',
        data: { goalAlert: true, goalAlert25: true },
      },
      trigger: { seconds: 4 * 60 * 60 },
    });
  }
}

// ─── Meal Reminders ───────────────────────────────────────────────────────────

export async function isMealRemindersEnabled() {
  const raw = await AsyncStorage.getItem(MEAL_IDS_KEY);
  return !!raw;
}

export async function scheduleMealReminders() {
  await cancelByKey(MEAL_IDS_KEY);
  if (!(await requestPermissions())) return false;

  const slots = [
    { hour: 8,  minute: 0, title: '🍳 Breakfast time!', body: "Don't forget to log your breakfast and start the day right." },
    { hour: 13, minute: 0, title: '🥗 Lunch time!',     body: 'Log your lunch to stay on track with your nutrition goals.' },
    { hour: 19, minute: 0, title: '🍽️ Dinner time!',   body: 'Log what you eat tonight to hit your daily goals.' },
  ];

  const ids = [];
  for (const s of slots) {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: s.title, body: s.body, sound: true, data: { mealReminder: true } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: s.hour, minute: s.minute },
    });
    ids.push(id);
  }
  await AsyncStorage.setItem(MEAL_IDS_KEY, JSON.stringify(ids));
  return true;
}

export async function cancelMealReminders() {
  await cancelByKey(MEAL_IDS_KEY);
}

// ─── Daily Summary ────────────────────────────────────────────────────────────

export async function isDailySummaryEnabled() {
  const raw = await AsyncStorage.getItem(SUMMARY_IDS_KEY);
  return !!raw;
}

export async function scheduleDailySummary() {
  await cancelByKey(SUMMARY_IDS_KEY);
  if (!(await requestPermissions())) return false;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 Daily nutrition check-in',
      body: "How did today go? Tap to review your meals and macros for the day.",
      sound: true,
      data: { dailySummary: true },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 21, minute: 0 },
  });
  await AsyncStorage.setItem(SUMMARY_IDS_KEY, JSON.stringify([id]));
  return true;
}

export async function cancelDailySummary() {
  await cancelByKey(SUMMARY_IDS_KEY);
}

// ─── Nutrition Tips ───────────────────────────────────────────────────────────

export async function isNutritionTipsEnabled() {
  const raw = await AsyncStorage.getItem(TIPS_IDS_KEY);
  return !!raw;
}

export async function scheduleNutritionTips() {
  await cancelByKey(TIPS_IDS_KEY);
  if (!(await requestPermissions())) return false;

  // Schedule one tip per day for the next 30 days at 9 AM
  const ids = [];
  for (let day = 0; day < 30; day++) {
    const tip = NUTRITION_TIPS[day % NUTRITION_TIPS.length];
    const fireDate = new Date();
    fireDate.setDate(fireDate.getDate() + day);
    fireDate.setHours(9, 0, 0, 0);
    if (fireDate <= new Date()) fireDate.setDate(fireDate.getDate() + 1);

    const id = await Notifications.scheduleNotificationAsync({
      content: { title: tip.title, body: tip.body, sound: true, data: { nutritionTip: true } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
    ids.push(id);
  }
  await AsyncStorage.setItem(TIPS_IDS_KEY, JSON.stringify(ids));
  return true;
}

export async function cancelNutritionTips() {
  await cancelByKey(TIPS_IDS_KEY);
}

// ─── Weekly Report ────────────────────────────────────────────────────────────

export async function isWeeklyReportEnabled() {
  const raw = await AsyncStorage.getItem(WEEKLY_IDS_KEY);
  return !!raw;
}

export async function scheduleWeeklyReport() {
  await cancelByKey(WEEKLY_IDS_KEY);
  if (!(await requestPermissions())) return false;

  // Sunday = weekday 1 in Expo's WEEKLY trigger
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '📈 Your weekly nutrition report',
      body: 'A new week is starting! Tap to review last week\'s progress and set new goals.',
      sound: true,
      data: { weeklyReport: true },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 20, minute: 0 },
  });
  await AsyncStorage.setItem(WEEKLY_IDS_KEY, JSON.stringify([id]));
  return true;
}

export async function cancelWeeklyReport() {
  await cancelByKey(WEEKLY_IDS_KEY);
}
