import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, StatusBar, Image, Dimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { mealsAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Svg, { Circle } from 'react-native-svg';
import { checkGoalNotifications } from '../services/notifications';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 32;

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://snapcalorie-backend-production.up.railway.app/api').replace('/api', '');

function CalorieRing({ consumed, goal }) {
  const size = 200;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(consumed / goal, 1);

  return (
    <View style={styles.ringContainer}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#f0f0f0" strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#FF6B35" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`} />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringCalories}>{Math.round(consumed)}</Text>
        <Text style={styles.ringFraction}>/ {goal} kcal</Text>
      </View>
    </View>
  );
}

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

function MacroDonut({ protein, carbs, fat }) {
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = protein + carbs + fat;

  const pP = total > 0 ? protein / total : 0;
  const pC = total > 0 ? carbs / total : 0;
  const pF = total > 0 ? fat / total : 0;

  const gap = circumference * 0.012;
  const dashP = Math.max(circumference * pP - gap, 0);
  const dashC = Math.max(circumference * pC - gap, 0);
  const dashF = Math.max(circumference * pF - gap, 0);

  const rotP = -90;
  const rotC = rotP + pP * 360;
  const rotF = rotC + pC * 360;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={radius} stroke="#f0f0f0" strokeWidth={strokeWidth} fill="none" />
      {dashP > 0 && (
        <Circle cx={cx} cy={cy} r={radius} stroke="#FF6B6B" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${dashP} ${circumference - dashP}`} strokeLinecap="butt"
          transform={`rotate(${rotP}, ${cx}, ${cy})`} />
      )}
      {dashC > 0 && (
        <Circle cx={cx} cy={cy} r={radius} stroke="#4ECDC4" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${dashC} ${circumference - dashC}`} strokeLinecap="butt"
          transform={`rotate(${rotC}, ${cx}, ${cy})`} />
      )}
      {dashF > 0 && (
        <Circle cx={cx} cy={cy} r={radius} stroke="#FFD93D" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${dashF} ${circumference - dashF}`} strokeLinecap="butt"
          transform={`rotate(${rotF}, ${cx}, ${cy})`} />
      )}
    </Svg>
  );
}

function MacroBreakdownCard({ protein, carbs, fat }) {
  const total = protein + carbs + fat;
  const pctOf = (v) => total > 0 ? Math.round((v / total) * 100) : 0;

  const macros = [
    { label: 'Protein', value: protein, color: '#FF6B6B', pct: pctOf(protein) },
    { label: 'Carbs', value: carbs, color: '#4ECDC4', pct: pctOf(carbs) },
    { label: 'Fat', value: fat, color: '#FFD93D', pct: pctOf(fat) },
  ];

  return (
    <View style={[styles.card, { width: CARD_WIDTH }]}>
      <Text style={styles.breakdownTitle}>Macro Breakdown</Text>
      <View style={styles.breakdownBody}>
        <View style={styles.donutWrap}>
          <MacroDonut protein={protein} carbs={carbs} fat={fat} />
          <View style={styles.donutCenter}>
            <Text style={styles.donutTotal}>{Math.round(total)}g</Text>
            <Text style={styles.donutSub}>total macros</Text>
          </View>
        </View>
        <View style={styles.legendCol}>
          {macros.map(m => (
            <View key={m.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: m.color }]} />
              <View style={styles.legendInfo}>
                <Text style={styles.legendName}>{m.label}</Text>
                <Text style={styles.legendVal}>{Math.round(m.value)}g</Text>
              </View>
              <Text style={[styles.legendPct, { color: m.color }]}>{m.pct}%</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [meals, setMeals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [cardPage, setCardPage] = useState(0);
  const [scanInfo, setScanInfo] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const goalCalories = (() => {
    if (user?.dailyCalorieGoal) return user.dailyCalorieGoal;
    const w = parseFloat(user?.weightKg) || 0;
    const h = parseFloat(user?.heightCm) || 0;
    const a = parseFloat(user?.age) || 0;
    if (!w || !h || !a) return 2000;
    let bmr = 10 * w + 6.25 * h - 5 * a + (user?.gender === 'female' ? -161 : 5);
    const actMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, extra: 1.9 };
    const act = actMap[user?.activityLevel] || actMap[user?.activity] || 1.55;
    const goalAdj = { lose: -500, maintain: 0, gain: 500 }[user?.goal] || 0;
    return Math.round(bmr * act + goalAdj);
  })();

  const streak = (() => {
    const dates = new Set(meals.map(m => new Date(m.analyzed_at).toDateString()));
    const now = new Date();
    let count = 0;
    const startOffset = dates.has(now.toDateString()) ? 0 : 1;
    for (let i = startOffset; ; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      if (dates.has(d.toDateString())) { count++; } else { break; }
    }
    return count;
  })();

  const fetchMeals = useCallback(async () => {
    try {
      const res = await mealsAPI.getAll();
      setMeals(res.data.data);
    } catch {}
  }, []);

  const fetchScanInfo = useCallback(async () => {
    try {
      const res = await authAPI.me();
      const u = res.data.data || res.data;
      setScanInfo({
        used: u.scanCount ?? u.scansUsed ?? u.scans_used ?? 0,
        limit: u.scanLimit ?? u.scan_limit ?? 20,
        plan: u.plan ?? u.subscription ?? 'FREE',
        resetAt: u.scanResetAt ?? u.scansResetAt ?? u.scans_reset_at ?? null,
      });
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => {
    fetchMeals();
    fetchScanInfo();
  }, [fetchMeals, fetchScanInfo]));

  // Fire goal notifications when today's calorie total crosses 25% or 75%
  useEffect(() => {
    const todayStr = new Date().toDateString();
    const todayCals = meals
      .filter(m => new Date(m.analyzed_at).toDateString() === todayStr)
      .reduce((s, m) => s + (m.calories || 0), 0);
    checkGoalNotifications(todayCals, goalCalories);
  }, [meals]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMeals(), fetchScanInfo()]);
    setRefreshing(false);
  };

  const scansUsed = scanInfo?.used ?? (user?.scanCount ?? null);
  const scansLimit = scanInfo?.limit ?? (user?.scanLimit ?? user?.scan_limit ?? 20);
  const scansLeft = scansUsed !== null ? scansLimit - scansUsed : null;
  const scanPlan = (scanInfo?.plan ?? user?.plan ?? 'FREE').toUpperCase();
  const resetAt = scanInfo?.resetAt ?? user?.scansResetAt ?? null;
  const resetLabel = resetAt
    ? new Date(resetAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const selectedMeals = meals.filter(m =>
    new Date(m.analyzed_at).toDateString() === selectedDate.toDateString()
  );

  const totals = selectedMeals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein: acc.protein + (m.protein_g || 0),
    carbs: acc.carbs + (m.carbs_g || 0),
    fat: acc.fat + (m.fat_g || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const today = new Date();
  const weekDays = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    weekDays.push({
      day: DAYS[d.getDay()],
      date: d.getDate(),
      dateObj: new Date(d),
      isSelected: d.toDateString() === selectedDate.toDateString(),
    });
  }

  const monthLabel = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const isToday = selectedDate.toDateString() === today.toDateString();
  const isYesterday = selectedDate.toDateString() === new Date(Date.now() - 86400000).toDateString();
  const sectionTitle = isToday ? "Today's Meals" : isYesterday ? "Yesterday's Meals"
    : `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}'s Meals`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Scan info tooltip Modal */}
      <Modal
        visible={tooltipVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTooltipVisible(false)}
      >
        <TouchableOpacity style={styles.tooltipOverlay} activeOpacity={1} onPress={() => setTooltipVisible(false)}>
          <View style={styles.tooltipBox}>
            <View style={styles.tooltipHeader}>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{scanPlan}</Text>
              </View>
              <Text style={styles.tooltipTitle}>Scans Left</Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipBig}>{scansLeft !== null ? scansLeft : '—'}</Text>
              <Text style={styles.tooltipOf}> / {scansLimit}</Text>
            </View>
            <View style={styles.tooltipProgressBg}>
              <View style={[styles.tooltipProgressFill, {
                width: `${scansUsed !== null ? Math.min((scansUsed / scansLimit) * 100, 100) : 0}%`
              }]} />
            </View>
            <Text style={styles.tooltipUsed}>{scansUsed !== null ? scansUsed : '—'} used this month</Text>
            {resetLabel && <Text style={styles.tooltipReset}>Resets {resetLabel}</Text>}
            <Text style={styles.tooltipDismiss}>Tap anywhere to dismiss</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <Text style={styles.brand}>SnapCalorie</Text>
          <View style={styles.headerRight}>
            <View style={styles.streakRow}>
              <Text style={styles.streak}>🔥 {streak}</Text>
              <View style={[styles.planBadge, user?.plan === 'pro' && styles.planBadgePro]}>
                <Text style={[styles.planBadgeText, user?.plan === 'pro' && styles.planBadgeTextPro]}>
                  {user?.plan === 'pro' ? 'Pro' : 'Free'}
                </Text>
              </View>
            </View>
            {scansLeft !== null && (
              <TouchableOpacity
                style={[styles.scanBadge, scansLeft <= 3 && styles.scanBadgeLow]}
                onPress={() => setTooltipVisible(true)}
                onLongPress={() => setTooltipVisible(true)}
                delayLongPress={800}
              >
                <Text style={[styles.scanBadgeText, scansLeft <= 3 && styles.scanBadgeTextLow]}>
                  📷 {scansLeft}/{scansLimit}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.calendarWrap}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <View style={styles.weekStrip}>
            {weekDays.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dayBtn, d.isSelected && styles.dayBtnActive]}
                onPress={() => setSelectedDate(d.dateObj)}
              >
                <Text style={[styles.dayName, d.isSelected && styles.dayNameActive]}>{d.day}</Text>
                <Text style={[styles.dayNum, d.isSelected && styles.dayNumActive]}>{d.date}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Swipeable card — page 0: calorie ring, page 1: macro breakdown */}
        <View style={styles.cardWrapper}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={e => {
              const page = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
              setCardPage(page);
            }}
          >
            {/* Page 0: Calorie Ring */}
            <View style={[styles.card, { width: CARD_WIDTH }]}>
              <CalorieRing consumed={totals.calories} goal={goalCalories} />
              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: '#FF6B6B' }]} />
                  <Text style={styles.macroVal}>{Math.round(totals.protein)}g</Text>
                  <Text style={styles.macroName}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: '#4ECDC4' }]} />
                  <Text style={styles.macroVal}>{Math.round(totals.carbs)}g</Text>
                  <Text style={styles.macroName}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: '#FFD93D' }]} />
                  <Text style={styles.macroVal}>{Math.round(totals.fat)}g</Text>
                  <Text style={styles.macroName}>Fats</Text>
                </View>
              </View>
            </View>

            {/* Page 1: Macro Breakdown donut */}
            <MacroBreakdownCard
              protein={totals.protein}
              carbs={totals.carbs}
              fat={totals.fat}
            />
          </ScrollView>

          {/* Page dots */}
          <View style={styles.dots}>
            <View style={[styles.dot, cardPage === 0 && styles.dotActive]} />
            <View style={[styles.dot, cardPage === 1 && styles.dotActive]} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          {selectedMeals.length === 0 ? (
            <View style={styles.emptyMeal}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyText}>No meals logged</Text>
              <Text style={styles.emptySub}>{isToday ? 'Tap + to log a meal' : 'No meals were logged this day'}</Text>
            </View>
          ) : (
            selectedMeals.map((meal, i) => (
              <TouchableOpacity key={i} style={styles.mealRow} onPress={() => navigation.navigate('Diary', { screen: 'MealDetail', params: { meal } })}>
                <View style={styles.mealThumb}>
                  <MealThumb imageUrl={meal.image_url} />
                </View>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealName}>{meal.food_name}</Text>
                  <Text style={styles.mealCals}>{meal.calories} Calories</Text>
                  <View style={styles.mealMacros}>
                    <Text style={styles.mealMacro}>🔴 {Math.round(meal.protein_g)}g</Text>
                    <Text style={styles.mealMacro}>🔵 {Math.round(meal.carbs_g)}g</Text>
                    <Text style={styles.mealMacro}>🟡 {Math.round(meal.fat_g)}g</Text>
                  </View>
                </View>
                <Text style={styles.mealTime}>
                  {new Date(meal.analyzed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  brand: { fontSize: 22, fontWeight: '800', color: '#FF6B35' },
  streak: { fontSize: 16, fontWeight: '700', color: '#FF6B35' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planBadge: { backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  planBadgePro: { backgroundColor: '#FF6B35' },
  planBadgeText: { fontSize: 11, fontWeight: '700', color: '#999' },
  planBadgeTextPro: { color: '#fff' },
  calendarWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 12 },
  monthLabel: { textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#999', paddingTop: 8 },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, paddingHorizontal: 8 },
  dayBtn: { alignItems: 'center', padding: 8, borderRadius: 12, minWidth: 40 },
  dayBtnActive: { backgroundColor: '#FF6B35' },
  dayName: { fontSize: 11, color: '#999', marginBottom: 4 },
  dayNameActive: { color: '#fff' },
  dayNum: { fontSize: 15, fontWeight: '700', color: '#333' },
  dayNumActive: { color: '#fff' },

  // Header right cluster
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3EE', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#FFD0BC' },
  scanBadgeLow: { backgroundColor: '#FFF0F0', borderColor: '#ffaaaa' },
  scanBadgeText: { fontSize: 12, fontWeight: '700', color: '#FF6B35' },
  scanBadgeTextLow: { color: '#ff4444' },

  // Tooltip modal
  tooltipOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 80, paddingRight: 16 },
  tooltipBox: { backgroundColor: '#fff', borderRadius: 18, padding: 18, width: 220, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  tooltipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  planBadge: { backgroundColor: '#FF6B35', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  planBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  tooltipTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  tooltipRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  tooltipBig: { fontSize: 36, fontWeight: '800', color: '#FF6B35' },
  tooltipOf: { fontSize: 16, color: '#999', fontWeight: '600' },
  tooltipProgressBg: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  tooltipProgressFill: { height: '100%', backgroundColor: '#FF6B35', borderRadius: 3 },
  tooltipUsed: { fontSize: 12, color: '#666', marginBottom: 4 },
  tooltipReset: { fontSize: 11, color: '#999', marginBottom: 8 },
  tooltipDismiss: { fontSize: 10, color: '#ccc', textAlign: 'center', marginTop: 4 },

  // Swipeable card wrapper
  cardWrapper: { marginHorizontal: 16, marginVertical: 0 },
  card: { backgroundColor: '#fff', marginVertical: 16, borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ddd' },
  dotActive: { backgroundColor: '#FF6B35', width: 18 },

  // Calorie ring card
  ringContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringCalories: { fontSize: 36, fontWeight: '800', color: '#FF6B35' },
  ringFraction: { fontSize: 13, color: '#999', fontWeight: '600' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 16 },
  macroItem: { alignItems: 'center', gap: 4 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroVal: { fontSize: 16, fontWeight: '700', color: '#333' },
  macroName: { fontSize: 12, color: '#999' },

  // Macro breakdown card
  breakdownTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 16, alignSelf: 'flex-start' },
  breakdownBody: { flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%' },
  donutWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutTotal: { fontSize: 20, fontWeight: '800', color: '#333' },
  donutSub: { fontSize: 10, color: '#999' },
  legendCol: { flex: 1, gap: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendInfo: { flex: 1 },
  legendName: { fontSize: 13, fontWeight: '600', color: '#333' },
  legendVal: { fontSize: 12, color: '#999' },
  legendPct: { fontSize: 14, fontWeight: '800' },

  // Meals section
  section: { backgroundColor: '#fff', margin: 16, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  emptyMeal: { alignItems: 'center', padding: 24, gap: 6 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#333' },
  emptySub: { fontSize: 13, color: '#999' },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  mealThumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mealImg: { width: 56, height: 56 },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  mealCals: { fontSize: 13, fontWeight: '700', color: '#FF6B35', marginBottom: 4 },
  mealMacros: { flexDirection: 'row', gap: 8 },
  mealMacro: { fontSize: 11, color: '#999' },
  mealTime: { fontSize: 11, color: '#999' },
});
