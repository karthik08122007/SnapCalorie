import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Google Sign-In requires a native build — gracefully unavailable in Expo Go
let GoogleSignin = null;
let statusCodes = {};
try {
  const googleModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleModule.GoogleSignin;
  statusCodes = googleModule.statusCodes;
  GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID });
} catch {
  // Native module not available (Expo Go) — Google Sign-In will show "coming soon"
}

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, googleLogin } = useAuth();

  const handle = async () => {
    setLoading(true);
    setError('');
    try {
      await register(name, email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!GoogleSignin) {
      Alert.alert('Coming Soon', 'Google Sign-Up will be available in the next update.');
      return;
    }
    setGoogleLoading(true);
    setError('');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type === 'success') {
        await googleLogin(result.data.idToken);
      }
    } catch (err) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled, do nothing
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Sign in already in progress');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available');
      } else {
        setError(err.response?.data?.message || err.message || `Google sign-up failed (code: ${err.code})`);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.logo}>🥗</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.sub}>Start tracking your nutrition today</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#999" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <View style={styles.inputWrap}>
            <TextInput style={styles.inputFlex} placeholder="Password" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btn} onPress={handle} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Creating...' : 'Create Account'}</Text>
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
  sub: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 28 },
  error: { color: '#ff4444', textAlign: 'center', marginBottom: 12, fontSize: 13, backgroundColor: '#fff0f0', padding: 10, borderRadius: 8 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12, color: '#333', backgroundColor: '#fafafa' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 12, backgroundColor: '#fafafa', marginBottom: 12 },
  inputFlex: { flex: 1, padding: 14, fontSize: 15, color: '#333' },
  eyeBtn: { paddingHorizontal: 14 },
  btn: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#eee' },
  dividerText: { fontSize: 13, color: '#999' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 14, backgroundColor: '#fff', marginBottom: 20 },
  googleIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '600', color: '#333' },
  switch: { textAlign: 'center', color: '#999', fontSize: 14 },
  link: { color: '#FF6B35', fontWeight: '700' },
});
