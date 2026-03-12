import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Switch, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isGoalAlertsEnabled, setGoalAlertsEnabled,
  scheduleMealReminders, cancelMealReminders, isMealRemindersEnabled,
  scheduleDailySummary, cancelDailySummary, isDailySummaryEnabled,
  scheduleNutritionTips, cancelNutritionTips, isNutritionTipsEnabled,
  scheduleWeeklyReport, cancelWeeklyReport, isWeeklyReportEnabled,
} from '../services/notifications';

const WATER_CHANNEL_ID = 'water-reminder';
const WATER_IDS_KEY = 'water_reminder_ids';
const WATER_INTERVAL_KEY = 'water_reminder_interval';

const INTERVALS = [
  { label: '30 min', value: 30 },
  { label: '1 hr',   value: 60 },
  { label: '2 hr',   value: 120 },
];

async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleWaterReminders(intervalMinutes = 60) {
  await cancelWaterReminders();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(WATER_CHANNEL_ID, {
      name: 'Water Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'water-reminder.mp3',
    });
  }

  const slots = [];
  const startMinutes = 7 * 60;
  const endMinutes   = 22 * 60;
  for (let m = startMinutes; m <= endMinutes; m += intervalMinutes) {
    slots.push({ hour: Math.floor(m / 60), minute: m % 60 });
  }

  const ids = [];
  for (const slot of slots) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💧 Time to hydrate!',
        body: 'Drink a glass of water to stay on track.',
        sound: 'water-reminder.mp3',
        categoryIdentifier: 'water_reminder',
        data: { waterReminder: true },
        ...(Platform.OS === 'android' && { channelId: WATER_CHANNEL_ID }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: slot.hour,
        minute: slot.minute,
      },
    });
    ids.push(id);
  }

  await AsyncStorage.setItem(WATER_IDS_KEY, JSON.stringify(ids));
  await AsyncStorage.setItem(WATER_INTERVAL_KEY, String(intervalMinutes));
}

