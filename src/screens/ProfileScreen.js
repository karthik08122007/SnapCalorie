import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, RefreshControl, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { mealsAPI, API_URL } from '../services/api';
import api from '../services/api';
import AppModal from '../components/AppModal';

let RazorpayCheckout = null;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch {}

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
  const { user, logout, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [meals, setMeals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [modal, setModal] = useState({ visible: false, icon: '', title: '', message: '', confirmText: '', confirmDestructive: false, onConfirm: null });

  const showModal = (icon, title, message) => setModal({ visible: true, icon, title, message, onConfirm: null });
  const showConfirmModal = (icon, title, message, confirmText, onConfirm, confirmDestructive = false) => setModal({ visible: true, icon, title, message, confirmText, onConfirm, confirmDestructive });
  const hideModal = () => setModal(prev => ({ ...prev, visible: false }));

  const handleTurnPro = async () => {
    if (!RazorpayCheckout) {
      showModal('ℹ️', 'Not Supported', 'Payments are not available in Expo Go. Please use the installed app.');
      return;
    }
    setPayLoading(true);
    try {
      const orderRes = await api.post('/subscription/create-order');
      const { order } = orderRes.data.data;
      const options = {
        description: 'SnapCalorie Pro — Monthly',
        currency: order.currency,
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        name: 'SnapCalorie',
        order_id: order.id,
        prefill: { email: user?.email || '', name: user?.name || '' },
        theme: { color: '#FF6B35' },
      };
      const paymentData = await RazorpayCheckout.open(options);
      await api.post('/subscription/verify-payment', {
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      });
      await updateProfile({ plan: 'pro' });
      showModal('🎉', 'Welcome to Pro!', 'You now have unlimited AI scans and all Pro features.');
    } catch (error) {
      if (error?.code === 2) return; // user cancelled
      let msg = 'Something went wrong. Please try again.';
      try {
        const desc = typeof error?.description === 'string' ? error.description : JSON.stringify(error?.description || '');
        const parsed = JSON.parse(desc || '{}');
        msg = parsed?.error?.reason === 'payment_cancelled'
          ? 'Payment was cancelled.'
          : parsed?.error?.description || error?.message || msg;
      } catch { msg = error?.message || msg; }
      showModal('❌', 'Payment Failed', String(msg));
    } finally {
      setPayLoading(false);
    }
  };

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
    { icon: 'key-outline', label: 'Change Password', color: '#9B59B6', screen: 'ChangePassword' },
    { icon: 'notifications-outline', label: 'Notifications', color: '#45B7D1', screen: 'Notifications' },
    { icon: 'shield-outline', label: 'Privacy', color: '#96CEB4', screen: 'Privacy' },
    { icon: 'help-circle-outline', label: 'Help & Support', color: '#FFD93D', screen: 'HelpSupport' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppModal visible={modal.visible} icon={modal.icon} title={modal.title} message={modal.message} onClose={hideModal} confirmText={modal.confirmText} onConfirm={modal.onConfirm} confirmDestructive={modal.confirmDestructive} />
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

        {user?.plan !== 'pro' ? (
          <TouchableOpacity style={styles.proCard} onPress={handleTurnPro} disabled={payLoading}>
            <View style={styles.proCardLeft}>
              <Text style={styles.proCardTitle}>Upgrade to Pro ✨</Text>
              <Text style={styles.proCardSub}>Unlimited scans · Advanced insights</Text>
            </View>
            {payLoading
              ? <ActivityIndicator color="#fff" />
              : <View style={styles.proCardBtn}><Text style={styles.proCardBtnText}>₹39/mo</Text></View>
            }
          </TouchableOpacity>
        ) : (
          <View style={styles.proBadgeCard}>
            <Text style={styles.proBadgeText}>✨ You're on Pro</Text>
            <TouchableOpacity onPress={() => showConfirmModal('⚠️', 'Cancel Pro?', 'You will lose your Pro benefits at the end of the billing cycle and revert to the free plan.', 'Cancel Pro', async () => {
              hideModal();
              try {
                await api.post('/subscription/cancel');
                await updateProfile({ plan: 'free' });
                showModal('✅', 'Pro Cancelled', 'Your plan has been downgraded to Free.');
              } catch {
                showModal('❌', 'Error', 'Failed to cancel subscription. Please try again.');
              }
            }, true)}>
              <Text style={styles.cancelProText}>Cancel subscription</Text>
            </TouchableOpacity>
          </View>
        )}

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

        <TouchableOpacity style={styles.exportBtn} onPress={async () => {
          try {
            setExporting(true);
            const API_BASE = API_URL;
            const fileUri = FileSystem.cacheDirectory + 'snapcalorie-export.pdf';
            const result = await FileSystem.downloadAsync(
              `${API_BASE}/auth/export`,
              fileUri,
              { headers: { Authorization: `Bearer ${global.authToken}` } }
            );
            if (result.status !== 200) {
              throw new Error(`Server returned ${result.status}`);
            }
            await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'SnapCalorie Data Export', UTI: 'com.adobe.pdf' });
          } catch (err) {
            showModal('❌', 'Export failed', err?.message || 'Could not export your data. Please try again.');
          } finally {
            setExporting(false);
          }
        }} disabled={exporting}>
          <Ionicons name="download-outline" size={20} color="#4ECDC4" />
          <Text style={styles.exportText}>{exporting ? 'Exporting…' : 'Export My Data'}</Text>
        </TouchableOpacity>

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
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#d0f5f2' },
  exportText: { fontSize: 15, fontWeight: '700', color: '#4ECDC4' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#ffdddd' },
  logoutText: { color: '#ff4444', fontWeight: '700', fontSize: 15 },
  proCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, backgroundColor: '#FF6B35', borderRadius: 20, padding: 16, gap: 12 },
  proCardLeft: { flex: 1 },
  proCardTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  proCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  proCardBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  proCardBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  proBadgeCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFF3EE', borderRadius: 20, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FF6B35', gap: 6 },
  proBadgeText: { color: '#FF6B35', fontWeight: '700', fontSize: 14 },
  cancelProText: { color: '#999', fontSize: 12, textDecorationLine: 'underline' },
});
