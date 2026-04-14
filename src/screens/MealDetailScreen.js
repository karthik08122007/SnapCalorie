import { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, StatusBar, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mealsAPI, API_URL } from '../services/api';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import MealShareCard from '../components/MealShareCard';
import { calculateMealHealthScore } from '../utils/mealHealthScore';
import { trackEvent } from '../utils/analytics';
import AppModal from '../components/AppModal';

const BASE_URL = API_URL ? API_URL.replace('/api', '') : '';

export default function MealDetailScreen({ route, navigation }) {
  const { meal } = route.params;
  const insets = useSafeAreaInsets();
  const [imgError, setImgError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    calories: String(meal.calories || ''),
    protein_g: String(meal.protein_g || ''),
    carbs_g: String(meal.carbs_g || ''),
    fat_g: String(meal.fat_g || ''),
  });
  const [mealData, setMealData] = useState(meal);
  const shareCardRef = useRef(null);
  const [modal, setModal] = useState({ visible: false, icon: '', title: '', message: '', confirmText: '', confirmDestructive: false, onConfirm: null });

  const showModal = (icon, title, message) => setModal({ visible: true, icon, title, message, onConfirm: null });
  const showConfirmModal = (icon, title, message, confirmText, onConfirm, confirmDestructive = false) => setModal({ visible: true, icon, title, message, confirmText, onConfirm, confirmDestructive });
  const hideModal = () => setModal(prev => ({ ...prev, visible: false }));

  const handleSaveEdit = async () => {
    const mealId = mealData._id || mealData.id;
    if (!mealId) { showModal('❌', 'Error', 'Cannot edit this meal'); return; }
    const calories = Number(editData.calories);
    const protein_g = Number(editData.protein_g);
    const carbs_g = Number(editData.carbs_g);
    const fat_g = Number(editData.fat_g);
    if (isNaN(calories) || calories < 0 || calories > 9999) { showModal('⚠️', 'Invalid Value', 'Calories must be between 0 and 9999.'); return; }
    if (isNaN(protein_g) || protein_g < 0 || protein_g > 999) { showModal('⚠️', 'Invalid Value', 'Protein must be between 0 and 999g.'); return; }
    if (isNaN(carbs_g) || carbs_g < 0 || carbs_g > 999) { showModal('⚠️', 'Invalid Value', 'Carbs must be between 0 and 999g.'); return; }
    if (isNaN(fat_g) || fat_g < 0 || fat_g > 999) { showModal('⚠️', 'Invalid Value', 'Fat must be between 0 and 999g.'); return; }
    setSaving(true);
    try {
      const updated = { calories, protein_g, carbs_g, fat_g };
      await mealsAPI.update(mealId, updated);
      setMealData(prev => ({ ...prev, ...updated }));
      setEditing(false);
    } catch {
      showModal('❌', 'Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // Calculate health score for this meal
  const { score: healthScore, message: healthMessage } = calculateMealHealthScore({
    calories: mealData.calories,
    protein_g: mealData.protein_g,
    carbs_g: mealData.carbs_g,
    fat_g: mealData.fat_g,
  });

  const handleShare = async () => {
    setShowShareCard(true);
    // Wait one frame for the card to render, then capture
    setTimeout(async () => {
      try {
        setSharing(true);
        const uri = await shareCardRef.current?.capture();
        setShowShareCard(false);
        if (!uri) throw new Error('Capture failed');
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) { showModal('ℹ️', 'Not Available', 'Sharing not available on this device'); return; }
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your meal' });
        trackEvent('share_meal', { health_score: healthScore, calories: mealData.calories });
      } catch {
        setShowShareCard(false);
        showModal('❌', 'Share failed', 'Could not generate share card.');
      } finally {
        setSharing(false);
      }
    }, 300);
  };

  const rawUrl = mealData.image_url;
  const imageUri = rawUrl && !rawUrl.startsWith('http') ? `${BASE_URL}${rawUrl}` : rawUrl;
  const isFirstPartyImage = imageUri?.startsWith(BASE_URL);
  const imageSource = isFirstPartyImage
    ? { uri: imageUri, headers: { Authorization: `Bearer ${global.authToken}` } }
    : { uri: imageUri };

  const handleDelete = () => {
    const mealId = mealData._id || mealData.id;
    showConfirmModal('🗑️', 'Delete Meal', 'Remove this meal from your diary?', 'Delete', async () => {
      hideModal();
      if (!mealId) {
        showModal('❌', 'Error', 'Meal ID not found — cannot delete');
        return;
      }
      setDeleting(true);
      try {
        await mealsAPI.delete(mealId);
        navigation.goBack();
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to delete meal';
        showModal('❌', 'Delete failed', msg);
        setDeleting(false);
      }
    }, true);
  };

  const macroTotal = (mealData.protein_g || 0) + (mealData.carbs_g || 0) + (mealData.fat_g || 0);
  const macros = [
    { label: 'Protein', value: mealData.protein_g || 0, unit: 'g', color: '#FF6B35', pct: macroTotal > 0 ? Math.round((mealData.protein_g / macroTotal) * 100) : 0 },
    { label: 'Carbs', value: mealData.carbs_g || 0, unit: 'g', color: '#4ECDC4', pct: macroTotal > 0 ? Math.round((mealData.carbs_g / macroTotal) * 100) : 0 },
    { label: 'Fat', value: mealData.fat_g || 0, unit: 'g', color: '#FFD93D', pct: macroTotal > 0 ? Math.round((mealData.fat_g / macroTotal) * 100) : 0 },
  ];

  const extras = [
    mealData.fiber_g != null && { label: 'Fiber', value: mealData.fiber_g, unit: 'g' },
    mealData.sugar_g != null && { label: 'Sugar', value: mealData.sugar_g, unit: 'g' },
    mealData.sodium_mg != null && { label: 'Sodium', value: mealData.sodium_mg, unit: 'mg' },
    mealData.cholesterol_mg != null && { label: 'Cholesterol', value: mealData.cholesterol_mg, unit: 'mg' },
  ].filter(Boolean);

  const showImage = imageUri && !imgError;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppModal visible={modal.visible} icon={modal.icon} title={modal.title} message={modal.message} onClose={hideModal} confirmText={modal.confirmText} onConfirm={modal.onConfirm} confirmDestructive={modal.confirmDestructive} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Details</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TouchableOpacity onPress={handleShare} style={styles.deleteBtn} disabled={sharing}>
            {sharing ? <ActivityIndicator size="small" color="#FF6B35" /> : <Ionicons name="share-outline" size={22} color="#FF6B35" />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setEditData({ calories: String(mealData.calories || ''), protein_g: String(mealData.protein_g || ''), carbs_g: String(mealData.carbs_g || ''), fat_g: String(mealData.fat_g || '') }); setEditing(true); }} style={styles.deleteBtn}>
            <Ionicons name="pencil-outline" size={22} color="#4ECDC4" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} disabled={deleting}>
            {deleting ? <ActivityIndicator size="small" color="#ff4444" /> : <Ionicons name="trash-outline" size={22} color="#ff4444" />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {showImage ? (
          <Image
            source={imageSource}
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
          <Text style={styles.foodName}>{mealData.food_name}</Text>
          <Text style={styles.timestamp}>
            {new Date(mealData.analyzed_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}
            {new Date(mealData.analyzed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>

          <View style={styles.calorieCard}>
            <Text style={styles.calorieLabel}>Total Calories</Text>
            <Text style={styles.calorieValue}>{mealData.calories}</Text>
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

          {/* Meal Health Score */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>HEALTH SCORE</Text>
          <View style={styles.healthScoreCard}>
            <View style={styles.healthScoreLeft}>
              <Text style={[styles.healthScoreNum, { color: healthScoreColor(healthScore) }]}>{healthScore}</Text>
              <Text style={styles.healthScoreOf}>/10</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.healthScoreMsg, { color: healthScoreColor(healthScore) }]}>{healthMessage}</Text>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={sharing}>
                {sharing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="share-social-outline" size={16} color="#fff" />
                }
                <Text style={styles.shareBtnText}>{sharing ? 'Preparing...' : 'Share Meal'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit nutrition modal */}
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={styles.editOverlay}>
          <View style={styles.editBox}>
            <Text style={styles.editTitle}>Edit Nutrition</Text>
            {[
              { key: 'calories', label: 'Calories (kcal)' },
              { key: 'protein_g', label: 'Protein (g)' },
              { key: 'carbs_g', label: 'Carbs (g)' },
              { key: 'fat_g', label: 'Fat (g)' },
            ].map(f => (
              <View key={f.key} style={styles.editRow}>
                <Text style={styles.editLabel}>{f.label}</Text>
                <TextInput
                  style={styles.editInput}
                  value={editData[f.key]}
                  onChangeText={v => setEditData(prev => ({ ...prev, [f.key]: v }))}
                  keyboardType="numeric"
                />
              </View>
            ))}
            <View style={styles.editBtns}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveEdit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.editSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Off-screen share card for capture */}
      {showShareCard && (
        <View style={{ position: 'absolute', top: -1000, left: 0 }} pointerEvents="none">
          <ViewShot ref={shareCardRef} options={{ format: 'png', quality: 1 }}>
            <MealShareCard meal={mealData} healthScore={healthScore} healthMessage={healthMessage} />
          </ViewShot>
        </View>
      )}
    </View>
  );
}

function healthScoreColor(score) {
  if (score >= 8) return '#4CAF50';
  if (score >= 6) return '#45B7D1';
  if (score >= 4) return '#FF9800';
  return '#FF6B6B';
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
  healthScoreCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row',
    alignItems: 'center', gap: 16, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  healthScoreLeft: { alignItems: 'center' },
  healthScoreNum: { fontSize: 40, fontWeight: '900', lineHeight: 44 },
  healthScoreOf: { fontSize: 12, color: '#aaa', fontWeight: '600', marginTop: -4 },
  healthScoreMsg: { fontSize: 13, fontWeight: '700', marginBottom: 10, lineHeight: 18 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FF6B35', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  shareBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  editBox: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%' },
  editTitle: { fontSize: 18, fontWeight: '800', color: '#333', marginBottom: 16, textAlign: 'center' },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  editLabel: { fontSize: 14, color: '#555', fontWeight: '600' },
  editInput: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 10, width: 100, textAlign: 'right', fontSize: 15, color: '#333', backgroundColor: '#fafafa' },
  editBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  editCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 14, alignItems: 'center' },
  editCancelText: { color: '#999', fontWeight: '700' },
  editSaveBtn: { flex: 1, backgroundColor: '#FF6B35', borderRadius: 12, padding: 14, alignItems: 'center' },
  editSaveText: { color: '#fff', fontWeight: '700' },
});
