import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AppModal from '../components/AppModal';

let GoogleSignin = null;
let statusCodes = {};
try {
  const googleModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleModule.GoogleSignin;
  statusCodes = googleModule.statusCodes;
  GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID });
} catch {}

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1=details, 2=email-otp
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, googleLogin } = useAuth();
  const [modal, setModal] = useState({ visible: false, icon: '', title: '', message: '', confirmText: '', confirmDestructive: false, onConfirm: null });

  const showModal = (icon, title, message) => setModal({ visible: true, icon, title, message, onConfirm: null });
  const hideModal = () => setModal(prev => ({ ...prev, visible: false }));

  const handleNext = async () => {
    setError('');
    if (!name.trim()) return setError('Name is required.');
    if (!email.trim()) return setError('Email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.');
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))
      return setError('Password must be 8+ chars with 1 uppercase and 1 number.');
    setLoading(true);
    try {
      await api.post('/auth/send-email-otp', { email: email.trim().toLowerCase(), name });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send email OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    setError('');
    if (!emailOtp.trim() || emailOtp.length !== 6) return setError('Enter the 6-digit OTP sent to your email.');
    setLoading(true);
    try {
      await api.post('/auth/verify-email-otp', { email, otp: emailOtp });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
      setLoading(false);
      return;
    }
    try {
      await register(name, email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!GoogleSignin) {
      showModal('🚧', 'Coming Soon', 'Google Sign-Up will be available in the next update.');
      return;
    }
    setGoogleLoading(true);
    setError('');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type === 'success') {
        const idToken = result.data?.idToken;
        if (!idToken) {
          setError('Google Sign-In configuration error. Please use email/password login.');
          return;
        }
        await googleLogin(idToken);
      }
    } catch (err) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
      } else if (err.code === statusCodes.DEVELOPER_ERROR || String(err.message).includes('DEVELOPER_ERROR')) {
        setError('Google Sign-In is not configured for this build.');
      } else {
        setError(err.response?.data?.message || err.message || 'Google sign-up failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppModal visible={modal.visible} icon={modal.icon} title={modal.title} message={modal.message} onClose={hideModal} confirmText={modal.confirmText} onConfirm={modal.onConfirm} confirmDestructive={modal.confirmDestructive} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.logo}>🥗</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.sub}>
            {step === 1 ? 'Start tracking your nutrition today' : 'Enter the OTP sent to ' + email}
          </Text>

          {/* Step indicator */}
          <View style={styles.steps}>
            {[1,2].map(s => (
              <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {step === 1 && (
            <>
              <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#999" value={name} onChangeText={setName} />
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <View style={styles.inputWrap}>
                <TextInput style={styles.inputFlex} placeholder="Password" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>Min 8 characters, 1 uppercase letter, 1 number</Text>
              <TouchableOpacity style={styles.btn} onPress={handleNext} disabled={loading}>
                <Text style={styles.btnText}>{loading ? 'Sending OTP...' : 'Next →'}</Text>
              </TouchableOpacity>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.divider} />
              </View>
              <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignUp} disabled={googleLoading}>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleText}>{googleLoading ? 'Signing up...' : 'Sign up with Google'}</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor="#ccc"
                value={emailOtp}
                onChangeText={setEmailOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity style={styles.btn} onPress={handleVerifyEmail} disabled={loading}>
                <Text style={styles.btnText}>{loading ? 'Verifying...' : 'Verify Email'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => { setError(''); setLoading(true); try { await api.post('/auth/send-email-otp', { email: email.trim().toLowerCase(), name }); } catch(e){} finally { setLoading(false); } }} style={styles.backBtn}>
                <Text style={styles.backText}>Resend OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep(1); setEmailOtp(''); }} style={styles.backBtn}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.switch}>Already have an account? <Text style={styles.link}>Sign in</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, paddingBottom: 48 },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 8, marginTop: 20 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', color: '#333', marginBottom: 4 },
  sub: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 16 },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#eee' },
  stepDotActive: { backgroundColor: '#FF6B35' },
  error: { color: '#ff4444', textAlign: 'center', marginBottom: 12, fontSize: 13, backgroundColor: '#fff0f0', padding: 10, borderRadius: 8 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12, color: '#333', backgroundColor: '#fafafa' },
  otpInput: { textAlign: 'center', fontSize: 24, fontWeight: '700', letterSpacing: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 12, backgroundColor: '#fafafa', marginBottom: 12 },
  inputFlex: { flex: 1, padding: 14, fontSize: 15, color: '#333' },
  eyeBtn: { paddingHorizontal: 14 },
  btn: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  backBtn: { alignItems: 'center', marginTop: 16 },
  backText: { color: '#FF6B35', fontWeight: '600', fontSize: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#eee' },
  dividerText: { fontSize: 13, color: '#999' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 14, backgroundColor: '#fff', marginBottom: 20 },
  googleIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '600', color: '#333' },
  switch: { textAlign: 'center', color: '#999', fontSize: 14 },
  link: { color: '#FF6B35', fontWeight: '700' },
  hint: { fontSize: 11, color: '#999', marginTop: -6, marginBottom: 12, paddingHorizontal: 4 },
});
