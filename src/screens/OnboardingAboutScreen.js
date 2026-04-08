import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, BackHandler, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function OnboardingAboutScreen({ navigation }) {
  const { logout } = useAuth();

  // Intercept Android hardware back button — sign out instead of exiting app
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => { logout(); return true; };
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [logout])
  );

  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  const canNext = age && height && weight && gender;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.logo}>🥗</Text>
        <Text style={styles.title}>Let's set up your profile</Text>
        <Text style={styles.sub}>We need a few details to personalize your calorie goal</Text>

        <View style={styles.cautionBox}>
          <Text style={styles.cautionIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cautionTitle}>All fields are required</Text>
            <Text style={styles.cautionText}>Age, height, weight and gender are used to calculate your calorie goal. <Text style={styles.cautionBold}>Gender cannot be changed after this step.</Text></Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '33%' }]} />
        </View>
        <Text style={styles.progressText}>Step 1 of 3</Text>

        <Text style={styles.label}>How old are you?</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="25"
            placeholderTextColor="#999"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
          />
          <Text style={styles.unit}>years</Text>
        </View>

        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderRow}>
          {[
            { id: 'male', icon: '♂️', label: 'Male' },
            { id: 'female', icon: '♀️', label: 'Female' },
          ].map(g => (
            <TouchableOpacity
              key={g.id}
              style={[styles.genderBtn, gender === g.id && styles.genderBtnActive]}
              onPress={() => setGender(g.id)}
            >
              <Text style={styles.genderIcon}>{g.icon}</Text>
              <Text style={[styles.genderText, gender === g.id && styles.genderTextActive]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rowInputs}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Weight</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="70"
                placeholderTextColor="#999"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
              <Text style={styles.unit}>kg</Text>
            </View>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Height</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="175"
                placeholderTextColor="#999"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />
              <Text style={styles.unit}>cm</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btn, !canNext && styles.btnDisabled]}
          onPress={() => {
            const a = Number(age), h = Number(height), w = Number(weight);
            if (!a || a < 10 || a > 100) return Alert.alert('Invalid Age', 'Please enter an age between 10 and 100.');
            if (!h || h < 100 || h > 250) return Alert.alert('Invalid Height', 'Please enter a height between 100 and 250 cm.');
            if (!w || w < 20 || w > 300) return Alert.alert('Invalid Weight', 'Please enter a weight between 20 and 300 kg.');
            navigation.navigate('OnboardingActivity', { gender, age, height, weight });
          }}
          disabled={!canNext}
        >
          <Text style={styles.btnText}>Continue →</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={logout} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>← Sign out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24 },
  logo: { fontSize: 40, textAlign: 'center', marginBottom: 12, marginTop: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#333', textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 12 },
  cautionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, padding: 12, marginBottom: 8 },
  cautionIcon: { fontSize: 16, marginTop: 1 },
  cautionTitle: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 2 },
  cautionText: { fontSize: 12, color: '#78350f', lineHeight: 17 },
  cautionBold: { fontWeight: '800', color: '#b45309' },
  progressBar: { height: 5, backgroundColor: '#f0f0f0', borderRadius: 99, marginBottom: 6 },
  progressFill: { height: 5, backgroundColor: '#FF6B35', borderRadius: 99 },
  progressText: { fontSize: 11, color: '#999', textAlign: 'right', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8, marginTop: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 15, color: '#333', backgroundColor: '#f9f9f9' },
  unit: { fontSize: 14, color: '#999', width: 36 },
  rowInputs: { flexDirection: 'row', marginTop: 4 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, padding: 16, alignItems: 'center', gap: 6, backgroundColor: '#f9f9f9' },
  genderBtnActive: { borderColor: '#FF6B35', backgroundColor: 'rgba(255,107,53,0.08)' },
  genderIcon: { fontSize: 24 },
  genderText: { fontSize: 14, fontWeight: '600', color: '#999' },
  genderTextActive: { color: '#FF6B35' },
  btn: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  skip: { textAlign: 'center', color: '#999', fontSize: 13, marginTop: 16, marginBottom: 24 },
  signOutBtn: { alignItems: 'center', marginTop: 16, marginBottom: 24 },
  signOutText: { color: '#999', fontWeight: '600', fontSize: 14 },
});