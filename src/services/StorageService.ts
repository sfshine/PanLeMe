import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'panleme-storage',
  encryptionKey: 'panleme-encryption-key',
});

export const StorageKeys = {
  API_KEY: 'user_api_key',
  BASE_URL: 'user_base_url',
  CHAT_SESSIONS: 'chat_sessions',
  SETTINGS: 'app_settings',
};

export const StorageService = {
  getString: (key: string) => storage.getString(key),
  setString: (key: string, value: string) => storage.set(key, value),
  getBool: (key: string) => storage.getBoolean(key),
  setBool: (key: string, value: boolean) => storage.set(key, value),
  getObject: <T>(key: string): T | undefined => {
    const value = storage.getString(key);
    if (value) {
      try {
        return JSON.parse(value) as T;
      } catch {
        return undefined;
      }
    }
    return undefined;
  },
  setObject: <T>(key: string, value: T) => storage.set(key, JSON.stringify(value)),
  removeItem: (key: string) => storage.delete(key),
  clearAll: () => storage.clearAll(),
};
