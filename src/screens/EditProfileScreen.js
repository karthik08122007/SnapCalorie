import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import AppModal from '../components/AppModal';


export default function EditProfileScreen({ navigation }) {
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(String(user?.age || ''));
  const [weight, setWeight] = useState(String(user?.weightKg || ''));
  const [height, setHeight] = useState(String(user?.heightCm || ''));
  const [gender, setGender] = useState(user?.gender || '');
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ visible: false, icon: '', title: '', message: '', confirmText: '', confirmDestructive: false, onConfirm: null });

  const showModal = (icon, title, message) => setModal({ visible: true, icon, title, message, onConfirm: null });
  const hideModal = () => setModal(prev => ({ ...prev, visible: false }));

  const handleSave = async () => {
    if (!name.trim()) { showModal('⚠️', 'Error', 'Name cannot be empty'); return; }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        age: age ? Number(age) : undefined,
        weightKg: weight ? Number(weight) : undefined,
        heightCm: height ? Number(height) : undefined,
        gender: gender || undefined,
      });
      showModal('✅', 'Saved', 'Profile updated successfully');
      navigation.goBack();
    } catch {
      showModal('❌', 'Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppModal visible={modal.visible} icon={modal.icon} title={modal.title} message={modal.message} onClose={hideModal} confirmText={modal.confirmText} onConfirm={modal.onConfirm} confirmDestructive={modal.confirmDestructive} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BASIC INFO</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.email || ''}
              editable={false}
              placeholderTextColor="#999"
            />
            <Text style={styles.hint}>Email cannot be changed</Text>

            <Text style={styles.label}>Age</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={age}
                onChangeText={setAge}
                placeholder="25"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.unit}>years</Text>
            </View>

            <Text style={styles.label}>Gender</Text>
            {user?.gender ? (
              <View style={styles.genderLocked}>
                <Text style={styles.genderLockedText}>
                  {user.gender === 'male' ? '♂️ Male' : '♀️ Female'}
                </Text>
                <View style={styles.genderLockBadge}>
                  <Text style={styles.genderLockBadgeText}>🔒 Cannot be changed</Text>
                </View>
              </View>
            ) : (
              <View style={styles.genderRow}>
                {[
                  { id: 'male', icon: '♂️', label: 'Male' },
                  { id: 'female', icon: '♀️', label: 'Female' },
                ].map(g => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.genderBtn, gender === g.id && styles.genderBtnActive]}
                    onPress={() => setGender(g.id)}
                  >
                    <Text style={styles.genderIcon}>{g.icon}</Text>
                    <Text style={[styles.genderText, gender === g.id && styles.genderTextActive]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Weight</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="70"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  <Text style={styles.unit}>kg</Text>
                </View>
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Height</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={height}
                    onChangeText={setHeight}
                    placeholder="175"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  <Text style={styles.unit}>cm</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#333' },
  content: { padding: 16 },
  avatarWrap: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#FF6B35', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36, fontWeight: '800', color: 'white' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#999', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 13, fontSize: 15, color: '#333', backgroundColor: '#fafafa' },
  inputDisabled: { backgroundColor: '#f5f5f5', color: '#999' },
  hint: { fontSize: 12, color: '#bbb', marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unit: { fontSize: 14, color: '#999', width: 36 },
  twoCol: { flexDirection: 'row', marginTop: 4 },
  genderLocked: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f5f5f5', borderRadius: 12, padding: 13, borderWidth: 1, borderColor: '#eee' },
  genderLockedText: { fontSize: 15, fontWeight: '600', color: '#555' },
  genderLockBadge: { backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  genderLockBadgeText: { fontSize: 11, color: '#999', fontWeight: '600' },
  genderRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  genderBtn: { flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, backgroundColor: '#fafafa' },
  genderBtnActive: { borderColor: '#FF6B35', backgroundColor: 'rgba(255,107,53,0.08)' },
  genderIcon: { fontSize: 22 },
  genderText: { fontSize: 14, fontWeight: '600', color: '#999' },
  genderTextActive: { color: '#FF6B35' },
  btn: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
