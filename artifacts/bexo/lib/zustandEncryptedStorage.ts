import AsyncStorage from "@react-native-async-storage/async-storage";
import EncryptedStorage from "react-native-encrypted-storage";
import type { StateStorage } from "zustand/middleware";

const migratedKeys = new Set<string>();

async function migratePlaintextOnce(key: string): Promise<void> {
  if (migratedKeys.has(key)) return;
  try {
    const encrypted = await EncryptedStorage.getItem(key);
    if (encrypted != null) {
      migratedKeys.add(key);
      return;
    }
    const legacy = await AsyncStorage.getItem(key);
    if (legacy != null) {
      await EncryptedStorage.setItem(key, legacy);
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
 */
export function createEncryptedJSONStorage(): StateStorage {
  return {
    getItem: async (name) => {
      await migratePlaintextOnce(name);
      return EncryptedStorage.getItem(name);
    },
    setItem: (name, value) => EncryptedStorage.setItem(name, value),
    removeItem: (name) => EncryptedStorage.removeItem(name),
  };
}
