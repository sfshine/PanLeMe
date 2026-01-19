import { makeAutoObservable } from 'mobx';
import { StorageService, StorageKeys } from '../services/StorageService';

class UserStore {
  apiKey: string | null = null;
  baseUrl: string = 'https://api.deepseek.com';
  hasHydrated: boolean = false;

  constructor() {
    makeAutoObservable(this);
    this.hydrate();
  }

  hydrate() {
    const key = StorageService.getString(StorageKeys.API_KEY);
    const url = StorageService.getString(StorageKeys.BASE_URL);
    if (key) {
      this.apiKey = key;
    }
    if (url) {
      this.baseUrl = url;
    }
    this.hasHydrated = true;
  }

  setApiKey(key: string) {
    this.apiKey = key;
    StorageService.setString(StorageKeys.API_KEY, key);
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
    StorageService.setString(StorageKeys.BASE_URL, url);
  }

  clearApiKey() {
    this.apiKey = null;
    StorageService.removeItem(StorageKeys.API_KEY);
    // Optional: Keep base URL or clear it? Keeping it is usually more convenient.
  }

  get isConfigured() {
    return !!this.apiKey;
  }
}

export const userStore = new UserStore();
