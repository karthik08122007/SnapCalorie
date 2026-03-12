import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { authAPI } from '../services/api';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    if (!email.trim()) return setError('Enter your email address.');
    setLoading(true);
    setError('');
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.logo}>🔑</Text>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.sub}>Enter your email and we'll send a 6-digit OTP to reset your password.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
          />

          <TouchableOpacity style={styles.btn} onPress={handle} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Sending OTP...' : 'Send OTP'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.switch}>Remember your password? <Text style={styles.link}>Sign in</Text></Text>
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
  sub: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  error: { color: '#ff4444', textAlign: 'center', marginBottom: 12, fontSize: 13, backgroundColor: '#fff0f0', padding: 10, borderRadius: 8 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16, color: '#333', backgroundColor: '#fafafa' },
  btn: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  switch: { textAlign: 'center', color: '#999', fontSize: 14, marginTop: 24 },
  link: { color: '#FF6B35', fontWeight: '700' },
});
