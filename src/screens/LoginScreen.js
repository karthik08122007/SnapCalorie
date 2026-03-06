import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
});

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, googleLogin } = useAuth();

  const handleGoogleSignIn = async () => {
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
        setError(err.response?.data?.message || 'Google sign-in failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handle = async () => {
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.logo}>🥗</Text>
          <Text style={styles.title}>SnapCalorie</Text>
          <Text style={styles.sub}>Track your nutrition with AI</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <View style={styles.inputWrap}>
            <TextInput style={styles.inputFlex} placeholder="Password" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btn} onPress={handle} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn} disabled={googleLoading}>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>{googleLoading ? 'Signing in...' : 'Sign in with Google'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.switch}>Don't have an account? <Text style={styles.link}>Sign up</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, paddingBottom: 48 },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 8, marginTop: 40 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center', color: '#FF6B35', marginBottom: 4 },
  sub: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 32 },
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