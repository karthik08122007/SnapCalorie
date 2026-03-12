import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    if (!currentPassword) return setError('Enter your current password.');
    if (newPassword.length < 8) return setError('New password must be at least 8 characters.');
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword))
      return setError('New password must contain at least one uppercase letter and one number.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    setError('');
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      Alert.alert('Password Changed', 'Your password has been updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
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

          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.sub}>Enter your current password and choose a new one.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.inputFlex} placeholder="Current password" placeholderTextColor="#999" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry={!showCurrent} />
            <TouchableOpacity onPress={() => setShowCurrent(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.inputFlex} placeholder="New password" placeholderTextColor="#999" value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showNew} />
            <TouchableOpacity onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Min 8 characters, 1 uppercase, 1 number</Text>

          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.inputFlex} placeholder="Confirm new password" placeholderTextColor="#999" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirm} />
            <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btn} onPress={handle} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Updating...' : 'Update Password'}</Text>
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
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  sub: { fontSize: 14, color: '#999', marginBottom: 28, lineHeight: 20 },
  error: { color: '#ff4444', marginBottom: 16, fontSize: 13, backgroundColor: '#fff0f0', padding: 10, borderRadius: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 12, backgroundColor: '#fafafa', marginBottom: 6 },
  inputFlex: { flex: 1, padding: 14, fontSize: 15, color: '#333' },
  eyeBtn: { paddingHorizontal: 14 },
  hint: { fontSize: 12, color: '#bbb', marginBottom: 20, paddingLeft: 4 },
  btn: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
