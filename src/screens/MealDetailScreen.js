import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Alert, StatusBar, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mealsAPI } from '../services/api';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://snapcalorie-backend-production.up.railway.app/api').replace('/api', '');

export default function MealDetailScreen({ route, navigation }) {
  const { meal } = route.params;
  const insets = useSafeAreaInsets();
  const [imgError, setImgError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rawUrl = meal.image_url;
  const imageUri = rawUrl && !rawUrl.startsWith('http') ? `${BASE_URL}${rawUrl}` : rawUrl;

  const handleDelete = () => {
    const mealId = meal._id || meal.id;
    Alert.alert('Delete Meal', 'Remove this meal from your diary?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          if (!mealId) {
            Alert.alert('Error', 'Meal ID not found — cannot delete');
            return;
          }
          setDeleting(true);
          try {
            await mealsAPI.delete(mealId);
            navigation.goBack();
          } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to delete meal';
            Alert.alert('Delete failed', msg);
            setDeleting(false);
          }
        }
      }
    ]);
  };

  const macroTotal = (meal.protein_g || 0) + (meal.carbs_g || 0) + (meal.fat_g || 0);
  const macros = [
    { label: 'Protein', value: meal.protein_g || 0, unit: 'g', color: '#FF6B35', pct: macroTotal > 0 ? Math.round((meal.protein_g / macroTotal) * 100) : 0 },
    { label: 'Carbs', value: meal.carbs_g || 0, unit: 'g', color: '#4ECDC4', pct: macroTotal > 0 ? Math.round((meal.carbs_g / macroTotal) * 100) : 0 },
    { label: 'Fat', value: meal.fat_g || 0, unit: 'g', color: '#FFD93D', pct: macroTotal > 0 ? Math.round((meal.fat_g / macroTotal) * 100) : 0 },
  ];

  const extras = [
    meal.fiber_g != null && { label: 'Fiber', value: meal.fiber_g, unit: 'g' },
    meal.sugar_g != null && { label: 'Sugar', value: meal.sugar_g, unit: 'g' },
    meal.sodium_mg != null && { label: 'Sodium', value: meal.sodium_mg, unit: 'mg' },
    meal.cholesterol_mg != null && { label: 'Cholesterol', value: meal.cholesterol_mg, unit: 'mg' },
  ].filter(Boolean);

  const showImage = imageUri && !imgError;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Details</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} disabled={deleting}>
          {deleting
            ? <ActivityIndicator size="small" color="#ff4444" />
            : <Ionicons name="trash-outline" size={22} color="#ff4444" />
          }
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {showImage ? (
          <Image
            source={{ uri: imageUri, headers: { Authorization: `Bearer ${global.authToken}` } }}
            style={styles.heroImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={{ fontSize: 64 }}>🍽️</Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.foodName}>{meal.food_name}</Text>
          <Text style={styles.timestamp}>
            {new Date(meal.analyzed_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}
            {new Date(meal.analyzed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>

          <View style={styles.calorieCard}>
            <Text style={styles.calorieLabel}>Total Calories</Text>
            <Text style={styles.calorieValue}>{meal.calories}</Text>
            <Text style={styles.calorieUnit}>kcal</Text>
          </View>

          <View style={styles.macroBarWrap}>
            {macros.map(m => (
              <View key={m.label} style={[styles.macroBarSegment, { flex: Math.max(m.pct, 1), backgroundColor: m.color }]} />
            ))}
          </View>

          <View style={styles.macroCards}>
            {macros.map(m => (
              <View key={m.label} style={styles.macroCard}>
                <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                <Text style={styles.macroValue}>{Math.round(m.value)}{m.unit}</Text>
                <Text style={styles.macroLabel}>{m.label}</Text>
                <Text style={styles.macroPct}>{m.pct}%</Text>
              </View>
            ))}
          </View>

          {extras.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>MORE NUTRITION</Text>
              <View style={styles.extrasCard}>
                {extras.map((e, i) => (
                  <View key={e.label} style={[styles.extraRow, i < extras.length - 1 && styles.extraBorder]}>
                    <Text style={styles.extraLabel}>{e.label}</Text>
                    <Text style={styles.extraValue}>{Math.round(e.value)} {e.unit}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#333' },
  deleteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroImage: { width: '100%', height: 240 },
  heroPlaceholder: { height: 200, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  foodName: { fontSize: 22, fontWeight: '800', color: '#333', marginBottom: 4 },
  timestamp: { fontSize: 13, color: '#999', marginBottom: 16 },
  calorieCard: { backgroundColor: '#FF6B35', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  calorieLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 4 },
  calorieValue: { fontSize: 52, fontWeight: '800', color: 'white', lineHeight: 60 },
  calorieUnit: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  macroBarWrap: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 16, gap: 2 },
  macroBarSegment: { borderRadius: 4 },
  macroCards: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  macroCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  macroDot: { width: 10, height: 10, borderRadius: 5 },
  macroValue: { fontSize: 18, fontWeight: '800', color: '#333' },
  macroLabel: { fontSize: 11, color: '#999' },
  macroPct: { fontSize: 11, fontWeight: '700', color: '#aaa' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },
  extrasCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  extraRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  extraBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  extraLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  extraValue: { fontSize: 14, fontWeight: '700', color: '#333' },
});
