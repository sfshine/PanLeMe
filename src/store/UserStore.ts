import { makeAutoObservable } from 'mobx';
import { StorageService, StorageKeys } from '../services/StorageService';

class UserStore {
  apiKey: string | null = 'sk-5a712ff6c94349d588e7acb3cdd57810';
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
    } else {
      // Set default key if not exists in storage
      this.apiKey = 'sk-5a712ff6c94349d588e7acb3cdd57810';
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
