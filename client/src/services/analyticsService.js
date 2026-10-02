/**
 * CampusPro Analytics Integration Service
 * 
 * STATUS: CODE READY
 * PREREQUISITE: Requires institutional Google Analytics / Measurement ID configuration
 * 
 * To activate analytics in production:
 * 1. Obtain a valid Measurement ID from institutional Google Analytics (e.g. G-XXXXXXXXXX)
 * 2. Set VITE_GA_MEASUREMENT_ID in client environment configuration:
 *    VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 * 
 * If VITE_GA_MEASUREMENT_ID is unset, all tracking calls safely no-op without network requests or errors.
 */

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || null;
let isInitialized = false;

export const initAnalytics = () => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') {
    // Analytics property not configured — safely no-op
    return false;
  }

  if (isInitialized) return true;

  try {
    // Dynamically inject Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      send_page_view: false // Managed manually via page tracking
    });

    window.gtag = gtag;
    isInitialized = true;
    console.log('[Analytics] Initialized with measurement ID:', GA_MEASUREMENT_ID);
    return true;
  } catch (err) {
    console.warn('[Analytics] Failed to initialize analytics:', err.message);
    return false;
  }
};

export const trackPageView = (path) => {
  if (!isInitialized || typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', 'page_view', {
      page_path: path
    });
  } catch (e) {
    // Ignore tracking failures gracefully
  }
};

export const trackEvent = (action, category, label = null, value = null) => {
  if (!isInitialized || typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  } catch (e) {
    // Ignore tracking failures gracefully
  }
};

export default {
  initAnalytics,
  trackPageView,
  trackEvent,
  isConfigured: () => Boolean(GA_MEASUREMENT_ID)
};
