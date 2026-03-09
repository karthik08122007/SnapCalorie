import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { mealsAPI } from '../services/api';

function computeStreak(meals) {
  const dates = new Set(meals.map(m => new Date(m.analyzed_at).toDateString()));
  const today = new Date();
  let streak = 0;
  // If today has no meals yet, start checking from yesterday so streak isn't lost mid-day
  const startOffset = dates.has(today.toDateString()) ? 0 : 1;
  for (let i = startOffset; ; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (dates.has(d.toDateString())) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [meals, setMeals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMeals = useCallback(async () => {
    try {
      const res = await mealsAPI.getAll();
      setMeals(res.data.data || []);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { fetchMeals(); }, [fetchMeals]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeals();
    setRefreshing(false);
  };

  const streak = computeStreak(meals);
  const totalMeals = meals.length;
  const uniqueDays = new Set(meals.map(m => new Date(m.analyzed_at).toDateString())).size;

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', color: '#FF6B35', screen: 'EditProfile' },
    { icon: 'flag-outline', label: 'My Goals', color: '#4ECDC4', screen: 'MyGoals' },
    { icon: 'notifications-outline', label: 'Notifications', color: '#45B7D1', screen: 'Notifications' },
    { icon: 'shield-outline', label: 'Privacy', color: '#96CEB4', screen: 'Privacy' },
    { icon: 'help-circle-outline', label: 'Help & Support', color: '#FFD93D', screen: 'HelpSupport' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f8f8" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>SnapCalorie</Text>
          <Text style={styles.headerRight}>Profile</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'User'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Streak', value: `🔥 ${streak}` },
            { label: 'Meals', value: String(totalMeals) },
            { label: 'Days', value: String(uniqueDays) },
          ].map((s, i) => (
            <View key={i} style={[styles.statItem, i < 2 && styles.statBorder]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuRow, i < menuItems.length - 1 && styles.menuBorder]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#ddd" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#ff4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#FF6B35' },
  headerRight: { fontSize: 16, fontWeight: '600', color: '#333' },
  profileCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FF6B35', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '800', color: 'white' },
  name: { fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 4 },
  email: { fontSize: 13, color: '#999' },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderRightWidth: 1, borderRightColor: '#f0f0f0' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#999' },
  menu: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#333' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#ffdddd' },
  logoutText: { color: '#ff4444', fontWeight: '700', fontSize: 15 },
});
