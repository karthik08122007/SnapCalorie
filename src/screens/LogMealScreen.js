import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, StatusBar, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { mealsAPI } from '../services/api';
import { getFoodHistory } from '../services/foodHistory';
import { compressMealImage } from '../utils/imageCompressor';
import { trackEvent } from '../utils/analytics';
import AppModal from '../components/AppModal';

export default function LogMealScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [analyzing, setAnalyzing] = useState(false);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('photo');
  const [mealType, setMealType] = useState('Breakfast');
  const [recentFoods, setRecentFoods] = useState([]);
  const [modal, setModal] = useState({ visible: false, icon: '', title: '', message: '', confirmText: '', confirmDestructive: false, onConfirm: null });

  const showModal = (icon, title, message) => setModal({ visible: true, icon, title, message, onConfirm: null });
  const hideModal = () => setModal(prev => ({ ...prev, visible: false }));

  const loadRecent = useCallback(async () => {
    const history = await getFoodHistory();
    setRecentFoods(history.slice(0, 6));
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  // Re-load when screen comes into focus (after a new meal is confirmed)
  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', loadRecent);
    return unsubscribe;
  }, [navigation, loadRecent]);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { showModal('🔔', 'Permission needed', 'Camera access is required'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) await analyzeImage(result.assets[0]);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) await analyzeImage(result.assets[0]);
  };

  const analyzeImage = async (asset) => {
    setAnalyzing(true);
    const scanStart = Date.now();
    trackEvent('meal_scan_started', { source: 'photo' });
    try {
      // Compress image before upload (resize to 1024px, JPEG 0.7)
      const compressedUri = await compressMealImage(asset.uri);
      const formData = new FormData();
      formData.append('image', { uri: compressedUri, type: 'image/jpeg', name: 'meal.jpg' });
      formData.append('mealType', mealType);
      const res = await mealsAPI.analyze(formData);
      const meal = res.data?.data || res.data;
      trackEvent('meal_scan_completed', { scan_time_ms: Date.now() - scanStart, source: 'photo' });
      navigation.navigate('MealReview', { meal, imageUri: asset.uri });
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'NOT_FOOD') {
        showModal('🚫', 'Not Food', data.message);
      } else {
        showModal('❌', 'Error', data?.message || 'Analysis failed. Please try again.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeText = async () => {
    if (!query.trim()) return;
    setAnalyzing(true);
    const scanStart = Date.now();
    trackEvent('meal_scan_started', { source: 'text' });
    try {
      const res = await mealsAPI.analyzeText(query, mealType);
      const meal = res.data?.data || res.data;
      trackEvent('meal_scan_completed', { scan_time_ms: Date.now() - scanStart, source: 'text' });
      navigation.navigate('MealReview', { meal, imageUri: null });
    } catch (err) {
      showModal('❌', 'Error', err.response?.data?.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  // Log a recent food directly using cached (verified) nutrition values
  const logRecentFood = (food) => {
    // Create a meal-shaped object from cached history — no AI re-estimation
    const meal = {
      food_name: food.food_name,
      calories: food.calories,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      _id: null, // no backend ID yet; MealReviewScreen will handle this
    };
    navigation.navigate('MealReview', { meal, imageUri: null });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppModal visible={modal.visible} icon={modal.icon} title={modal.title} message={modal.message} onClose={hideModal} confirmText={modal.confirmText} onConfirm={modal.onConfirm} confirmDestructive={modal.confirmDestructive} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.title}>Log Meal</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, mode === 'photo' && styles.tabActive]} onPress={() => setMode('photo')}>
          <Text style={[styles.tabText, mode === 'photo' && styles.tabTextActive]}>📸 Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, mode === 'text' && styles.tabActive]} onPress={() => setMode('text')}>
          <Text style={[styles.tabText, mode === 'text' && styles.tabTextActive]}>🔍 Search</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mealTypeRow}>
        {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.mealTypeBtn, mealType === type && styles.mealTypeBtnActive]}
            onPress={() => setMealType(type)}
          >
            <Text style={[styles.mealTypeBtnText, mealType === type && styles.mealTypeBtnTextActive]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {analyzing ? (
        <View style={styles.analyzing}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.analyzingText}>Analyzing your meal...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {mode === 'photo' ? (
            <View style={styles.photoContainer}>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Ionicons name="camera" size={36} color="#FF6B35" />
                <View style={styles.photoBtnText}>
                  <Text style={styles.photoBtnTitle}>Take Photo</Text>
                  <Text style={styles.photoBtnSub}>Use your camera to snap your meal</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                <Ionicons name="images" size={36} color="#4ECDC4" />
                <View style={styles.photoBtnText}>
                  <Text style={styles.photoBtnTitle}>Choose from Gallery</Text>
                  <Text style={styles.photoBtnSub}>Pick an existing photo</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or search by text</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity style={styles.switchToText} onPress={() => setMode('text')}>
                <Text style={styles.switchToTextText}>🔍 Search Food by Name</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.searchContainer}>
              <Text style={styles.searchLabel}>What did you eat?</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="e.g. 2 eggs and toast with butter"
                placeholderTextColor="#999"
                value={query}
                onChangeText={setQuery}
                multiline
              />
              <View style={styles.suggestions}>
                {['Bowl of rice', 'Chicken breast', 'Masala dosa', 'Banana'].map(s => (
                  <TouchableOpacity key={s} style={styles.chip} onPress={() => setQuery(s)}>
                    <Text style={styles.chipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.analyzeBtn, !query.trim() && styles.analyzeBtnDisabled]}
                onPress={analyzeText}
                disabled={!query.trim()}
              >
                <Text style={styles.analyzeBtnText}>Analyze Meal</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recent / verified foods */}
          {recentFoods.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Ionicons name="checkmark-circle" size={15} color="#22c55e" />
                <Text style={styles.recentTitle}>Quick Add (Verified)</Text>
              </View>
              <Text style={styles.recentSub}>Tap to log with your previously confirmed values — no AI guessing.</Text>
              {recentFoods.map((food, i) => (
                <TouchableOpacity key={i} style={styles.recentRow} onPress={() => logRecentFood(food)}>
                  <View style={styles.recentIcon}>
                    <Ionicons name="restaurant-outline" size={18} color="#FF6B35" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentName} numberOfLines={1}>{food.food_name}</Text>
                    <Text style={styles.recentMeta}>
                      {food.calories} kcal · {Math.round(food.protein_g)}g P · {Math.round(food.carbs_g)}g C · {Math.round(food.fat_g)}g F
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color="#FF6B35" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { padding: 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 22, fontWeight: '800', color: '#333' },
  tabs: { flexDirection: 'row', margin: 16, backgroundColor: '#f0f0f0', borderRadius: 12, padding: 4 },
  tab: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#999' },
  tabTextActive: { color: '#333' },
  mealTypeRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, gap: 8 },
  mealTypeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center', backgroundColor: '#fafafa' },
  mealTypeBtnActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  mealTypeBtnText: { fontSize: 12, fontWeight: '700', color: '#888' },
  mealTypeBtnTextActive: { color: '#fff' },
  photoContainer: { padding: 16, gap: 12 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  photoBtnText: { flex: 1 },
  photoBtnTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 2 },
  photoBtnSub: { fontSize: 12, color: '#999' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  divider: { flex: 1, height: 1, backgroundColor: '#eee' },
  dividerText: { fontSize: 12, color: '#999' },
  switchToText: { backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  switchToTextText: { fontSize: 15, fontWeight: '600', color: '#555' },
  analyzing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  analyzingText: { fontSize: 16, color: '#999' },
  searchContainer: { padding: 16, gap: 12 },
  searchLabel: { fontSize: 16, fontWeight: '700', color: '#333' },
  searchInput: { backgroundColor: '#fff', borderRadius: 16, padding: 16, fontSize: 15, color: '#333', minHeight: 100, textAlignVertical: 'top', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 99, borderWidth: 1, borderColor: '#eee' },
  chipText: { fontSize: 13, color: '#555' },
  analyzeBtn: { backgroundColor: '#FF6B35', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  // Recent/verified foods
  recentSection: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  recentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  recentTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  recentSub: { fontSize: 12, color: '#999', marginBottom: 12, lineHeight: 16 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  recentIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff5f0', alignItems: 'center', justifyContent: 'center' },
  recentName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  recentMeta: { fontSize: 12, color: '#999' },
});
