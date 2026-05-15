import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { StateStorage } from "zustand/middleware";

const migratedKeys = new Set<string>();

async function migratePlaintextOnce(key: string): Promise<void> {
  if (migratedKeys.has(key)) return;
  try {
    const existing = await SecureStore.getItemAsync(key);
    if (existing != null) {
      migratedKeys.add(key);
      return;
    }
    const legacy = await AsyncStorage.getItem(key);
    if (legacy != null) {
      await SecureStore.setItemAsync(key, legacy);
      await AsyncStorage.removeItem(key);
    }
    migratedKeys.add(key);
  } catch (e) {
    console.warn("[BEXO] Encrypted storage migration skipped:", key, e);
  }
}

/**
 * Zustand persist storage backed by Keychain / Keystore (encrypted at rest).
 * One-time migration from legacy AsyncStorage keys with the same name.
 * Compatible with Expo Go via expo-secure-store.
 */
export function createEncryptedJSONStorage(): StateStorage {
  return {
    getItem: async (name) => {
      await migratePlaintextOnce(name);
      return SecureStore.getItemAsync(name);
    },
    setItem: (name, value) => SecureStore.setItemAsync(name, value),
    removeItem: (name) => SecureStore.deleteItemAsync(name),
  };
}