async function cancelWaterReminders() {
  try {
    const raw = await AsyncStorage.getItem(WATER_IDS_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    for (const id of ids) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await AsyncStorage.removeItem(WATER_IDS_KEY);
    await AsyncStorage.removeItem(WATER_INTERVAL_KEY);
  } catch {}
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.waterReminder || notif.content.title?.includes('hydrate')) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier).catch(() => {});
    }
  }
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({
    mealReminders: false,
    dailySummary:  false,
    weeklyReport:  false,
    goalAlerts:    false,
    tips:          false,
    waterReminder: false,
  });
  const [waterInterval, setWaterInterval] = useState(60);
  const [loading, setLoading] = useState({});

  // Restore all persisted states on mount
  useEffect(() => {
    Promise.all([
      isGoalAlertsEnabled(),
      isMealRemindersEnabled(),
      isDailySummaryEnabled(),
      isNutritionTipsEnabled(),
      isWeeklyReportEnabled(),
      AsyncStorage.getItem(WATER_IDS_KEY),
      AsyncStorage.getItem(WATER_INTERVAL_KEY),
    ]).then(([goalAlerts, mealReminders, dailySummary, tips, weeklyReport, waterRaw, intervalRaw]) => {
      setSettings(prev => ({ ...prev, goalAlerts, mealReminders, dailySummary, tips, weeklyReport, waterReminder: !!waterRaw }));
      if (intervalRaw) setWaterInterval(Number(intervalRaw));
    });
  }, []);

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));

  const handleGoalAlertsToggle = async () => {
    const newValue = !settings.goalAlerts;
    setLoad('goalAlerts', true);
    const success = await setGoalAlertsEnabled(newValue);
    if (!success && newValue) {
      Alert.alert('Permission Required', 'Please allow notifications in your device settings.');
    } else {
      setSettings(prev => ({ ...prev, goalAlerts: newValue }));
    }
    setLoad('goalAlerts', false);
  };

  const handleMealRemindersToggle = async () => {
    const newValue = !settings.mealReminders;
    setLoad('mealReminders', true);
    if (newValue) {
      const ok = await scheduleMealReminders();
      if (!ok) {
        Alert.alert('Permission Required', 'Please allow notifications in your device settings.');
      } else {
        setSettings(prev => ({ ...prev, mealReminders: true }));
        Alert.alert('Meal Reminders On', 'You\'ll be reminded to log breakfast (8 AM), lunch (1 PM) and dinner (7 PM) daily.');
      }
    } else {
      await cancelMealReminders();
      setSettings(prev => ({ ...prev, mealReminders: false }));
    }
    setLoad('mealReminders', false);
  };

  const handleDailySummaryToggle = async () => {
    const newValue = !settings.dailySummary;
    setLoad('dailySummary', true);
    if (newValue) {
      const ok = await scheduleDailySummary();
      if (!ok) {
        Alert.alert('Permission Required', 'Please allow notifications in your device settings.');
      } else {
        setSettings(prev => ({ ...prev, dailySummary: true }));
        Alert.alert('Daily Summary On', 'You\'ll get a daily nutrition check-in at 9 PM every evening.');
      }
    } else {
      await cancelDailySummary();
      setSettings(prev => ({ ...prev, dailySummary: false }));
    }
    setLoad('dailySummary', false);
  };

  const handleWeeklyReportToggle = async () => {
    const newValue = !settings.weeklyReport;
    setLoad('weeklyReport', true);
    if (newValue) {
      const ok = await scheduleWeeklyReport();
      if (!ok) {
        Alert.alert('Permission Required', 'Please allow notifications in your device settings.');
      } else {
        setSettings(prev => ({ ...prev, weeklyReport: true }));
        Alert.alert('Weekly Report On', 'You\'ll receive a weekly nutrition recap every Sunday at 8 PM.');
      }
    } else {
      await cancelWeeklyReport();
      setSettings(prev => ({ ...prev, weeklyReport: false }));
    }
    setLoad('weeklyReport', false);
  };

  const handleTipsToggle = async () => {
    const newValue = !settings.tips;
    setLoad('tips', true);
    if (newValue) {
      const ok = await scheduleNutritionTips();
      if (!ok) {
        Alert.alert('Permission Required', 'Please allow notifications in your device settings.');
      } else {
        setSettings(prev => ({ ...prev, tips: true }));
        Alert.alert('Nutrition Tips On', 'You\'ll receive a daily nutrition tip at 9 AM every morning.');
      }
    } else {
      await cancelNutritionTips();
      setSettings(prev => ({ ...prev, tips: false }));
    }
    setLoad('tips', false);
  };

  const handleWaterToggle = async () => {
    const newValue = !settings.waterReminder;
    setLoad('waterReminder', true);
    if (newValue) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('Permission Required', 'Please allow notifications in your device settings to enable water reminders.');
      } else {
        await scheduleWaterReminders(waterInterval);
        const label = INTERVALS.find(i => i.value === waterInterval)?.label || '1 hr';
        setSettings(prev => ({ ...prev, waterReminder: true }));
        Alert.alert('Water Reminders On', `You'll be reminded to drink water every ${label}.`);
      }
    } else {
      await cancelWaterReminders();
      setSettings(prev => ({ ...prev, waterReminder: false }));
    }
    setLoad('waterReminder', false);
  };

  const handleIntervalChange = async (intervalMinutes) => {
    setWaterInterval(intervalMinutes);
    if (settings.waterReminder) {
      await scheduleWaterReminders(intervalMinutes);
    }
  };

  const activeLabel = INTERVALS.find(i => i.value === waterInterval)?.label || '1 hr';

  const items = [
    {
      key: 'mealReminders',
      label: 'Meal Reminders',
      desc: 'Reminded to log breakfast (8 AM), lunch (1 PM) & dinner (7 PM)',
      icon: 'alarm-outline',
      color: '#FF6B35',
      onToggle: handleMealRemindersToggle,
    },
    {
      key: 'dailySummary',
      label: 'Daily Summary',
      desc: 'Daily nutrition check-in notification at 9 PM',
      icon: 'bar-chart-outline',
      color: '#4ECDC4',
      onToggle: handleDailySummaryToggle,
    },
    {
      key: 'weeklyReport',
      label: 'Weekly Report',
      desc: 'Weekly nutrition recap every Sunday at 8 PM',
      icon: 'calendar-outline',
      color: '#45B7D1',
      onToggle: handleWeeklyReportToggle,
    },
    {
      key: 'goalAlerts',
      label: 'Goal Alerts',
      desc: 'Notified at 25% and 75% of your daily calorie goal',
      icon: 'trophy-outline',
      color: '#96CEB4',
      onToggle: handleGoalAlertsToggle,
    },
    {
      key: 'tips',
      label: 'Nutrition Tips',
      desc: 'A fresh nutrition tip every morning at 9 AM',
      icon: 'bulb-outline',
      color: '#FFD93D',
      onToggle: handleTipsToggle,
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Water Reminder Card */}
        <View style={styles.waterCard}>
          <View style={styles.waterTop}>
            <View style={styles.waterIconWrap}>
              <Text style={styles.waterEmoji}>💧</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.waterLabel}>Water Reminder</Text>
              <Text style={styles.waterDesc}>Reminds you to drink water between 7 AM – 10 PM</Text>
            </View>
            <Switch
              value={settings.waterReminder}
              onValueChange={handleWaterToggle}
              trackColor={{ false: '#eee', true: '#45B7D1' }}
              thumbColor="#fff"
              disabled={!!loading.waterReminder}
            />
          </View>

          <View style={styles.intervalSection}>
            <Text style={styles.intervalLabel}>Reminder frequency</Text>
            <View style={styles.intervalRow}>
              {INTERVALS.map(item => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.intervalBtn, waterInterval === item.value && styles.intervalBtnActive]}
                  onPress={() => handleIntervalChange(item.value)}
                >
                  <Text style={[styles.intervalBtnText, waterInterval === item.value && styles.intervalBtnTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {settings.waterReminder && (
            <View style={styles.waterBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#45B7D1" />
              <Text style={styles.waterBadgeText}>Active · Every {activeLabel}, 7 AM – 10 PM</Text>
            </View>
          )}
        </View>

        {/* Other Notifications */}
        <View style={styles.card}>
          {items.map((item, i) => (
            <View key={item.key} style={[styles.row, i < items.length - 1 && styles.rowBorder]}>
              <View style={[styles.iconWrap, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={settings[item.key]}
                onValueChange={item.onToggle}
                trackColor={{ false: '#eee', true: '#FF6B35' }}
                thumbColor="#fff"
                disabled={!!loading[item.key]}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#333' },
  content: { padding: 16, gap: 16 },
  waterCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, borderWidth: 1.5, borderColor: '#45B7D120' },
  waterTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waterIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#45B7D120', alignItems: 'center', justifyContent: 'center' },
  waterEmoji: { fontSize: 22 },
  waterLabel: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 2 },
  waterDesc: { fontSize: 12, color: '#999' },
  intervalSection: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  intervalLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 10 },
  intervalRow: { flexDirection: 'row', gap: 10 },
  intervalBtn: { flex: 1, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center', backgroundColor: '#fafafa' },
  intervalBtnActive: { backgroundColor: '#45B7D1', borderColor: '#45B7D1' },
  intervalBtnText: { fontSize: 13, fontWeight: '700', color: '#666' },
  intervalBtnTextActive: { color: '#fff' },
  waterBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  waterBadgeText: { fontSize: 12, color: '#45B7D1', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  rowDesc: { fontSize: 12, color: '#999' },
});
