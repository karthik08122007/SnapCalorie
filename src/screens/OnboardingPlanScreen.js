import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const FREE_FEATURES = ['20 AI scans/month', 'Basic nutrition tracking', 'Meal history', 'Water tracking'];
const PRO_FEATURES = ['Unlimited AI scans', 'Advanced insights', 'Priority support', 'Export data', 'No ads'];

let RazorpayCheckout = null;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch {
  // Not available in Expo Go
}

export default function OnboardingPlanScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const { completeOnboarding, updateProfile, user } = useAuth();
  const data = route.params;

  const handleFree = async () => {
    setLoading(true);
    try {
      await completeOnboarding({ ...data, plan: 'free' });
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handlePro = async () => {
    if (!RazorpayCheckout) {
      Alert.alert('Not Supported', 'Payments are not available in Expo Go. Please use the installed app.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create Razorpay order on backend
      const orderRes = await api.post('/subscription/create-order');
      const { order } = orderRes.data.data;

      // Step 2: Open Razorpay checkout
      const options = {
        description: 'SnapCalorie Pro — Monthly',
        currency: order.currency,
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        name: 'SnapCalorie',
        order_id: order.id,
        prefill: {
          email: user?.email || '',
          name: user?.name || '',
          contact: '',
        },
        theme: { color: '#FF6B35' },
      };

      const paymentData = await RazorpayCheckout.open(options);

      // Step 3: Verify payment on backend
      await api.post('/subscription/verify-payment', {
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      });

      // Step 4: Update user context and complete onboarding
      await updateProfile({ plan: 'pro' });
      await completeOnboarding({ ...data, plan: 'pro' });

      Alert.alert('🎉 Welcome to Pro!', 'You now have unlimited AI scans and all Pro features.');
    } catch (error) {
      if (error?.code === 2) {
        // User dismissed sheet — do nothing
      } else {
        let msg = 'Something went wrong. Please try again.';
        try {
          const parsed = JSON.parse(error?.description || '{}');
          const reason = parsed?.error?.reason;
          if (reason === 'payment_cancelled') {
            msg = 'Payment was cancelled. Please try again.';
          } else {
            msg = parsed?.error?.description || error?.description || msg;
          }
        } catch {
          msg = error?.description || msg;
        }
        Alert.alert('Payment Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.logo}>🥗</Text>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.sub}>Start free, upgrade anytime</Text>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
        <Text style={styles.progressText}>Step 3 of 3</Text>

        {/* Free Plan */}
        <View style={styles.planCard}>
          <Text style={styles.planName}>Free</Text>
          <Text style={styles.planPrice}>₹0<Text style={styles.planPer}>/month</Text></Text>
          {FREE_FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color="#4ECDC4" />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.freeBtn} onPress={handleFree} disabled={loading}>
            {loading ? <ActivityIndicator color="#333" /> : <Text style={styles.freeBtnText}>Start Free</Text>}
          </TouchableOpacity>
        </View>

        {/* Pro Plan */}
        <View style={[styles.planCard, styles.proPlan]}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>MOST POPULAR</Text>
          </View>
          <Text style={styles.planName}>Pro</Text>
          <Text style={[styles.planPrice, { color: '#FF6B35' }]}>₹39<Text style={styles.planPer}>/month</Text></Text>
          {PRO_FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color="#FF6B35" />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.proBtn} onPress={handlePro} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.proBtnText}>Get Pro ✨</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleFree} disabled={loading}>
          <Text style={styles.skip}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  scroll: { padding: 24 },
  logo: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#333', textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 20 },
  progressBar: { height: 5, backgroundColor: '#f0f0f0', borderRadius: 99, marginBottom: 6 },
  progressFill: { height: 5, backgroundColor: '#FF6B35', borderRadius: 99 },
  progressText: { fontSize: 11, color: '#999', textAlign: 'right', marginBottom: 24 },
  planCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  proPlan: { borderColor: '#FF6B35' },
  proBadge: { alignSelf: 'center', backgroundColor: '#FF6B35', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 99, marginBottom: 12 },
  proBadgeText: { color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  planName: { fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 4 },
  planPrice: { fontSize: 32, fontWeight: '800', color: '#333', marginBottom: 16 },
  planPer: { fontSize: 14, color: '#999', fontWeight: '400' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  featureText: { fontSize: 14, color: '#555' },
  freeBtn: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  freeBtnText: { color: '#333', fontWeight: '700', fontSize: 15 },
  proBtn: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  proBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  skip: { textAlign: 'center', color: '#999', fontSize: 13, marginTop: 8, marginBottom: 24 },
});
