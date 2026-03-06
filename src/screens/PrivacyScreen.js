import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function PrivacyScreen({ navigation }) {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => logout() },
      ]
    );
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
        { icon: 'download-outline', label: 'Export Your Data', desc: 'Download a copy of all your data', color: '#FFD93D', onPress: () => Alert.alert('Export Data', 'Your data export will be emailed to you within 24 hours.') },
        { icon: 'trash-outline', label: 'Delete Account', desc: 'Permanently delete your account and all data', color: '#ff4444', onPress: handleDeleteAccount },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
});
