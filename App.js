import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import ErrorBoundary from './src/components/ErrorBoundary';
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
    options: { opensAppToForeground: true },
  },
  {
    identifier: 'water_later',
    buttonTitle: 'Will do 👍',
    options: { opensAppToForeground: false },
  },
]);

async function handleNotificationAction(action) {
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

  if (action === 'water_done') {
    try {
      // On cold start the AuthContext SecureStore restore may not have run yet,
      // so global.authToken can be null. Read it directly as a fallback.
      if (!global.authToken) {
        const saved = await SecureStore.getItemAsync('auth_token');
        if (saved) global.authToken = saved;
      }
      const _d = new Date();
      const todayDate = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
      const res = await waterAPI.get(todayDate);
      const current = res.data.data?.glasses ?? 0;
      await waterAPI.set(todayDate, current + 1);
    } catch {}
  }
  // 'water_later', 'completed', 'will_do' — just dismiss, no action needed
}

function Root() {
  const { loading, user } = useAuth();

  // Track app_opened only after auth resolves with a logged-in user
  useEffect(() => {
    if (!loading && user) {
      trackEvent('app_opened', { timestamp: new Date().toISOString() });
    }
  }, [loading, user]);

  // useLastNotificationResponse covers all cases: cold start (app killed),
  // background, and foreground. useRef prevents re-processing the same response
  // on re-renders.
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponseId = useRef(null);
  useEffect(() => {
    if (lastResponse) {
      const id = lastResponse.notification.request.identifier;
      if (id !== handledResponseId.current) {
        handledResponseId.current = id;
        handleNotificationAction(lastResponse.actionIdentifier);
      }
    }
  }, [lastResponse]);

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

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <Root />
          {!splashDone && <AppSplash onFinish={() => setSplashDone(true)} />}
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
