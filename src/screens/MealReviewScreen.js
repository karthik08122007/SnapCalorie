import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  TextInput, Alert, StatusBar, Modal, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mealsAPI } from '../services/api';
import { saveFoodToHistory, findSimilarFood } from '../services/foodHistory';

const BASE_URL = 'https://snapcalorie-backend-production.up.railway.app';

// Normalize backend meal into a list of editable items
function initItems(meal) {
  if (meal.food_items && Array.isArray(meal.food_items) && meal.food_items.length > 0) {
    return meal.food_items.map((item, i) => ({
      id: String(i),
      name: item.name || item.food_name || 'Unknown item',
      calories: Number(item.calories) || 0,
      protein_g: Number(item.protein_g) || 0,
      carbs_g: Number(item.carbs_g) || 0,
      fat_g: Number(item.fat_g) || 0,
      serving_size: item.serving_size || item.quantity || '',
      alternatives: Array.isArray(item.alternatives) ? item.alternatives : [],
      portion: 1,
    }));
  }
  // Fallback: single aggregate item
  return [{
    id: '0',
    name: meal.food_name || 'Meal',
    calories: Number(meal.calories) || 0,
    protein_g: Number(meal.protein_g) || 0,
    carbs_g: Number(meal.carbs_g) || 0,
    fat_g: Number(meal.fat_g) || 0,
    serving_size: '',
    alternatives: [],
    portion: 1,
  }];
}

