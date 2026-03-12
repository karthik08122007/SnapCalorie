/**
 * MealShareCard
 * A capturable card shown before sharing a meal.
 * Rendered inside a ViewShot ref in MealDetailScreen.
 */
import { View, Text, StyleSheet, Image } from 'react-native';

export default function MealShareCard({ meal, healthScore, healthMessage }) {
  return (
    <View style={styles.card}>
      {/* Header branding */}
      <View style={styles.header}>
        <Text style={styles.brand}>SnapCalorie</Text>
        <Text style={styles.brandTag}>AI Nutrition</Text>
      </View>

      {/* Meal name */}
      <Text style={styles.mealName} numberOfLines={2}>{meal.food_name}</Text>

      {/* Health score badge */}
      <View style={[styles.scoreBadge, { backgroundColor: scoreColor(healthScore) + '20', borderColor: scoreColor(healthScore) }]}>
        <Text style={[styles.scoreNum, { color: scoreColor(healthScore) }]}>{healthScore}</Text>
        <Text style={styles.scoreSub}>/10 Health Score</Text>
      </View>

      {/* Message */}
      <Text style={styles.scoreMsg}>{healthMessage}</Text>

      {/* Macro row */}
      <View style={styles.macroRow}>
        <MacroBox label="Calories" value={meal.calories} unit="kcal" color="#FF6B35" />
        <MacroBox label="Protein"  value={`${Math.round(meal.protein_g)}g`} unit="" color="#4ECDC4" />
        <MacroBox label="Carbs"    value={`${Math.round(meal.carbs_g)}g`}   unit="" color="#45B7D1" />
        <MacroBox label="Fat"      value={`${Math.round(meal.fat_g)}g`}     unit="" color="#FF6B6B" />
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Analyzed with SnapCalorie  •  snapcalorie.app</Text>
    </View>
  );
}

function MacroBox({ label, value, unit, color }) {
  return (
    <View style={styles.macroBox}>
      <Text style={[styles.macroVal, { color }]}>{value}</Text>
      {unit ? <Text style={styles.macroUnit}>{unit}</Text> : null}
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function scoreColor(score) {
  if (score >= 8) return '#4CAF50';
  if (score >= 6) return '#45B7D1';
  if (score >= 4) return '#FF9800';
  return '#FF6B6B';
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: 340,
    alignSelf: 'center',
    // Shadow for screenshot
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brand: { fontSize: 18, fontWeight: '900', color: '#FF6B35' },
  brandTag: { fontSize: 11, fontWeight: '600', color: '#aaa', backgroundColor: '#f5f5f5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  mealName: { fontSize: 20, fontWeight: '800', color: '#222', marginBottom: 16, lineHeight: 26 },
  scoreBadge: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
    alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8,
  },
  scoreNum: { fontSize: 26, fontWeight: '900' },
  scoreSub: { fontSize: 12, fontWeight: '600', color: '#888' },
  scoreMsg: { fontSize: 13, color: '#666', marginBottom: 20, lineHeight: 18 },
  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  macroBox: { flex: 1, backgroundColor: '#f8f8f8', borderRadius: 12, padding: 10, alignItems: 'center' },
  macroVal: { fontSize: 16, fontWeight: '800' },
  macroUnit: { fontSize: 9, color: '#aaa', fontWeight: '600', marginTop: -2 },
  macroLabel: { fontSize: 10, color: '#aaa', marginTop: 2 },
  footer: { fontSize: 10, color: '#ccc', textAlign: 'center', fontWeight: '500' },
});
