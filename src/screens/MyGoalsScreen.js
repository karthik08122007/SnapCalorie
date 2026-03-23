import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import AppModal from '../components/AppModal';

const ACTIVITIES = [
  { id: 'sedentary', label: 'Sedentary (little/no exercise)' },
  { id: 'light', label: 'Lightly active (1–3 days/week)' },
  { id: 'moderate', label: 'Moderately active (3–5 days/week)' },
  { id: 'active', label: 'Very active (6–7 days/week)' },
  { id: 'extra', label: 'Extra active (physical job)' },
];

const GOALS = [
  { id: 'lose', icon: '🔥', label: 'Lose weight (Cut)' },
  { id: 'maintain', icon: '⚖️', label: 'Maintain weight' },
  { id: 'gain', icon: '💪', label: 'Gain muscle (Bulk)' },
];

export default function MyGoalsScreen({ navigation }) {
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [calories, setCalories] = useState(String(user?.dailyCalorieGoal || '2000'));
  const [protein, setProtein] = useState(String(user?.proteinGoal || '150'));
  const [carbs, setCarbsGoal] = useState(String(user?.carbsGoal || '200'));
  const [fat, setFat] = useState(String(user?.fatGoal || '65'));
  const [activity, setActivity] = useState(user?.activityLevel || '');
  const [goal, setGoal] = useState(user?.goal || '');
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ visible: false, icon: '', title: '', message: '', confirmText: '', confirmDestructive: false, onConfirm: null });

  const showModal = (icon, title, message) => setModal({ visible: true, icon, title, message, onConfirm: null });
  const hideModal = () => setModal(prev => ({ ...prev, visible: false }));

  const handleSave = async () => {
    if (!calories || isNaN(calories)) { showModal('⚠️', 'Error', 'Enter a valid calorie goal'); return; }
    setSaving(true);
    try {
      await updateProfile({
        dailyCalorieGoal: Number(calories),
        proteinGoal: Number(protein),
        carbsGoal: Number(carbs),
        fatGoal: Number(fat),
        activityLevel: activity || undefined,
        goal: goal || undefined,
      });
      showModal('✅', 'Saved', 'Goals updated successfully');
      navigation.goBack();
    } catch {
      showModal('❌', 'Error', 'Failed to save goals');
    } finally {
      setSaving(false);
    }
  };

  const GoalInput = ({ label, value, onChange, unit, color }) => (
    <View style={styles.goalRow}>
      <View style={[styles.goalDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.goalLabel}>{label}</Text>
      </View>
      <TextInput
        style={styles.goalInput}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        maxLength={5}
      />
      <Text style={styles.goalUnit}>{unit}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppModal visible={modal.visible} icon={modal.icon} title={modal.title} message={modal.message} onClose={hideModal} confirmText={modal.confirmText} onConfirm={modal.onConfirm} confirmDestructive={modal.confirmDestructive} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>My Goals</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Daily Nutrition Targets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DAILY TARGETS</Text>
          <View style={styles.card}>
            <GoalInput label="Calories" value={calories} onChange={setCalories} unit="kcal" color="#FF6B35" />
            <GoalInput label="Protein" value={protein} onChange={setProtein} unit="g" color="#4ECDC4" />
            <GoalInput label="Carbohydrates" value={carbs} onChange={setCarbsGoal} unit="g" color="#45B7D1" />
            <GoalInput label="Fat" value={fat} onChange={setFat} unit="g" color="#FFD93D" />
          </View>
        </View>

        {/* Activity Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIVITY LEVEL</Text>
          <View style={styles.card}>
            {ACTIVITIES.map(a => (
              <TouchableOpacity
                key={a.id}
                style={[styles.optionBtn, activity === a.id && styles.optionBtnActive]}
                onPress={() => setActivity(a.id)}
              >
                <View style={[styles.radio, activity === a.id && styles.radioActive]}>
                  {activity === a.id && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.optionText, activity === a.id && styles.optionTextActive]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MY GOAL</Text>
          <View style={styles.card}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.optionBtn, goal === g.id && styles.optionBtnActive]}
                onPress={() => setGoal(g.id)}
              >
                <Text style={styles.goalIcon}>{g.icon}</Text>
                <Text style={[styles.optionText, goal === g.id && styles.optionTextActive]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save Goals'}</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
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
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#999', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  goalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 12 },
  goalDot: { width: 10, height: 10, borderRadius: 5 },
  goalLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  goalInput: { width: 72, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8, fontSize: 15, fontWeight: '600', color: '#333', textAlign: 'center', backgroundColor: '#fafafa' },
  goalUnit: { fontSize: 13, color: '#999', width: 36 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginBottom: 8, backgroundColor: '#fafafa' },
  optionBtnActive: { borderColor: '#FF6B35', backgroundColor: 'rgba(255,107,53,0.06)' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: '#FF6B35' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B35' },
  goalIcon: { fontSize: 18 },
  optionText: { fontSize: 14, color: '#555', flex: 1 },
  optionTextActive: { color: '#FF6B35', fontWeight: '600' },
  btn: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