// ─── Per-item card ────────────────────────────────────────────────────────────
function FoodItemCard({ item, onRemove, onPortionChange, onSwap, swapping }) {
  const [expanded, setExpanded] = useState(false);
  const [portionText, setPortionText] = useState('1');
  const displayCalories = Math.round(item.calories * item.portion);

  return (
    <View style={ic.card}>
      {/* Name row */}
      <View style={ic.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={ic.name}>{item.name}</Text>
          <Text style={ic.meta}>
            {displayCalories} calories{item.serving_size ? `, ${item.serving_size}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Edit portion size */}
      <TouchableOpacity style={ic.editRow} onPress={() => setExpanded(v => !v)}>
        <Text style={ic.editText}>Edit portion size</Text>
        <Ionicons name="create-outline" size={13} color="#4A90E2" />
      </TouchableOpacity>

      {expanded && (
        <View style={ic.portionRow}>
          {[0.5, 1, 1.5, 2].map(p => (
            <TouchableOpacity
              key={p}
              style={[ic.portionChip, item.portion === p && ic.portionChipActive]}
              onPress={() => { onPortionChange(p); setPortionText(String(p)); }}
            >
              <Text style={[ic.portionChipText, item.portion === p && ic.portionChipTextActive]}>
                {p === 0.5 ? '½x' : p === 1.5 ? '1½x' : `${p}x`}
              </Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={ic.portionInput}
            value={portionText}
            onChangeText={(v) => {
              setPortionText(v);
              const n = parseFloat(v);
              if (!isNaN(n) && n > 0) onPortionChange(n);
            }}
            keyboardType="decimal-pad"
            placeholder="×"
            maxLength={5}
            placeholderTextColor="#bbb"
          />
        </View>
      )}

      {/* Macro mini-row */}
      <View style={ic.macroRow}>
        <Text style={ic.macroItem}><Text style={{ color: '#FF6B6B' }}>{Math.round(item.protein_g * item.portion)}g</Text> protein</Text>
        <Text style={ic.macroItem}><Text style={{ color: '#4ECDC4' }}>{Math.round(item.carbs_g * item.portion)}g</Text> carbs</Text>
        <Text style={ic.macroItem}><Text style={{ color: '#FFD93D' }}>{Math.round(item.fat_g * item.portion)}g</Text> fat</Text>
      </View>

      {/* Could also be */}
      {item.alternatives.length > 0 && (
        <View style={ic.altSection}>
          <Text style={ic.altLabel}>Could also be:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
              {item.alternatives.map(alt => (
                <TouchableOpacity
                  key={alt}
                  style={[ic.altChip, swapping && { opacity: 0.5 }]}
                  onPress={() => onSwap(alt)}
                  disabled={swapping}
                >
                  {swapping ? (
                    <ActivityIndicator size="small" color="#555" style={{ marginRight: 4 }} />
                  ) : null}
                  <Text style={ic.altChipText}>{alt}  +</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function MealReviewScreen({ route, navigation }) {
  const { meal, imageUri } = route.params;
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState(() => initItems(meal));
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showFullNutrition, setShowFullNutrition] = useState(false);
  const [swappingItemId, setSwappingItemId] = useState(null);

  // Previous match banner
  const [prevMatch, setPrevMatch] = useState(null); // { food_name, calories, protein_g, carbs_g, fat_g }
  const [prevDismissed, setPrevDismissed] = useState(false);

  // On mount, check if this food was analyzed before and we have cached values
  useEffect(() => {
    findSimilarFood(meal.food_name).then(match => {
      if (match) setPrevMatch(match);
    });
  }, [meal.food_name]);

  // Refine modal
  const [showRefine, setShowRefine] = useState(false);
  const [refineQuery, setRefineQuery] = useState('');
  const [refining, setRefining] = useState(false);

  // Aggregate totals
  const totals = useMemo(() => items.reduce(
    (acc, item) => ({
      calories: acc.calories + Math.round(item.calories * item.portion),
      protein_g: acc.protein_g + Math.round(item.protein_g * item.portion),
      carbs_g: acc.carbs_g + Math.round(item.carbs_g * item.portion),
      fat_g: acc.fat_g + Math.round(item.fat_g * item.portion),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  ), [items]);

  // Image
  const rawUrl = meal.image_url;
  const serverImageUri = rawUrl && !rawUrl.startsWith('http') ? `${BASE_URL}${rawUrl}` : rawUrl;
  const displayImage = imageUri || (!imgError && serverImageUri ? serverImageUri : null);

  // Extra nutrition from original meal object
  const fiber = meal.fiber_g != null ? meal.fiber_g : null;
  const sugar = meal.sugar_g != null ? meal.sugar_g : null;
  const sodium = meal.sodium_mg != null ? meal.sodium_mg : null;
  const cholesterol = meal.cholesterol_mg != null ? meal.cholesterol_mg : null;

  const removeItem = (id) => {
    if (items.length === 1) {
      Alert.alert('Cannot remove', 'At least one food item is required.');
      return;
    }
    Alert.alert('Remove item', 'Remove this item from the meal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setItems(prev => prev.filter(i => i.id !== id)) },
    ]);
  };

  const updatePortion = (id, portion) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, portion } : i));
  };

  const swapAlternative = async (itemId, alternativeName) => {
    setSwappingItemId(itemId);
    try {
      const res = await mealsAPI.analyzeText(alternativeName, 'Snack');
      const newData = res.data?.data || res.data;
      // Delete the newly created meal to avoid polluting the diary
      const newId = newData._id || newData.id;
      if (newId) { try { await mealsAPI.delete(newId); } catch {} }

      setItems(prev => prev.map(i =>
        i.id === itemId
          ? {
              ...i,
              name: alternativeName,
              calories: Number(newData.calories) || i.calories,
              protein_g: Number(newData.protein_g) || i.protein_g,
              carbs_g: Number(newData.carbs_g) || i.carbs_g,
              fat_g: Number(newData.fat_g) || i.fat_g,
            }
          : i
      ));
    } catch {
      // Just rename if fetch fails
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, name: alternativeName } : i));
    } finally {
      setSwappingItemId(null);
    }
  };

  const handleRefine = async () => {
    if (!refineQuery.trim()) return;
    setRefining(true);
    try {
      const res = await mealsAPI.analyzeText(refineQuery, 'Snack');
      const refined = res.data?.data || res.data;
      const newId = refined._id || refined.id;
      if (newId) { try { await mealsAPI.delete(newId); } catch {} }
      setItems(initItems({ ...refined, _id: meal._id, id: meal.id }));
      setShowRefine(false);
      setRefineQuery('');
    } catch {
      Alert.alert('Error', 'Could not re-analyze. Try editing values manually.');
    } finally {
      setRefining(false);
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    const confirmedName = items.map(i => i.name).join(', ');
    const existingId = meal._id || meal.id;
    try {
      if (existingId) {
        // Meal already exists in backend — just patch the values
        await mealsAPI.update(existingId, {
          calories: totals.calories,
          protein_g: totals.protein_g,
          carbs_g: totals.carbs_g,
          fat_g: totals.fat_g,
          food_name: confirmedName,
        });
      } else {
        // Quick-add from history — create a new meal via text analysis
        const res = await mealsAPI.analyzeText(confirmedName, 'Snack');
        const created = res.data?.data || res.data;
        const newId = created._id || created.id;
        if (newId) {
          await mealsAPI.update(newId, {
            calories: totals.calories,
            protein_g: totals.protein_g,
            carbs_g: totals.carbs_g,
            fat_g: totals.fat_g,
            food_name: confirmedName,
          });
        }
      }
    } catch {
      // Best-effort; navigate anyway
    } finally {
      setSaving(false);
    }
    // Save verified nutrition to local history for consistent future lookups
    await saveFoodToHistory({
      food_name: confirmedName,
      calories: totals.calories,
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
      logged_at: new Date().toISOString(),
    });
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Entry</Text>
        <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn} disabled={saving}>
          <Ionicons name="checkmark" size={28} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image + nutrition overlay */}
        <View style={styles.heroWrap}>
          {displayImage ? (
            <Image
              source={imageUri
                ? { uri: imageUri }
                : { uri: serverImageUri, headers: { Authorization: `Bearer ${global.authToken}` } }
              }
              style={styles.heroImage}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={{ fontSize: 64 }}>🍽️</Text>
            </View>
          )}

          <View style={styles.nutritionOverlay}>
            <View style={styles.overlayItem}>
              <Text style={[styles.overlayValue, { color: '#4ECDC4' }]}>{totals.calories}</Text>
              <Text style={styles.overlayLabel}>Calories</Text>
            </View>
            <View style={styles.overlaySep} />
            <View style={styles.overlayItem}>
              <Text style={[styles.overlayValue, { color: '#FF6B6B' }]}>{totals.fat_g}</Text>
              <Text style={styles.overlayLabel}>Fat (g)</Text>
            </View>
            <View style={styles.overlaySep} />
            <View style={styles.overlayItem}>
              <Text style={[styles.overlayValue, { color: '#FFD93D' }]}>{totals.carbs_g}</Text>
              <Text style={styles.overlayLabel}>Carbs (g)</Text>
            </View>
            <View style={styles.overlaySep} />
            <View style={styles.overlayItem}>
              <Text style={[styles.overlayValue, { color: '#A78BFA' }]}>{totals.protein_g}</Text>
              <Text style={styles.overlayLabel}>Protein (g)</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Previously verified banner */}
          {prevMatch && !prevDismissed && (
            <View style={styles.prevBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
              <View style={{ flex: 1 }}>
                <Text style={styles.prevBannerTitle}>Previously verified values found</Text>
                <Text style={styles.prevBannerSub}>
                  Last time: {prevMatch.calories} kcal · {Math.round(prevMatch.protein_g)}g protein · {Math.round(prevMatch.carbs_g)}g carbs · {Math.round(prevMatch.fat_g)}g fat
                </Text>
              </View>
              <TouchableOpacity
                style={styles.prevUseBtn}
                onPress={() => {
                  setItems([{
                    id: '0',
                    name: prevMatch.food_name,
                    calories: prevMatch.calories,
                    protein_g: prevMatch.protein_g,
                    carbs_g: prevMatch.carbs_g,
                    fat_g: prevMatch.fat_g,
                    serving_size: '',
                    alternatives: [],
                    portion: 1,
                  }]);
                  setPrevDismissed(true);
                }}
              >
                <Text style={styles.prevUseBtnText}>Use</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPrevDismissed(true)} style={{ padding: 4 }}>
                <Ionicons name="close" size={16} color="#999" />
              </TouchableOpacity>
            </View>
          )}

          {/* Full nutrition expandable */}
          {(fiber != null || sugar != null || sodium != null || cholesterol != null) && (
            <TouchableOpacity style={styles.fullNutritionBtn} onPress={() => setShowFullNutrition(v => !v)}>
              <Text style={styles.fullNutritionText}>
                {showFullNutrition ? 'Hide' : 'See'} full nutritional information
              </Text>
              <Ionicons name={showFullNutrition ? 'chevron-up' : 'chevron-down'} size={14} color="#4A90E2" />
            </TouchableOpacity>
          )}
          {showFullNutrition && (
            <View style={styles.extraCard}>
              {fiber != null && <View style={styles.extraRow}><Text style={styles.extraLabel}>Fiber</Text><Text style={styles.extraVal}>{Math.round(fiber)} g</Text></View>}
              {sugar != null && <View style={styles.extraRow}><Text style={styles.extraLabel}>Sugar</Text><Text style={styles.extraVal}>{Math.round(sugar)} g</Text></View>}
              {sodium != null && <View style={styles.extraRow}><Text style={styles.extraLabel}>Sodium</Text><Text style={styles.extraVal}>{Math.round(sodium)} mg</Text></View>}
              {cholesterol != null && <View style={styles.extraRow}><Text style={styles.extraLabel}>Cholesterol</Text><Text style={styles.extraVal}>{Math.round(cholesterol)} mg</Text></View>}
            </View>
          )}

          {/* Per-item cards */}
          {items.map(item => (
            <FoodItemCard
              key={item.id}
              item={item}
              onRemove={() => removeItem(item.id)}
              onPortionChange={(p) => updatePortion(item.id, p)}
              onSwap={(alt) => swapAlternative(item.id, alt)}
              swapping={swappingItemId === item.id}
            />
          ))}

          {/* Refine button */}
          <TouchableOpacity style={styles.refineRow} onPress={() => setShowRefine(true)}>
            <Ionicons name="help-circle-outline" size={15} color="#999" />
            <Text style={styles.refineRowText}>AI got something wrong? Tap to correct</Text>
            <Ionicons name="chevron-forward" size={14} color="#ccc" />
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* Bottom confirm */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={saving}>
          <Ionicons name="checkmark-circle" size={22} color="white" />
          <Text style={styles.confirmText}>{saving ? 'Saving...' : 'Confirm & Log Meal'}</Text>
        </TouchableOpacity>
      </View>

      {/* Refine modal */}
      <Modal visible={showRefine} transparent animationType="slide" onRequestClose={() => setShowRefine(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowRefine(false)} />
          <View style={styles.refineModal}>
            <View style={styles.refineHandle} />
            <Text style={styles.refineTitle}>Correct AI Analysis</Text>
            <Text style={styles.refineSubtitle}>Describe what was wrong. Be specific about food items and quantities.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {['Those are spiced potatoes, not chicken', '2 chapatis not 3', 'That is paneer, not tofu'].map(ex => (
                <TouchableOpacity key={ex} style={styles.exampleChip} onPress={() => setRefineQuery(ex)}>
                  <Text style={styles.exampleChipText}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.refineInput}
              value={refineQuery}
              onChangeText={setRefineQuery}
              placeholder="Describe what AI missed or got wrong..."
              placeholderTextColor="#bbb"
              multiline
              autoFocus
              maxLength={300}
            />
            <View style={styles.refineBtns}>
              <TouchableOpacity style={styles.refineCancelBtn} onPress={() => { setShowRefine(false); setRefineQuery(''); }}>
                <Text style={styles.refineCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.refineSubmitBtn, (!refineQuery.trim() || refining) && styles.refineSubmitDisabled]}
                onPress={handleRefine}
                disabled={!refineQuery.trim() || refining}
              >
                {refining
                  ? <ActivityIndicator size="small" color="white" />
                  : <Ionicons name="refresh" size={16} color="white" />
                }
                <Text style={styles.refineSubmitText}>{refining ? 'Analyzing...' : 'Re-analyze'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Item card styles ─────────────────────────────────────────────────────────
const ic = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginBottom: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 2 },
  meta: { fontSize: 13, color: '#888' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginBottom: 4 },
  editText: { fontSize: 13, color: '#4A90E2', fontWeight: '500' },
  portionRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8, marginTop: 4 },
  portionChip: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fafafa',
  },
  portionChipActive: { borderColor: '#FF6B35', backgroundColor: 'rgba(255,107,53,0.08)' },
  portionChipText: { fontSize: 12, fontWeight: '700', color: '#999' },
  portionChipTextActive: { color: '#FF6B35' },
  portionInput: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: '700',
    color: '#333', textAlign: 'center', width: 52, backgroundColor: '#fafafa',
  },
  macroRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  macroItem: { fontSize: 12, color: '#999' },
  altSection: { marginTop: 8 },
  altLabel: { fontSize: 12, color: '#888', fontWeight: '500' },
  altChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 99, borderWidth: 1, borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  altChipText: { fontSize: 13, color: '#444' },
});

// ─── Screen styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#333' },
  heroWrap: { position: 'relative' },
  heroImage: { width: '100%', height: 260 },
  heroPlaceholder: { width: '100%', height: 200, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  nutritionOverlay: {
    flexDirection: 'row', backgroundColor: 'rgba(20,20,20,0.80)',
    paddingVertical: 14, paddingHorizontal: 8,
  },
  overlayItem: { flex: 1, alignItems: 'center' },
  overlayValue: { fontSize: 20, fontWeight: '800' },
  overlayLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  overlaySep: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },
  content: { paddingTop: 4 },
  fullNutritionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  fullNutritionText: { fontSize: 13, color: '#4A90E2', fontWeight: '600' },
  extraCard: { backgroundColor: '#fff', paddingHorizontal: 16, marginBottom: 1, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  extraRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
  extraLabel: { fontSize: 14, color: '#555' },
  extraVal: { fontSize: 14, fontWeight: '700', color: '#333' },
  refineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, padding: 14, backgroundColor: '#fff',
    borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0',
  },
  refineRowText: { flex: 1, fontSize: 13, color: '#999' },
  bottomBar: { backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  confirmBtn: {
    backgroundColor: '#FF6B35', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  confirmText: { color: 'white', fontWeight: '700', fontSize: 16 },
  // Refine modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  refineModal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32 },
  refineHandle: { width: 40, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  refineTitle: { fontSize: 18, fontWeight: '800', color: '#333', marginBottom: 6 },
  refineSubtitle: { fontSize: 13, color: '#999', marginBottom: 14, lineHeight: 18 },
  exampleChip: {
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff8f5',
    borderRadius: 99, borderWidth: 1, borderColor: '#ffe8df',
  },
  exampleChipText: { fontSize: 12, color: '#FF6B35', fontWeight: '500' },
  refineInput: {
    backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#eee',
    borderRadius: 14, padding: 14, fontSize: 14, color: '#333',
    minHeight: 80, textAlignVertical: 'top', marginBottom: 16,
  },
  refineBtns: { flexDirection: 'row', gap: 10 },
  refineCancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, padding: 14, alignItems: 'center' },
  refineCancelText: { fontSize: 15, fontWeight: '600', color: '#999' },
  refineSubmitBtn: {
    flex: 2, backgroundColor: '#FF6B35', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  refineSubmitDisabled: { opacity: 0.5 },
  refineSubmitText: { fontSize: 15, fontWeight: '700', color: 'white' },
  // Previously verified banner
  prevBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    marginHorizontal: 0, marginBottom: 1, paddingHorizontal: 16, paddingVertical: 12,
  },
  prevBannerTitle: { fontSize: 13, fontWeight: '700', color: '#16a34a', marginBottom: 2 },
  prevBannerSub: { fontSize: 11, color: '#4ade80' },
  prevUseBtn: {
    backgroundColor: '#22c55e', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  prevUseBtnText: { fontSize: 13, fontWeight: '700', color: 'white' },
});
