import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GOAL_ALERTS_KEY = 'goal_alerts_enabled';
const triggeredKey = () => 'goal_notif_triggered_' + new Date().toDateString();

export async function isGoalAlertsEnabled() {
  const val = await AsyncStorage.getItem(GOAL_ALERTS_KEY);
  return val === 'true';
}

export async function setGoalAlertsEnabled(enabled) {
  if (enabled) {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;
  } else {
    // Cancel any pending 4-hour reminders
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

// Called each time today's meal totals update.
// consumed: kcal eaten today, goal: daily calorie goal
export async function checkGoalNotifications(consumed, goal) {
  const enabled = await isGoalAlertsEnabled();
  if (!enabled || !goal || goal <= 0) return;

  const pct = consumed / goal;
  const key = triggeredKey();
  const raw = await AsyncStorage.getItem(key);
  const triggered = raw ? JSON.parse(raw) : {};

  // 75% milestone — fire immediately
  if (pct >= 0.75 && !triggered['75']) {
    triggered['75'] = true;
    await AsyncStorage.setItem(key, JSON.stringify(triggered));
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "You're crushing it! 💪",
        body: `${Math.round(pct * 100)}% of your daily goal reached. Keep it up — you're almost there!`,
        sound: true,
        data: { goalAlert: true },
      },
      trigger: null, // immediate
    });
  }

  // 25% milestone — schedule a nudge 4 hours later (skip if already past 75%)
  if (pct >= 0.25 && pct < 0.75 && !triggered['25']) {
    triggered['25'] = true;
    await AsyncStorage.setItem(key, JSON.stringify(triggered));
    // Cancel any previously scheduled 25% nudge before rescheduling
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.goalAlert25) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'You got this! 🌟',
        body: "Great start today! Keep logging your meals and hit that goal.",
        sound: true,
        data: { goalAlert: true, goalAlert25: true },
      },
      trigger: { seconds: 4 * 60 * 60 }, // 4 hours
    });
  }
}
