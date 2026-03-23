import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, StyleSheet } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import DiaryScreen from '../screens/DiaryScreen';
import InsightsScreen from '../screens/InsightsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import MyGoalsScreen from '../screens/MyGoalsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import LogMealScreen from '../screens/LogMealScreen';
import MealDetailScreen from '../screens/MealDetailScreen';
import MealReviewScreen from '../screens/MealReviewScreen';
import OnboardingAboutScreen from '../screens/OnboardingAboutScreen';
import OnboardingActivityScreen from '../screens/OnboardingActivityScreen';
import OnboardingPlanScreen from '../screens/OnboardingPlanScreen';
import PhoneVerifyScreen from '../screens/PhoneVerifyScreen';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const DiaryStack = createNativeStackNavigator();
const LogMealStack = createNativeStackNavigator();

function AddButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.addBtn} onPress={onPress}>
      <Ionicons name="add" size={32} color="white" />
    </TouchableOpacity>
  );
}

function LogMealStackScreen() {
  return (
    <LogMealStack.Navigator screenOptions={{ headerShown: false }}>
      <LogMealStack.Screen name="LogMealMain" component={LogMealScreen} />
      <LogMealStack.Screen name="MealReview" component={MealReviewScreen} />
    </LogMealStack.Navigator>
  );
}

function DiaryStackScreen() {
  return (
    <DiaryStack.Navigator screenOptions={{ headerShown: false }}>
      <DiaryStack.Screen name="DiaryMain" component={DiaryScreen} />
      <DiaryStack.Screen name="MealDetail" component={MealDetailScreen} />
    </DiaryStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="MyGoals" component={MyGoalsScreen} />
      <ProfileStack.Screen name="Notifications" component={NotificationsScreen} />
      <ProfileStack.Screen name="Privacy" component={PrivacyScreen} />
      <ProfileStack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Diary"
        component={DiaryStackScreen}
        options={{ tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Add"
        component={LogMealStackScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => <AddButton onPress={props.onPress} />,
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{ tabBarIcon: ({ color }) => <Ionicons name="bulb-outline" size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{ tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, onboarded } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : !user.phoneVerified ? (
          <Stack.Screen name="PhoneVerify" component={PhoneVerifyScreen} />
        ) : !onboarded ? (
          <>
            <Stack.Screen name="OnboardingAbout" component={OnboardingAboutScreen} />
            <Stack.Screen name="OnboardingActivity" component={OnboardingActivityScreen} />
            <Stack.Screen name="OnboardingPlan" component={OnboardingPlanScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
  },
  addBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
