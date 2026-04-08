import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { version as appVersion } from '../../package.json';

const faqs = [
  { q: 'How do I log a meal?', a: 'Tap the + button at the bottom of the screen. You can take a photo of your food or search by name to log meals.' },
  { q: 'How accurate is the AI calorie detection?', a: 'Our AI provides estimates based on visual analysis. For best results, try to capture the full plate with good lighting.' },
  { q: 'Can I edit a logged meal?', a: 'Yes! Go to your Diary, tap on any meal entry, and you can edit or delete it.' },
  { q: 'How do I change my calorie goal?', a: 'Go to Profile → My Goals to update your daily calorie and macro targets.' },
  { q: 'Is my data private?', a: 'Yes. Your data is encrypted and never shared with third parties. See our Privacy section for more details.' },
];

export default function HelpSupportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.contactCard}>
          <Ionicons name="mail-outline" size={28} color="#FF6B35" />
          <Text style={styles.contactTitle}>Need more help?</Text>
          <Text style={styles.contactDesc}>Our support team typically responds within 24 hours</Text>
          <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL('mailto:support@snapcalorie.app')}>
            <Text style={styles.contactBtnText}>Email Support</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
        <View style={styles.card}>
          {faqs.map((faq, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.faqRow, i < faqs.length - 1 && styles.faqBorder]}
              onPress={() => setExpanded(expanded === i ? null : i)}
            >
              <View style={styles.faqQuestion}>
                <Text style={styles.faqQ}>{faq.q}</Text>
                <Ionicons name={expanded === i ? 'chevron-up' : 'chevron-down'} size={18} color="#999" />
              </View>
              {expanded === i && <Text style={styles.faqA}>{faq.a}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.version}>SnapCalorie v{appVersion}</Text>
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
  contactCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  contactTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 12, marginBottom: 6 },
  contactDesc: { fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 16 },
  contactBtn: { backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  contactBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  faqTitle: { fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  faqRow: { padding: 16 },
  faqBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  faqQuestion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQ: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1, paddingRight: 8 },
  faqA: { fontSize: 13, color: '#666', marginTop: 10, lineHeight: 20 },
  version: { textAlign: 'center', color: '#ccc', fontSize: 12, marginTop: 24 },
});
