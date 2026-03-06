import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';

const ACTIVITIES = [
  { id: 'sedentary', label: 'Sedentary (little/no exercise)' },
  { id: 'light', label: 'Lightly active (1-3 days/week)' },
  { id: 'moderate', label: 'Moderately active (3-5 days/week)' },
  { id: 'active', label: 'Very active (6-7 days/week)' },
  { id: 'extra', label: 'Extra active (physical job)' },
];

const GOALS = [
  { id: 'lose', icon: '🔥', label: 'Lose weight (Cut)' },
  { id: 'maintain', icon: '⚖️', label: 'Maintain weight' },
  { id: 'gain', icon: '💪', label: 'Gain muscle (Bulk)' },
];

export default function OnboardingActivityScreen({ navigation, route }) {
  const [activity, setActivity] = useState('');
  const [goal, setGoal] = useState('');
  const prevData = route.params;
  const canNext = activity && goal;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.logo}>🥗</Text>
        <Text style={styles.title}>Almost there!</Text>
        <Text style={styles.sub}>Tell us about your lifestyle and goal</Text>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '66%' }]} />
        </View>
        <Text style={styles.progressText}>Step 2 of 3</Text>

        <Text style={styles.label}>Activity Level</Text>
        {ACTIVITIES.map(a => (
          <TouchableOpacity key={a.id} style={[styles.optionBtn, activity === a.id && styles.optionBtnActive]} onPress={() => setActivity(a.id)}>
            <View style={[styles.radio, activity === a.id && styles.radioActive]}>
              {activity === a.id && <View style={styles.radioDot} />}
            </View>
            <Text style={[styles.optionText, activity === a.id && styles.optionTextActive]}>{a.label}</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.label, { marginTop: 20 }]}>Your Goal</Text>
        {GOALS.map(g => (
          <TouchableOpacity key={g.id} style={[styles.optionBtn, goal === g.id && styles.optionBtnActive]} onPress={() => setGoal(g.id)}>
            <Text style={styles.goalIcon}>{g.icon}</Text>
            <Text style={[styles.optionText, goal === g.id && styles.optionTextActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, !canNext && styles.btnDisabled]}
            onPress={() => navigation.navigate('OnboardingPlan', { ...prevData, activity, goal })}
            disabled={!canNext}
          >
            <Text style={styles.btnText}>Continue →</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('OnboardingPlan', { ...prevData, activity, goal })}>
          <Text style={styles.skip}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24 },
  logo: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#333', textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 20 },
  progressBar: { height: 5, backgroundColor: '#f0f0f0', borderRadius: 99, marginBottom: 6 },
  progressFill: { height: 5, backgroundColor: '#FF6B35', borderRadius: 99 },
  progressText: { fontSize: 11, color: '#999', textAlign: 'right', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 10 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginBottom: 8, backgroundColor: '#fafafa' },
  optionBtnActive: { borderColor: '#FF6B35', backgroundColor: 'rgba(255,107,53,0.06)' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: '#FF6B35' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B35' },
  goalIcon: { fontSize: 18 },
  optionText: { fontSize: 14, color: '#555', flex: 1 },
  optionTextActive: { color: '#FF6B35', fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  backBtn: { flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 15, alignItems: 'center' },
  backBtnText: { color: '#999', fontWeight: '600' },
  btn: { flex: 2, backgroundColor: '#FF6B35', borderRadius: 12, padding: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  skip: { textAlign: 'center', color: '#999', fontSize: 13, marginTop: 16 },
});