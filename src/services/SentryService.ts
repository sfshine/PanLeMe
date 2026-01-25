import * as Sentry from '@sentry/react-native';
import DeviceInfo from 'react-native-device-info';

// Sentry DSN - Get from: https://sentry.io -> Project Settings -> Client Keys (DSN)
const SENTRY_DSN = 'https://cdb12185661433fd52c35517cb63b9a6@o4510768519446528.ingest.us.sentry.io/4510768520560640';

// Check if Sentry is properly configured
const isSentryConfigured = () => {
  return SENTRY_DSN;
};

/**
 * Initialize Sentry SDK
 * Should be called as early as possible in app startup (in index.js)
 */
export const initSentry = () => {
  if (!isSentryConfigured()) {
    console.warn('[SentryService] Sentry DSN not configured. Monitoring is disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Set environment based on __DEV__ flag
    environment: __DEV__ ? 'development' : 'production',

    sendDefaultPii: true,

    profilesSampleRate: __DEV__ ? 1.0 : 0.2, 
    
    // Enable performance monitoring
    tracesSampleRate: __DEV__ ? 1.0 : 0.2, // 100% in dev, 20% in production
    
    // Attach stack traces to all messages
    attachStacktrace: true,
    
    // Enable auto session tracking
    enableAutoSessionTracking: true,
    
    // ===== Performance Monitoring =====
    // Enable app start time tracking (冷启动/秒开监控)
    // Default: true, but explicitly set for clarity
    enableAppStartTracking: true,
    
    // Enable slow and frozen frames tracking (FPS/卡顿监控)
    // Default: true, but explicitly set for clarity
    enableNativeFramesTracking: true,
    
    // Enable stall tracking (JS 线程阻塞监控)
    // Default: true, but explicitly set for clarity
    enableStallTracking: true,
    
    // Enable user interaction tracing (用户交互性能)
    // Default: false, explicitly enable it
    enableUserInteractionTracing: true,
    
    // Enable auto performance tracing
    // Default: true, but explicitly set for clarity
    enableAutoPerformanceTracing: true,
    
    // Filter sensitive data before sending
    beforeSend(event) {
      // Remove sensitive data from events
      if (event.extra) {
        // Don't send API keys
        delete event.extra.apiKey;
        delete event.extra.api_key;
      }
      
      // Filter out breadcrumbs containing sensitive data
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter(breadcrumb => {
          const data = breadcrumb.data;
          if (data) {
            // Remove any authorization headers
            delete data.Authorization;
            delete data.authorization;
          }
          return true;
        });
      }
      
      return event;
    },
    
    // Filter sensitive breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Don't record breadcrumbs containing sensitive URLs or data
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        const data = breadcrumb.data;
        if (data?.url?.includes('api.deepseek.com')) {
          // Remove authorization header from request data
          delete data.request_body;
        }
      }
      return breadcrumb;
    },
  });
  
  console.log('[SentryService] Sentry initialized successfully');
  
  // Set device context asynchronously (non-blocking)
  setTimeout(() => setDeviceContext(), 0);
};

/**
 * Set device context information (called asynchronously after init)
 */
const setDeviceContext = async () => {
  if (!isSentryConfigured()) return;

  try {
    const [
      deviceId,
      deviceName,
      systemName,
      systemVersion,
      brand,
      model,
      isEmulator,
    ] = await Promise.all([
      DeviceInfo.getUniqueId(),
      DeviceInfo.getDeviceName(),
      DeviceInfo.getSystemName(),
      DeviceInfo.getSystemVersion(),
      DeviceInfo.getBrand(),
      DeviceInfo.getModel(),
      DeviceInfo.isEmulator(),
    ]);

    Sentry.setContext('device_info', {
      device_id: deviceId,
      device_name: deviceName,
      system_name: systemName,
      system_version: systemVersion,
      brand,
      model,
      is_emulator: isEmulator,
    });
  } catch (error) {
    console.error('[SentryService] Failed to set device context:', error);
  }
};


/**
 * Set user context (without sensitive data)
 */
