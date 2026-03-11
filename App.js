import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

const GOAL_ALERTS_KEY = 'goal_alerts_enabled';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Register notification category with action buttons
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

function Root() {
  const { loading } = useAuth();

  useEffect(() => {
    // Handle notification action button taps
    const sub = Notifications.addNotificationResponseReceivedListener(async response => {
      const action = response.actionIdentifier;
      if (action === 'mute') {
        await AsyncStorage.setItem(GOAL_ALERTS_KEY, 'false');
        // Cancel all scheduled goal notifications
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
          if (n.content.data?.goalAlert) {
            await Notifications.cancelScheduledNotificationAsync(n.identifier);
          }
        }
      }
      // 'completed' and 'will_do' just dismiss — no action needed
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
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
