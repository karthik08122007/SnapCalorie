import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, useWindowDimensions, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Rect, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { mealsAPI, waterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { calculateDailyNutritionScore, getScoreMessage } from '../utils/nutritionScore';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const tips = [
  { icon: '💪', title: 'Protein Goal', msg: 'Aim for 0.8g per kg of body weight daily.', color: '#FF6B6B' },
  { icon: '🥦', title: 'Eat More Fiber', msg: 'Target 25-30g of fiber per day for better digestion.', color: '#4ECDC4' },
  { icon: '💧', title: 'Stay Hydrated', msg: 'Drink at least 8 glasses of water daily.', color: '#45B7D1' },
  { icon: '🌙', title: 'Meal Timing', msg: 'Avoid eating 2-3 hours before bedtime.', color: '#96CEB4' },
  { icon: '🔥', title: 'Calorie Balance', msg: 'A 500 calorie deficit per day leads to ~0.5kg loss per week.', color: '#FF6B35' },
];

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function buildWeekData(meals) {
  return getLast7Days().map(day => {
    const dayStr = day.toDateString();
    const dayMeals = meals.filter(m => new Date(m.analyzed_at).toDateString() === dayStr);
    return {
      label: DAY_LABELS[day.getDay()],
      calories: Math.round(dayMeals.reduce((s, m) => s + (m.calories || 0), 0)),
      protein: Math.round(dayMeals.reduce((s, m) => s + (m.protein_g || 0), 0)),
      carbs: Math.round(dayMeals.reduce((s, m) => s + (m.carbs_g || 0), 0)),
      fat: Math.round(dayMeals.reduce((s, m) => s + (m.fat_g || 0), 0)),
      count: dayMeals.length,
    };
  });
}

function niceMax(val, minFloor = 100) {
  if (val <= 0) return minFloor;
  const magnitude = Math.pow(10, Math.floor(Math.log10(val)));
  return Math.ceil(val / magnitude) * magnitude;
}

function yTicks(maxVal, count = 4) {
  const step = maxVal / count;
  return Array.from({ length: count + 1 }, (_, i) => Math.round(step * i));
}

// ─── Calorie Line Chart ───────────────────────────────────────────────────────
function CalorieLineChart({ data, goal, totalWidth, selectedIdx, onSelect }) {
  const Y_AXIS = 42;
  const RIGHT = 8;
  const plotW = totalWidth - Y_AXIS - RIGHT;
  const H = 130;
  const TOP = 10;

  const rawMax = Math.max(goal * 1.2, ...data.map(d => d.calories), 300);
  const maxVal = niceMax(rawMax, 500);
  const ticks = yTicks(maxVal);
  const toY = (v) => TOP + (1 - v / maxVal) * (H - TOP);
  const goalY = toY(goal);

  const xStep = plotW / (data.length - 1);
  const pts = data.map((d, i) => ({
    x: Y_AXIS + i * xStep,
    y: toY(d.calories),
    calories: d.calories,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;
  const selPt = selectedIdx !== null ? pts[selectedIdx] : null;

  const handleTouch = (e) => {
    const x = e.nativeEvent.locationX;
    const idx = Math.min(Math.max(Math.round(x / xStep), 0), data.length - 1);
    onSelect(idx);
  };

  // Tooltip position
  let ttLeft = 0, ttTop = 0;
  if (selPt) {
    ttLeft = Math.min(Math.max(selPt.x - 44, Y_AXIS), totalWidth - 90);
    ttTop = Math.max(selPt.y - 52, 0);
  }

  return (
    <View style={{ width: totalWidth, position: 'relative' }}>
      <Svg width={totalWidth} height={H + 24}>
        <Defs>
          <LinearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FF6B35" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#FF6B35" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Grid lines + Y axis labels */}
        {ticks.map((v, i) => {
          const y = toY(v);
          return (
            <G key={i}>
              <Line x1={Y_AXIS} y1={y} x2={totalWidth - RIGHT} y2={y}
                stroke={i === 0 ? '#e8e8e8' : '#f3f3f3'} strokeWidth={1} />
              <SvgText x={Y_AXIS - 5} y={y + 3.5} fontSize={9} fill="#bbb" textAnchor="end">{v}</SvgText>
            </G>
          );
        })}

        {/* Y axis line */}
        <Line x1={Y_AXIS} y1={TOP} x2={Y_AXIS} y2={H} stroke="#ebebeb" strokeWidth={1} />

        {/* Goal dashed line */}
        <Line x1={Y_AXIS} y1={goalY} x2={totalWidth - RIGHT} y2={goalY}
          stroke="#FF6B35" strokeWidth={1.2} strokeDasharray="5,4" opacity={0.45} />

        {/* Area fill */}
        <Path d={areaPath} fill="url(#calGrad)" />

        {/* Line */}
        <Path d={linePath} stroke="#FF6B35" strokeWidth={2.5} fill="none"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Selected cursor line */}
        {selPt && (
          <Line x1={selPt.x} y1={TOP} x2={selPt.x} y2={H}
            stroke="#FF6B35" strokeWidth={1} strokeDasharray="3,3" opacity={0.55} />
        )}

        {/* Data point dots */}
        {pts.map((p, i) => p.calories > 0 && (
          <G key={i}>
            {i === selectedIdx && <Circle cx={p.x} cy={p.y} r={9} fill="#FF6B35" opacity={0.12} />}
            <Circle cx={p.x} cy={p.y} r={i === selectedIdx ? 5 : 3.5}
              fill="#FF6B35" stroke="#fff" strokeWidth={i === selectedIdx ? 2 : 1} />
          </G>
        ))}

        {/* X axis labels */}
        {data.map((d, i) => (
          <SvgText key={i} x={pts[i].x} y={H + 16} fontSize={9}
            fill={i === selectedIdx ? '#FF6B35' : '#bbb'} textAnchor="middle"
            fontWeight={i === selectedIdx ? 'bold' : 'normal'}>
            {d.label}
          </SvgText>
        ))}
      </Svg>

      {/* Floating tooltip */}
      {selPt && data[selectedIdx].calories > 0 && (
        <View style={[styles.chartTooltip, { left: ttLeft, top: ttTop }]} pointerEvents="none">
          <Text style={styles.ttDay}>{data[selectedIdx].label}</Text>
          <Text style={styles.ttVal}>{data[selectedIdx].calories} kcal</Text>
        </View>
      )}

      {/* Touch overlay (over plot area only) */}
      <View
        style={{ position: 'absolute', top: 0, left: Y_AXIS, width: plotW, height: H + 24 }}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
      />
    </View>
  );
}

// ─── Macro Bar Chart ──────────────────────────────────────────────────────────
function MacroBarChart({ data, totalWidth, selectedIdx, onSelect }) {
  const Y_AXIS = 42;
  const RIGHT = 8;
  const plotW = totalWidth - Y_AXIS - RIGHT;
  const H = 120;
  const TOP = 10;

  const rawMax = Math.max(...data.flatMap(d => [d.protein, d.carbs, d.fat]), 10);
  const maxVal = niceMax(rawMax, 10);
  const ticks = yTicks(maxVal, 3);
  const toY = (v) => TOP + (1 - v / maxVal) * (H - TOP);

  const groupW = plotW / data.length;
  const bw = Math.max((groupW * 0.65) / 3, 4);
  const barColors = ['#4ECDC4', '#45B7D1', '#FF6B6B'];

  const handleTouch = (e) => {
    const x = e.nativeEvent.locationX;
    const idx = Math.min(Math.max(Math.floor(x / groupW), 0), data.length - 1);
    onSelect(idx);
  };

  return (
    <View style={{ width: totalWidth, position: 'relative' }}>
      <Svg width={totalWidth} height={H + 24}>

        {/* Grid lines + Y labels */}
        {ticks.map((v, i) => {
          const y = toY(v);
          return (
            <G key={i}>
              <Line x1={Y_AXIS} y1={y} x2={totalWidth - RIGHT} y2={y}
                stroke={i === 0 ? '#e8e8e8' : '#f3f3f3'} strokeWidth={1} />
              <SvgText x={Y_AXIS - 5} y={y + 3.5} fontSize={9} fill="#bbb" textAnchor="end">{v}g</SvgText>
            </G>
          );
        })}

        {/* Y axis line */}
        <Line x1={Y_AXIS} y1={TOP} x2={Y_AXIS} y2={H} stroke="#ebebeb" strokeWidth={1} />

        {/* Bars */}
        {data.map((d, i) => {
          const groupX = Y_AXIS + i * groupW;
          const innerX = groupX + (groupW - bw * 3 - 2) / 2;
          const vals = [d.protein, d.carbs, d.fat];
          const isSelected = i === selectedIdx;

          return (
            <G key={i}>
              {/* Selection highlight background */}
              {isSelected && (
                <Rect x={groupX} y={TOP} width={groupW} height={H - TOP}
                  fill="#FF6B35" opacity={0.06} rx={4} />
              )}

              {vals.map((val, bi) => {
                const bH = Math.max((val / maxVal) * (H - TOP), val > 0 ? 3 : 0);
                return (
                  <Rect key={bi}
                    x={innerX + bi * (bw + 1)} y={H - bH} width={bw} height={bH}
                    rx={2} fill={barColors[bi]}
                    opacity={isSelected ? 1 : 0.75} />
                );
              })}

              {/* X label */}
              <SvgText
                x={groupX + groupW / 2} y={H + 16} fontSize={9} textAnchor="middle"
                fill={isSelected ? '#FF6B35' : '#bbb'}
                fontWeight={isSelected ? 'bold' : 'normal'}>
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Floating tooltip */}
      {selectedIdx !== null && (() => {
        const d = data[selectedIdx];
        if (d.protein + d.carbs + d.fat === 0) return null;
        const groupX = Y_AXIS + selectedIdx * groupW;
        const ttLeft = Math.min(Math.max(groupX - 36, 0), totalWidth - 100);
        return (
          <View style={[styles.chartTooltip, { left: ttLeft, top: 4 }]} pointerEvents="none">
            <Text style={styles.ttDay}>{d.label}</Text>
            <Text style={[styles.ttMacro, { color: '#4ECDC4' }]}>P {d.protein}g</Text>
            <Text style={[styles.ttMacro, { color: '#45B7D1' }]}>C {d.carbs}g</Text>
            <Text style={[styles.ttMacro, { color: '#FF6B6B' }]}>F {d.fat}g</Text>
          </View>
        );
      })()}

      {/* Touch overlay */}
      <View
        style={{ position: 'absolute', top: 0, left: Y_AXIS, width: plotW, height: H + 24 }}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
      />
    </View>
  );
}

// ─── Meals Bar Chart ──────────────────────────────────────────────────────────
function MealsBarChart({ data, totalWidth, selectedIdx, onSelect }) {
  const Y_AXIS = 42;
  const RIGHT = 8;
  const plotW = totalWidth - Y_AXIS - RIGHT;
  const H = 100;
  const TOP = 10;

  const rawMax = Math.max(...data.map(d => d.count), 3);
  const maxVal = Math.ceil(rawMax / 1) * 1;
  const ticks = yTicks(maxVal, Math.min(maxVal, 4));
  const toY = (v) => TOP + (1 - v / maxVal) * (H - TOP);

  const groupW = plotW / data.length;
  const bw = Math.max(groupW * 0.45, 8);

  const handleTouch = (e) => {
    const x = e.nativeEvent.locationX;
    const idx = Math.min(Math.max(Math.floor(x / groupW), 0), data.length - 1);
    onSelect(idx);
  };

  return (
    <View style={{ width: totalWidth, position: 'relative' }}>
      <Svg width={totalWidth} height={H + 24}>

        {/* Grid + Y labels */}
        {ticks.map((v, i) => {
          const y = toY(v);
          return (
            <G key={i}>
              <Line x1={Y_AXIS} y1={y} x2={totalWidth - RIGHT} y2={y}
                stroke={i === 0 ? '#e8e8e8' : '#f3f3f3'} strokeWidth={1} />
              <SvgText x={Y_AXIS - 5} y={y + 3.5} fontSize={9} fill="#bbb" textAnchor="end">{v}</SvgText>
            </G>
          );
        })}

        {/* Y axis line */}
        <Line x1={Y_AXIS} y1={TOP} x2={Y_AXIS} y2={H} stroke="#ebebeb" strokeWidth={1} />

        {/* Bars */}
        {data.map((d, i) => {
          const bx = Y_AXIS + i * groupW + (groupW - bw) / 2;
          const bH = Math.max((d.count / maxVal) * (H - TOP), d.count > 0 ? 4 : 0);
          const isSelected = i === selectedIdx;

          return (
            <G key={i}>
              {isSelected && (
                <Rect x={Y_AXIS + i * groupW} y={TOP} width={groupW} height={H - TOP}
                  fill="#4ECDC4" opacity={0.08} rx={4} />
              )}
              <Rect x={bx} y={H - bH} width={bw} height={bH} rx={3}
                fill="#4ECDC4" opacity={isSelected ? 1 : 0.7} />
              <SvgText x={bx + bw / 2} y={H + 16} fontSize={9} textAnchor="middle"
                fill={isSelected ? '#4ECDC4' : '#bbb'}
                fontWeight={isSelected ? 'bold' : 'normal'}>
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Floating tooltip */}
      {selectedIdx !== null && data[selectedIdx].count > 0 && (() => {
        const d = data[selectedIdx];
        const bx = Y_AXIS + selectedIdx * groupW + groupW / 2;
        const ttLeft = Math.min(Math.max(bx - 36, 0), totalWidth - 90);
        return (
          <View style={[styles.chartTooltip, { left: ttLeft, top: 4 }]} pointerEvents="none">
            <Text style={styles.ttDay}>{d.label}</Text>
            <Text style={[styles.ttVal, { color: '#4ECDC4' }]}>
              {d.count} meal{d.count !== 1 ? 's' : ''}
            </Text>
          </View>
        );
      })()}

      {/* Touch overlay */}
      <View
        style={{ position: 'absolute', top: 0, left: Y_AXIS, width: plotW, height: H + 24 }}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
      />
    </View>
  );
}

function generateInsights(weekData, goalCalories) {
  const activeDays = weekData.filter(d => d.count > 0);
  if (activeDays.length === 0) return ['Start logging meals to get personalized weekly insights!'];
  const insights = [];
  const avgCal = Math.round(activeDays.reduce((s, d) => s + d.calories, 0) / activeDays.length);
  if (avgCal < goalCalories * 0.75) {
    insights.push(`You averaged only ${avgCal} kcal/day — that's below your goal. Make sure you're eating enough!`);
  } else if (avgCal > goalCalories * 1.15) {
    insights.push(`You averaged ${avgCal} kcal/day — slightly above your goal. Consider adjusting portion sizes.`);
  } else {
    insights.push(`Great job! You averaged ${avgCal} kcal/day, right on target.`);
  }
  if (activeDays.length < 5) {
    insights.push(`You only logged meals on ${activeDays.length} day${activeDays.length === 1 ? '' : 's'} this week. Try to log every day for better insights.`);
  } else {
    insights.push(`Excellent consistency! You logged meals ${activeDays.length} out of 7 days.`);
  }
  return insights;
}

// ─── Daily Nutrition Score Card ───────────────────────────────────────────────
function NutritionScoreCard({ score, breakdown, message, messageColor }) {
  const bars = [
    { label: 'Calories', value: breakdown.calories, max: 30, color: '#FF6B35' },
    { label: 'Protein',  value: breakdown.protein,  max: 30, color: '#4ECDC4' },
    { label: 'Carbs',    value: breakdown.carbs,     max: 20, color: '#45B7D1' },
    { label: 'Fat',      value: breakdown.fat,       max: 10, color: '#FF6B6B' },
    { label: 'Water',    value: breakdown.water,     max: 10, color: '#96CEB4' },
  ];

  return (
    <View style={scoreStyles.card}>
      <Text style={scoreStyles.title}>Daily Nutrition Score</Text>

      {/* Score + ring */}
      <View style={scoreStyles.scoreRow}>
        <View style={[scoreStyles.scoreBadge, { borderColor: messageColor }]}>
          <Text style={[scoreStyles.scoreNum, { color: messageColor }]}>{score}</Text>
          <Text style={scoreStyles.scoreOf}>/100</Text>
        </View>
        <View style={scoreStyles.scoreRight}>
          {/* Overall progress bar */}
          <View style={scoreStyles.mainBarTrack}>
            <View style={[scoreStyles.mainBarFill, { width: `${score}%`, backgroundColor: messageColor }]} />
          </View>
          <Text style={[scoreStyles.message, { color: messageColor }]}>{message}</Text>
        </View>
      </View>

      {/* Breakdown bars */}
      <View style={scoreStyles.breakdownWrap}>
        {bars.map(b => (
          <View key={b.label} style={scoreStyles.barRow}>
            <Text style={scoreStyles.barLabel}>{b.label}</Text>
            <View style={scoreStyles.barTrack}>
              <View style={[scoreStyles.barFill, { width: `${(b.value / b.max) * 100}%`, backgroundColor: b.color }]} />
            </View>
            <Text style={scoreStyles.barPts}>{b.value}/{b.max}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const scoreStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  scoreBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: { fontSize: 26, fontWeight: '900', lineHeight: 28 },
  scoreOf: { fontSize: 11, color: '#aaa', fontWeight: '600' },
  scoreRight: { flex: 1 },
  mainBarTrack: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  mainBarFill: { height: '100%', borderRadius: 5 },
  message: { fontSize: 13, fontWeight: '700' },
  breakdownWrap: { gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 58, fontSize: 11, color: '#888', fontWeight: '600' },
  barTrack: { flex: 1, height: 7, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barPts: { width: 36, fontSize: 11, color: '#aaa', textAlign: 'right', fontWeight: '600' },
});

export default function InsightsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [meals, setMeals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [calSel, setCalSel] = useState(null);
  const [macroSel, setMacroSel] = useState(null);
  const [mealsSel, setMealsSel] = useState(null);
  const [todayWater, setTodayWater] = useState(0);

  const goalCalories = (() => {
    if (user?.dailyCalorieGoal) return user.dailyCalorieGoal;
    const w = parseFloat(user?.weightKg) || 0;
    const h = parseFloat(user?.heightCm) || 0;
    const a = parseFloat(user?.age) || 0;
    if (!w || !h || !a) return 2000;
    let bmr = 10 * w + 6.25 * h - 5 * a + (user?.gender === 'female' ? -161 : 5);
    const actMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, extra: 1.9 };
    const act = actMap[user?.activityLevel] || 1.55;
    const goalAdj = { lose: -500, maintain: 0, gain: 500 }[user?.goal] || 0;
    return Math.round(bmr * act + goalAdj);
  })();
  // card: marginHorizontal 16 + padding 16 on each side = 64px total horizontal space consumed
  const chartWidth = width - 64;

  const fetchMeals = useCallback(async () => {
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const [mealsRes, waterRes] = await Promise.allSettled([
        mealsAPI.getAll(),
        waterAPI.get(todayDate),
      ]);
      if (mealsRes.status === 'fulfilled') setMeals(mealsRes.value.data.data || []);
      if (waterRes.status === 'fulfilled') setTodayWater(waterRes.value.data.data?.glasses ?? 0);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { fetchMeals(); }, [fetchMeals]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeals();
    setRefreshing(false);
  };

  const weekData = buildWeekData(meals);
  const activeDays = weekData.filter(d => d.count > 0).length;

  // Today's meals for the nutrition score
  const todayStr = new Date().toDateString();
  const todayMeals = meals.filter(m => new Date(m.analyzed_at).toDateString() === todayStr);
  const todayCalories = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const todayProtein  = todayMeals.reduce((s, m) => s + (m.protein_g || 0), 0);
  const todayCarbs    = todayMeals.reduce((s, m) => s + (m.carbs_g || 0), 0);
  const todayFat      = todayMeals.reduce((s, m) => s + (m.fat_g || 0), 0);
  const proteinGoal   = user?.proteinGoal || 150;
  const WATER_GOAL    = 8;

  const { score, breakdown } = calculateDailyNutritionScore({
    caloriesConsumed: todayCalories,
    calorieGoal: goalCalories,
    proteinConsumed: todayProtein,
    proteinGoal,
    carbsConsumed: todayCarbs,
    fatConsumed: todayFat,
    waterConsumed: todayWater,
    waterGoal: WATER_GOAL,
  });
  const { message: scoreMessage, color: scoreColor } = getScoreMessage(score);
  const totalMeals = weekData.reduce((s, d) => s + d.count, 0);
  const avgCal = activeDays > 0 ? Math.round(weekData.reduce((s, d) => s + d.calories, 0) / activeDays) : 0;
  const bestDay = weekData.reduce((best, d) => d.calories > (best?.calories || 0) ? d : best, null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f8f8" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>SnapCalorie</Text>
          <Text style={styles.headerRight}>AI Insights</Text>
        </View>

        {/* Weekly summary stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Active Days', value: activeDays },
            { label: 'Avg kcal/day', value: avgCal },
            { label: 'Meals Logged', value: totalMeals },
            { label: 'Best Day', value: bestDay?.calories > 0 ? bestDay.label : '—' },
          ].map((s, i) => (
            <View key={i} style={[styles.statBox, i < 3 && styles.statBoxBorder]}>
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Daily Nutrition Score */}
        <NutritionScoreCard
          score={score}
          breakdown={breakdown}
          message={scoreMessage}
          messageColor={scoreColor}
        />

        {/* Daily Calories vs Goal */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔥 Daily Calories vs Goal</Text>
          <Text style={styles.chartHint}>Tap or drag to see details</Text>
          <View style={styles.chartWrap}>
            <CalorieLineChart
              data={weekData}
              goal={goalCalories}
              totalWidth={chartWidth}
              selectedIdx={calSel}
              onSelect={setCalSel}
            />
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF6B35' }]} />
              <Text style={styles.legendText}>Calories</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendDash} />
              <Text style={styles.legendText}>Goal ({goalCalories} kcal)</Text>
            </View>
          </View>
        </View>

        {/* Daily Macros */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 Daily Macros</Text>
          <Text style={styles.chartHint}>Tap a day to see macro details</Text>
          <View style={styles.chartWrap}>
            <MacroBarChart
              data={weekData}
              totalWidth={chartWidth}
              selectedIdx={macroSel}
              onSelect={setMacroSel}
            />
          </View>
          <View style={styles.legend}>
            {[
              { color: '#4ECDC4', label: 'Protein' },
              { color: '#45B7D1', label: 'Carbs' },
              { color: '#FF6B6B', label: 'Fat' },
            ].map(l => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Meals Logged per Day */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🍽️ Meals Logged per Day</Text>
          <Text style={styles.chartHint}>Tap a day to see count</Text>
          <View style={styles.chartWrap}>
            <MealsBarChart
              data={weekData}
              totalWidth={chartWidth}
              selectedIdx={mealsSel}
              onSelect={setMealsSel}
            />
          </View>
        </View>

        {/* Weekly Insight */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💡 Weekly Insight</Text>
          {generateInsights(weekData, goalCalories).map((insight, i) => (
            <View key={i} style={styles.insightRow}>
              <View style={styles.insightDot} />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>

        {/* Nutrition Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Tips</Text>
          {tips.map((tip, i) => (
            <View key={i} style={[styles.tipCard, i === tips.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.tipIcon, { backgroundColor: tip.color + '20' }]}>
                <Text style={{ fontSize: 24 }}>{tip.icon}</Text>
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipMsg}>{tip.msg}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#FF6B35' },
  headerRight: { fontSize: 16, fontWeight: '600', color: '#333' },

  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, paddingVertical: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  statBox: { flex: 1, alignItems: 'center' },
  statBoxBorder: { borderRightWidth: 1, borderRightColor: '#f0f0f0' },
  statVal: { fontSize: 18, fontWeight: '800', color: '#FF6B35' },
  statLabel: { fontSize: 10, color: '#999', marginTop: 2, textAlign: 'center' },

  card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 2 },
  chartHint: { fontSize: 11, color: '#bbb', marginBottom: 10 },
  chartWrap: { alignItems: 'flex-start', overflow: 'visible' },

  // Floating tooltip on charts
  chartTooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(30,30,30,0.88)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    zIndex: 10,
    minWidth: 72,
  },
  ttDay: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 1 },
  ttVal: { fontSize: 13, color: '#fff', fontWeight: '800' },
  ttMacro: { fontSize: 11, fontWeight: '700' },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendDash: { width: 14, borderTopWidth: 1.5, borderColor: '#FF6B35', borderStyle: 'dashed' },
  legendText: { fontSize: 11, color: '#999' },

  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  insightDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FF6B35', marginTop: 5 },
  insightText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 20 },

  section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  tipIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 2 },
  tipMsg: { fontSize: 12, color: '#999', lineHeight: 18 },
});