export const setUserContext = (userId?: string) => {
  if (!isSentryConfigured()) return;

  if (userId) {
    Sentry.setUser({
      id: userId,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Set custom tags for filtering in Sentry dashboard
 */
export const setTag = (key: string, value: string) => {
  if (!isSentryConfigured()) return;
  Sentry.setTag(key, value);
};

/**
 * Set multiple tags at once
 */
export const setTags = (tags: Record<string, string>) => {
  if (!isSentryConfigured()) return;
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value);
  });
};

/**
 * Set custom context data
 */
export const setContext = (name: string, context: Record<string, any>) => {
  if (!isSentryConfigured()) return;
  Sentry.setContext(name, context);
};

/**
 * Capture an exception/error
 */
export const captureException = (
  error: Error | unknown,
  context?: Record<string, any>
) => {
  if (!isSentryConfigured()) {
    console.error('[SentryService] Error captured (Sentry disabled):', error);
    return;
  }

  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
};

/**
 * Capture a message/log
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) => {
  if (!isSentryConfigured()) {
    console.log(`[SentryService] Message captured (Sentry disabled): [${level}] ${message}`);
    return;
  }

  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureMessage(message, level);
    });
  } else {
    Sentry.captureMessage(message, level);
  }
};

/**
 * Add a breadcrumb for debugging
 */
export const addBreadcrumb = (
  category: string,
  message: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
) => {
  if (!isSentryConfigured()) return;

  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Start a performance transaction
 */
export const startTransaction = (
  name: string,
  op: string,
  data?: Record<string, any>
) => {
  if (!isSentryConfigured()) {
    return {
      finish: () => {},
      setStatus: () => {},
      setData: () => {},
      startChild: () => ({
        finish: () => {},
        setStatus: () => {},
        setData: () => {},
      }),
    };
  }

  return Sentry.startSpan(
    {
      name,
      op,
      attributes: data,
    },
    (span) => span
  );
};

/**
 * Track a custom event (for user behavior analytics)
 */
export const trackEvent = (
  eventName: string,
  properties?: Record<string, any>
) => {
  if (!isSentryConfigured()) {
    console.log(`[SentryService] Event tracked (Sentry disabled): ${eventName}`, properties);
    return;
  }

  // Use breadcrumb for event tracking
  addBreadcrumb('user_action', eventName, properties, 'info');
  
  // Also send as a message for dashboard visibility
  captureMessage(`Event: ${eventName}`, 'info', properties);
};

/**
 * Track API errors with context
 */
export const trackAPIError = (
  url: string,
  status: number,
  errorMessage: string,
  additionalContext?: Record<string, any>
) => {
  if (!isSentryConfigured()) {
    console.error(`[SentryService] API Error (Sentry disabled): ${status} ${url} - ${errorMessage}`);
    return;
  }

  const error = new Error(`API Error: ${status} - ${errorMessage}`);
  
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'api_error');
    scope.setTag('api_status', String(status));
    scope.setExtra('url', url);
    scope.setExtra('status', status);
    scope.setExtra('error_message', errorMessage);
    
    if (additionalContext) {
      Object.entries(additionalContext).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    // Categorize by status code
    if (status === 401) {
      scope.setTag('api_error_category', 'authentication');
    } else if (status === 402) {
      scope.setTag('api_error_category', 'payment_required');
    } else if (status >= 500) {
      scope.setTag('api_error_category', 'server_error');
    } else if (status >= 400) {
      scope.setTag('api_error_category', 'client_error');
    }
    
    Sentry.captureException(error);
  });
};

/**
 * Track performance metrics for API calls
 */
export const measureAPICall = async <T>(
  name: string,
  url: string,
  apiCall: () => Promise<T>
): Promise<T> => {
  if (!isSentryConfigured()) {
    return apiCall();
  }

  return Sentry.startSpan(
    {
      name,
      op: 'http.client',
      attributes: { url },
    },
    async (span) => {
      try {
        const result = await apiCall();
        span?.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span?.setStatus({ code: 2, message: String(error) }); // ERROR
        throw error;
      }
    }
  );
};

/**
 * Wrap a component with Sentry error boundary
 */
export const withErrorBoundary = Sentry.wrap;

/**
 * Export Sentry for direct access if needed
 */
export { Sentry };
