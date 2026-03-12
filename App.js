import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { waterAPI } from './src/services/api';
import AppSplash from './src/components/AppSplash';
import { trackEvent } from './src/utils/analytics';

const GOAL_ALERTS_KEY = 'goal_alerts_enabled';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Goal alert category (Completed / Will do / Mute)
Notifications.setNotificationCategoryAsync('goal_alert', [
  {
    identifier: 'completed',
    buttonTitle: 'Completed ✅',
    options: { opensAppToForeground: false },
  },
  {
    identifier: 'will_do',
    buttonTitle: 'Will do 👍',
    options: { opensAppToForeground: false },
  },
  {
    identifier: 'mute',
    buttonTitle: 'Mute 🔕',
    options: { opensAppToForeground: false },
  },
]);

// Water reminder category (Completed / Will do)
Notifications.setNotificationCategoryAsync('water_reminder', [
  {
    identifier: 'water_done',
    buttonTitle: 'Completed ✅',
    options: { opensAppToForeground: false },
  },
  {
    identifier: 'water_later',
    buttonTitle: 'Will do 👍',
    options: { opensAppToForeground: false },
  },
]);

function Root() {
  const { loading } = useAuth();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(async response => {
      const action = response.actionIdentifier;

      // Goal alert: mute
      if (action === 'mute') {
        await AsyncStorage.setItem(GOAL_ALERTS_KEY, 'false');
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
          if (n.content.data?.goalAlert) {
            await Notifications.cancelScheduledNotificationAsync(n.identifier);
          }
        }
        return;
      }

      // Water reminder: log a glass of water
      if (action === 'water_done') {
        try {
          const todayDate = new Date().toISOString().slice(0, 10);
          const res = await waterAPI.get(todayDate);
          const current = res.data.data?.glasses ?? 0;
          await waterAPI.set(todayDate, current + 1);
        } catch {}
      }
      // 'water_later', 'completed', 'will_do' — just dismiss, no action needed
    });
    return () => sub.remove();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF6B35' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return <AppNavigator />;
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    trackEvent('app_opened', { timestamp: new Date().toISOString() });
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
        {!splashDone && <AppSplash onFinish={() => setSplashDone(true)} />}
      </AuthProvider>
    </SafeAreaProvider>
  );
}
