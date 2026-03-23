import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../services/api';
import AppModal from '../components/AppModal';

export default function ResetPasswordScreen({ navigation, route }) {
  const { email } = route.params || {};
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ visible: false, icon: '', title: '', message: '', confirmText: '', confirmDestructive: false, onConfirm: null });
  const pendingNav = useRef(null);

  const showModal = (icon, title, message) => setModal({ visible: true, icon, title, message, onConfirm: null });
  const hideModal = () => { setModal(prev => ({ ...prev, visible: false })); if (pendingNav.current) { pendingNav.current(); pendingNav.current = null; } };

  const handle = async () => {
    if (!otp.trim() || otp.length !== 6) return setError('Enter the 6-digit OTP from your email.');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return setError('Password must contain at least one uppercase letter and one number.');
    setLoading(true);
    setError('');
    try {
      await authAPI.resetPassword(email, otp.trim(), newPassword);
      pendingNav.current = () => navigation.navigate('Login');
      showModal('✅', 'Password Reset', 'Your password has been reset. Please sign in.');
    } catch (err) {
      setError(err.response?.data?.message || 'OTP is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppModal visible={modal.visible} icon={modal.icon} title={modal.title} message={modal.message} onClose={hideModal} confirmText={modal.confirmText} onConfirm={modal.onConfirm} confirmDestructive={modal.confirmDestructive} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.logo}>🔒</Text>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.sub}>Enter the 6-digit OTP sent to{'\n'}<Text style={styles.emailText}>{email}</Text></Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="Enter 6-digit OTP"
            placeholderTextColor="#999"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.inputFlex}
              placeholder="New password"
              placeholderTextColor="#999"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>Min 8 characters, 1 uppercase, 1 number</Text>

          <TouchableOpacity style={styles.btn} onPress={handle} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Resetting...' : 'Reset Password'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.resend}>
            <Text style={styles.resendText}>Didn't get the OTP? <Text style={styles.link}>Resend</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, paddingBottom: 48 },
  back: { marginBottom: 24, marginTop: 8 },
  backText: { color: '#FF6B35', fontSize: 15, fontWeight: '600' },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 8, marginTop: 20 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', color: '#1a1a1a', marginBottom: 8 },
  sub: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  emailText: { color: '#333', fontWeight: '600' },
  error: { color: '#ff4444', textAlign: 'center', marginBottom: 12, fontSize: 13, backgroundColor: '#fff0f0', padding: 10, borderRadius: 8 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12, color: '#333', backgroundColor: '#fafafa' },
  otpInput: { fontSize: 24, fontWeight: '700', letterSpacing: 8, textAlign: 'center' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 12, backgroundColor: '#fafafa', marginBottom: 6 },
  inputFlex: { flex: 1, padding: 14, fontSize: 15, color: '#333' },
  eyeBtn: { paddingHorizontal: 14 },
  hint: { fontSize: 12, color: '#bbb', marginBottom: 20, paddingLeft: 4 },
  btn: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  resend: { marginTop: 20 },
  resendText: { textAlign: 'center', color: '#999', fontSize: 14 },
  link: { color: '#FF6B35', fontWeight: '700' },
});
