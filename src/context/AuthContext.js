import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

const KEYS = {
  token: 'auth_token',
  user: 'auth_user',
  onboarded: 'auth_onboarded',
};

const AuthContext = createContext(null);

async function saveSession(token, user, onboarded) {
  await SecureStore.setItemAsync(KEYS.token, token);
  await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
  await SecureStore.setItemAsync(KEYS.onboarded, onboarded ? 'true' : 'false');
}

async function clearSession() {
  await SecureStore.deleteItemAsync(KEYS.token);
  await SecureStore.deleteItemAsync(KEYS.user);
  await SecureStore.deleteItemAsync(KEYS.onboarded);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [onboarded, setOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restore session from SecureStore on app start
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await SecureStore.getItemAsync(KEYS.token);
        const savedUser = await SecureStore.getItemAsync(KEYS.user);
        const savedOnboarded = await SecureStore.getItemAsync(KEYS.onboarded);

        if (savedToken && savedUser) {
          global.authToken = savedToken;
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          setOnboarded(savedOnboarded === 'true');
        }
      } catch {
        // If restore fails, stay logged out
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const googleLogin = async (idToken) => {
    const res = await authAPI.googleAuth(idToken);
    const { user, token } = res.data.data;
    global.authToken = token;
    setToken(token);
    setUser(user);
    // New Google users haven't set body stats — send them through onboarding
    const isNewUser = !user.age && !user.weightKg && !user.heightCm;
    setOnboarded(!isNewUser);
    await saveSession(token, user, !isNewUser);
    return user;
  };

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { user, token } = res.data.data;
    global.authToken = token;
    setToken(token);
    setUser(user);
    // Existing users who completed onboarding have body stats set
    const hasOnboarded = !!(user.age || user.weightKg || user.heightCm || user.goal);
    setOnboarded(hasOnboarded);
    await saveSession(token, user, hasOnboarded);
    return user;
  };

  const register = async (name, email, password, phone, otp) => {
    const res = await authAPI.register({ name, email, password, phone, otp });
    const { user, token } = res.data.data;
    global.authToken = token;
    setToken(token);
    setUser(user);
    setOnboarded(false);
    await saveSession(token, user, false);
    return user;
  };

  const completeOnboarding = async (data) => {
    try {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      setOnboarded(true);
      if (token) await saveSession(token, updatedUser, true);
      // Persist body stats to server so they survive re-login
      try {
        await authAPI.updateProfile({
          gender: data.gender,
          age: data.age ? Number(data.age) : undefined,
          heightCm: data.height ? Number(data.height) : undefined,
          weightKg: data.weight ? Number(data.weight) : undefined,
          activityLevel: data.activity,
          goal: data.goal,
        });
      } catch {}
    } catch {
      setOnboarded(true);
    }
  };

  const updateProfile = async (data) => {
    try {
      const res = await authAPI.updateProfile(data);
      // Merge order: preserve client-only fields (dailyCalorieGoal etc.) even if server doesn't return them
      const updatedUser = { ...user, ...data, ...res.data.data };
      setUser(updatedUser);
      if (token) await saveSession(token, updatedUser, onboarded);
    } catch {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      if (token) await saveSession(token, updatedUser, onboarded);
    }
  };

  const logout = async () => {
    global.authToken = null;
    setToken(null);
    setUser(null);
    setOnboarded(false);
    await clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, googleLogin, register, logout, onboarded, completeOnboarding, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
