import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'salud_directa_token';

/**
 * Almacenamiento seguro del token JWT (SecureStore en iOS/Android, AsyncStorage en Web).
 */
export async function saveToken(token) {
  try {
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  } catch {
    await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
  }
}

export async function getToken() {
  try {
    if (Platform.OS !== 'web') {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    }
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  }
}

export async function deleteToken() {
  try {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
  }
}

export async function getJsonItem(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function setJsonItem(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignorar falla de escritura local
  }
}

export async function removeItem(key) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignorar falla de borrado local
  }
}
