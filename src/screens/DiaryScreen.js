import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { mealsAPI } from '../services/api';

const BASE_URL = 'https://snapcalorie-backend-production.up.railway.app';

function MealThumb({ imageUrl }) {
  const [error, setError] = useState(false);
  const fullUri = imageUrl && !imageUrl.startsWith('http') ? `${BASE_URL}${imageUrl}` : imageUrl;
  if (fullUri && !error) {
    return (
      <Image
        source={{ uri: fullUri, headers: { Authorization: `Bearer ${global.authToken}` } }}
        style={styles.mealImg}
        onError={() => setError(true)}
      />
    );
  }
  return <Text style={{ fontSize: 24 }}>🍽️</Text>;
}

const WATER_GOAL = 8;

export default function DiaryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [meals, setMeals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [water, setWater] = useState(0);

  const fetchMeals = useCallback(async () => {
    try {
      const res = await mealsAPI.getAll();
      setMeals(res.data.data);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { fetchMeals(); }, [fetchMeals]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeals();
    setRefreshing(false);
  };

  const grouped = meals.reduce((acc, meal) => {
    const date = new Date(meal.analyzed_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(meal);
    return acc;
  }, {});

  const formatDate = (dateStr) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <Text style={styles.title}>SnapCalorie</Text>
          <Text style={styles.headerRight}>Food Diary</Text>
        </View>

        <View style={styles.waterCard}>
          <View style={styles.waterHeader}>
            <Text style={styles.waterTitle}>💧 Water Intake</Text>
            <Text style={styles.waterCount}>{water}/{WATER_GOAL} glasses</Text>
          </View>
          <View style={styles.waterGlasses}>
            {Array.from({ length: WATER_GOAL }).map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setWater(i + 1)}>
                <Text style={{ fontSize: 24, opacity: i < water ? 1 : 0.2 }}>💧</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.waterBtns}>
            <TouchableOpacity style={styles.waterRemove} onPress={() => setWater(w => Math.max(0, w - 1))}>
              <Text style={styles.waterRemoveText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.waterAdd} onPress={() => setWater(w => Math.min(WATER_GOAL, w + 1))}>
              <Text style={styles.waterAddText}>+ Add Glass</Text>
            </TouchableOpacity>
          </View>
        </View>

        {Object.keys(grouped).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyText}>No meals logged yet</Text>
            <Text style={styles.emptySub}>Tap + to add your first meal</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([date, dateMeals]) => (
            <View key={date} style={styles.group}>
              <Text style={styles.groupTitle}>{formatDate(date)}</Text>
              <View style={styles.mealList}>
                {dateMeals.map((meal, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.mealRow}
                    onPress={() => navigation.navigate('MealDetail', { meal })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.mealThumb}>
                      <MealThumb imageUrl={meal.image_url} />
                    </View>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName}>{meal.food_name}</Text>
                      <Text style={styles.mealCals}>{meal.calories} cal</Text>
                      <View style={styles.mealMacros}>
                        <Text style={styles.macro}>🔴 {Math.round(meal.protein_g)}g</Text>
                        <Text style={styles.macro}>🔵 {Math.round(meal.carbs_g)}g</Text>
                        <Text style={styles.macro}>🟡 {Math.round(meal.fat_g)}g</Text>
                      </View>
                    </View>
                    <Text style={styles.mealTime}>
                      {new Date(meal.analyzed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', color: '#FF6B35' },
  headerRight: { fontSize: 16, fontWeight: '600', color: '#333' },
  waterCard: { backgroundColor: '#fff', margin: 16, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  waterTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  waterCount: { fontSize: 13, color: '#999' },
  waterGlasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  waterBtns: { flexDirection: 'row', gap: 10 },
  waterRemove: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  waterRemoveText: { fontSize: 22, color: '#999' },
  waterAdd: { flex: 1, backgroundColor: '#4ECDC4', borderRadius: 12, alignItems: 'center', justifyContent: 'center', height: 44 },
  waterAddText: { color: 'white', fontWeight: '700', fontSize: 14 },
  group: { marginHorizontal: 16, marginBottom: 16 },
  groupTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 12 },
  mealList: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  mealThumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mealImg: { width: 56, height: 56 },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  mealCals: { fontSize: 13, fontWeight: '700', color: '#FF6B35', marginBottom: 4 },
  mealMacros: { flexDirection: 'row', gap: 8 },
  macro: { fontSize: 11, color: '#999' },
  mealTime: { fontSize: 11, color: '#999' },
  empty: { alignItems: 'center', padding: 48, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#333' },
  emptySub: { fontSize: 13, color: '#999' },
});