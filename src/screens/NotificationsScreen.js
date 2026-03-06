import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Switch, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const WATER_CHANNEL_ID = 'water-reminder';

async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleWaterReminders() {
  // Cancel existing water reminders first
  await cancelWaterReminders();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(WATER_CHANNEL_ID, {
      name: 'Water Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💧 Time to hydrate!',
      body: 'Drink a glass of water to stay on track.',
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: WATER_CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3600, // every hour
      repeats: true,
    },
  });
}

async function cancelWaterReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.title?.includes('hydrate') || notif.content.body?.includes('water')) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({
    mealReminders: true,
    dailySummary: true,
    weeklyReport: false,
    goalAlerts: true,
    tips: false,
    waterReminder: false,
  });

  const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  const handleWaterToggle = async () => {
    const newValue = !settings.waterReminder;

    if (newValue) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please allow notifications in your device settings to enable water reminders.',
        );
        return;
      }
      await scheduleWaterReminders();
      Alert.alert('Water Reminders On', "You'll be reminded to drink water every hour.");
    } else {
      await cancelWaterReminders();
    }

    setSettings(prev => ({ ...prev, waterReminder: newValue }));
  };

  const items = [
    { key: 'mealReminders', label: 'Meal Reminders', desc: 'Remind you to log breakfast, lunch & dinner', icon: 'alarm-outline', color: '#FF6B35' },
    { key: 'dailySummary', label: 'Daily Summary', desc: 'End-of-day nutrition recap', icon: 'bar-chart-outline', color: '#4ECDC4' },
    { key: 'weeklyReport', label: 'Weekly Report', desc: 'Your weekly progress overview', icon: 'calendar-outline', color: '#45B7D1' },
    { key: 'goalAlerts', label: 'Goal Alerts', desc: "When you're close to reaching your goals", icon: 'flag-outline', color: '#96CEB4' },
    { key: 'tips', label: 'Nutrition Tips', desc: 'Helpful tips and healthy recipes', icon: 'bulb-outline', color: '#FFD93D' },
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
              <Text style={styles.waterDesc}>Reminds you to drink water every hour</Text>
            </View>
            <Switch
              value={settings.waterReminder}
              onValueChange={handleWaterToggle}
              trackColor={{ false: '#eee', true: '#45B7D1' }}
              thumbColor="#fff"
            />
          </View>
          {settings.waterReminder && (
            <View style={styles.waterBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#45B7D1" />
              <Text style={styles.waterBadgeText}>Active · Reminders every hour</Text>
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
                onValueChange={() => toggle(item.key)}
                trackColor={{ false: '#eee', true: '#FF6B35' }}
                thumbColor="#fff"
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
  waterBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  waterBadgeText: { fontSize: 12, color: '#45B7D1', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  rowDesc: { fontSize: 12, color: '#999' },
});
