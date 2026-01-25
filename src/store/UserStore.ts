import { makeAutoObservable } from 'mobx';
import { StorageService, StorageKeys } from '../services/StorageService';
import { trackEvent, addBreadcrumb, setUserContext } from '../services/SentryService';

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
    
    // Track API key configured event (don't log the actual key)
    addBreadcrumb('user_action', 'API key configured');
    trackEvent('api_key_configured', {
      hasKey: true,
    });
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
    StorageService.setString(StorageKeys.BASE_URL, url);
    
    addBreadcrumb('user_action', 'Base URL configured', { baseUrl: url });
  }

  clearApiKey() {
    this.apiKey = null;
    StorageService.removeItem(StorageKeys.API_KEY);
    // Optional: Keep base URL or clear it? Keeping it is usually more convenient.
    
    // Track API key cleared event
    addBreadcrumb('user_action', 'API key cleared');
    trackEvent('api_key_cleared', {});
    setUserContext(undefined); // Clear user context
  }

  get isConfigured() {
    return !!this.apiKey;
  }
}

export const userStore = new UserStore();
