import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function PhoneVerifyScreen() {
  const [step, setStep] = useState(1); // 1=phone, 2=otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { verifyPhone, logout } = useAuth();

  const handleSendOtp = async () => {
    setError('');
    if (!phone.trim()) return setError('Phone number is required.');
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) return setError('Enter phone with country code (e.g. +91XXXXXXXXXX).');
    setLoading(true);
    try {
      await api.post('/auth/send-phone-otp', { phone });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    if (!otp.trim() || otp.length !== 6) return setError('Enter the 6-digit OTP.');
    setLoading(true);
    try {
      await verifyPhone(phone, otp);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.logo}>📱</Text>
          <Text style={styles.title}>Verify Your Phone</Text>
          <Text style={styles.sub}>
            {step === 1 ? 'One last step — verify your phone number to secure your account.' : `Enter the OTP sent to ${phone}`}
          </Text>

          <View style={styles.steps}>
            {[1, 2].map(s => (
              <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {step === 1 && (
            <>
              <TextInput
                style={styles.input}
                placeholder="+91XXXXXXXXXX"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoFocus
              />
              <Text style={styles.hint}>Include country code e.g. +91 for India</Text>
              <TouchableOpacity style={styles.btn} onPress={handleSendOtp} disabled={loading}>
                <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={logout} style={styles.backBtn}>
                <Text style={styles.backText}>← Sign out</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor="#ccc"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading}>
                <Text style={styles.btnText}>{loading ? 'Verifying...' : 'Verify & Continue'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep(1); setOtp(''); setError(''); }} style={styles.backBtn}>
                <Text style={styles.backText}>← Change Number</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendOtp} style={styles.backBtn}>
                <Text style={styles.backText}>Resend OTP</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, paddingBottom: 48, flexGrow: 1, justifyContent: 'center' },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', color: '#333', marginBottom: 8 },
  sub: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 28 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#eee' },
  stepDotActive: { backgroundColor: '#FF6B35' },
  error: { color: '#ff4444', textAlign: 'center', marginBottom: 12, fontSize: 13, backgroundColor: '#fff0f0', padding: 10, borderRadius: 8 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12, color: '#333', backgroundColor: '#fafafa' },
  otpInput: { textAlign: 'center', fontSize: 24, fontWeight: '700', letterSpacing: 8 },
  hint: { fontSize: 11, color: '#999', marginTop: -6, marginBottom: 12, paddingHorizontal: 4 },
  btn: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  backBtn: { alignItems: 'center', marginTop: 16 },
  backText: { color: '#FF6B35', fontWeight: '600', fontSize: 14 },
});
