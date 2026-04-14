import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar,
  Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import AppModal from '../components/AppModal';

const DELETE_REASONS = [
  "I'm not using it anymore",
  "Too many bugs or issues",
  "Missing features I need",
  "Privacy concerns",
  "Switching to another app",
  "Other",
];

export default function PrivacyScreen({ navigation }) {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0); // 0=closed, 1=reason, 2=password
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, icon: '', title: '', message: '', confirmText: '', confirmDestructive: false, onConfirm: null });

  const showModal = (icon, title, message) => setModal({ visible: true, icon, title, message, onConfirm: null });
  const hideModal = () => setModal(prev => ({ ...prev, visible: false }));

  const openDeleteFlow = () => {
    setReason('');
    setPassword('');
    setStep(1);
  };

  const closeModal = () => {
    setStep(0);
    setReason('');
    setPassword('');
  };

  const handleConfirmDelete = async () => {
    if (!password.trim()) {
      showModal('⚠️', 'Required', 'Please enter your password to confirm.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.deleteAccount({ password });
      setStep(0);
      await logout();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Incorrect password. Please try again.';
      showModal('❌', 'Deletion Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      title: 'Data & Privacy',
      items: [
        { icon: 'lock-closed-outline', label: 'Data Encryption', desc: 'All your data is encrypted at rest and in transit', color: '#4ECDC4' },
        { icon: 'server-outline', label: 'Data Storage', desc: 'Your data is stored securely on our servers', color: '#45B7D1' },
        { icon: 'share-outline', label: 'Data Sharing', desc: 'We never sell your personal data to third parties', color: '#96CEB4' },
      ],
    },
    {
      title: 'Your Rights',
      items: [
        { icon: 'download-outline', label: 'Export Your Data', desc: 'Download a PDF of all your meals', color: '#FFD93D', onPress: () => navigation.navigate('ProfileMain') },
        { icon: 'trash-outline', label: 'Delete Account', desc: 'Permanently delete your account and all data', color: '#ff4444', onPress: openDeleteFlow },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppModal visible={modal.visible} icon={modal.icon} title={modal.title} message={modal.message} onClose={hideModal} confirmText={modal.confirmText} onConfirm={modal.onConfirm} confirmDestructive={modal.confirmDestructive} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.row, i < section.items.length - 1 && styles.rowBorder]}
                  onPress={item.onPress}
                  activeOpacity={item.onPress ? 0.7 : 1}
                >
                  <View style={[styles.iconWrap, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowDesc}>{item.desc}</Text>
                  </View>
                  {item.onPress && <Ionicons name="chevron-forward" size={18} color="#ddd" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Step 1 — Reason Modal */}
      <Modal visible={step === 1} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Why are you leaving?</Text>
            <Text style={styles.sheetSub}>Your feedback helps us improve SnapCalorie.</Text>

            {DELETE_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.reasonRow, reason === r && styles.reasonRowActive]}
                onPress={() => setReason(r)}
              >
                <View style={[styles.radio, reason === r && styles.radioActive]}>
                  {reason === r && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.nextBtn, !reason && styles.nextBtnDisabled]}
              onPress={() => reason && setStep(2)}
              disabled={!reason}
            >
              <Text style={styles.nextBtnText}>Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={closeModal} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Step 2 — Password Confirmation Modal */}
      <Modal visible={step === 2} transparent animationType="slide" onRequestClose={() => setStep(1)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.warningIcon}>
              <Ionicons name="warning" size={32} color="#ff4444" />
            </View>

            <Text style={styles.sheetTitle}>Delete Account</Text>
            <Text style={styles.sheetSub}>
              This will permanently delete your account, all meals, and nutrition data. This cannot be undone.
            </Text>

            <Text style={styles.fieldLabel}>Enter your password to confirm</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                placeholderTextColor="#bbb"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.deleteBtn, loading && styles.deleteBtnDisabled]}
              onPress={handleConfirmDelete}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.deleteBtnText}>Yes, Delete My Account</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep(1)} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#333' },
  content: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  rowDesc: { fontSize: 12, color: '#999' },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#e0e0e0', borderRadius: 99, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#333', textAlign: 'center', marginBottom: 6 },
  sheetSub: { fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  warningIcon: { alignItems: 'center', marginBottom: 12 },
  // Reasons
  reasonRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', marginBottom: 8, gap: 12 },
  reasonRowActive: { borderColor: '#FF6B35', backgroundColor: '#FF6B3508' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: '#FF6B35' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF6B35' },
  reasonText: { fontSize: 14, color: '#555' },
  reasonTextActive: { color: '#FF6B35', fontWeight: '600' },
  // Password
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 20 },
  input: { flex: 1, padding: 14, fontSize: 15, color: '#333' },
  eyeBtn: { padding: 14 },
  // Buttons
  nextBtn: { backgroundColor: '#FF6B35', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  nextBtnDisabled: { backgroundColor: '#ffcbb8' },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteBtn: { backgroundColor: '#ff4444', borderRadius: 14, padding: 16, alignItems: 'center' },
  deleteBtnDisabled: { opacity: 0.6 },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelLink: { alignItems: 'center', marginTop: 16 },
  cancelLinkText: { color: '#999', fontSize: 14 },
});
