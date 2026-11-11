'use client';

/**
 * Detects the specific Browser Name and Brand accurately.
 */
export function detectBrowserBrand() {
  if (typeof window === 'undefined') return 'Unknown Browser';
  const ua = navigator.userAgent || '';
  const brands = navigator.userAgentData?.brands || [];

  if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
    return 'Brave Browser';
  }
  if (brands.some((b) => b.brand.toLowerCase().includes('edge') || b.brand.toLowerCase().includes('edg'))) {
    return 'Microsoft Edge';
  }
  if (brands.some((b) => b.brand.toLowerCase().includes('opera') || b.brand.toLowerCase().includes('opr'))) {
    return 'Opera';
  }
  if (brands.some((b) => b.brand.toLowerCase().includes('chrome'))) {
    return 'Google Chrome';
  }
  if (ua.includes('Edg/')) return 'Microsoft Edge';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Vivaldi/')) return 'Vivaldi';
  if (ua.includes('Firefox/')) return 'Mozilla Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Apple Safari';
  if (ua.includes('Chrome/')) return 'Google Chrome';

  return 'Web Browser';
}

/**
 * Extracts WebGL Hardware GPU Renderer & Vendor.
 */
export function getGpuRenderer() {
  if (typeof window === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return null;
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    return {
      renderer: renderer || 'Standard WebGL',
      vendor: vendor || 'Unknown Vendor'
    };
  } catch (e) {
    return null;
  }
}

/**
 * Generates or retrieves a persistent Browser Profile Identifier unique to this browser profile sandbox.
 * Because Google Chrome, Edge, and other browsers isolate localStorage per profile directory,
 * this identifier uniquely and permanently tracks the specific profile.
 */
export function getStoredProfileId() {
  if (typeof window === 'undefined') return 'server_render';
  try {
    let pid = localStorage.getItem('devicedesk_browser_profile_id');
    if (!pid) {
      const rand = Math.random().toString(36).substring(2, 10);
      const time = Date.now().toString(36);
      pid = `chrome_prof_${rand}_${time}`;
      localStorage.setItem('devicedesk_browser_profile_id', pid);
    }
    return pid;
  } catch (e) {
    return 'chrome_prof_unsupported';
  }
}

/**
 * Decodes a Google JWT Credential returned by Google Identity Services / One Tap.
 */
export function decodeGoogleJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode Google JWT token:', e);
    return null;
  }
}

/**
 * Saves connected Google Profile data to local storage and updates the sync cookie.
 */
export function saveGoogleProfile(googleData) {
  if (typeof window === 'undefined') return;
  try {
    if (googleData && (googleData.email || googleData.sub)) {
      const payload = {
        email: googleData.email ? String(googleData.email).trim().toLowerCase() : null,
        name: googleData.name || null,
        sub: googleData.sub || null,
        picture: googleData.picture || null,
        linkedAt: new Date().toISOString()
      };
      localStorage.setItem('devicedesk_google_profile', JSON.stringify(payload));
      syncBrowserProfileCookie(payload);
    } else {
      localStorage.removeItem('devicedesk_google_profile');
      syncBrowserProfileCookie(null);
    }
  } catch (e) {
    console.warn('Failed to save Google profile:', e);
  }
}

/**
 * Synchronizes browser profile and Google ID state to the `devicedesk_browser_profile` cookie,
 * ensuring all subsequent API calls inherit the browser profile automatically.
 */
export function syncBrowserProfileCookie(explicitGoogle = undefined) {
  if (typeof window === 'undefined') return;
  try {
    const profileId = getStoredProfileId();
    let google = explicitGoogle;
    if (explicitGoogle === undefined) {
      const stored = localStorage.getItem('devicedesk_google_profile');
      if (stored) {
        try {
          google = JSON.parse(stored);
        } catch (e) {}
      }
    }

    const browserName = detectBrowserBrand();
    const isChrome = browserName.toLowerCase().includes('chrome');

    const cookiePayload = {
      profileId,
      browserName,
      googleEmail: google?.email || null,
      googleName: google?.name || null,
      googleSub: google?.sub || null,
      isChrome,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language || 'en'
    };

    document.cookie = `devicedesk_browser_profile=${encodeURIComponent(
      JSON.stringify(cookiePayload)
    )}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (e) {}
}

/**
 * Assembles full high-entropy browser profile and Google Identity metadata.
 */
export async function getBrowserProfileData() {
  if (typeof window === 'undefined') {
    return {
      profileId: 'server',
      browserName: 'Server',
      isChrome: false,
      googleEmail: null,
      googleName: null
    };
  }

  const profileId = getStoredProfileId();
  const browserName = detectBrowserBrand();

  let google = null;
  try {
    const stored = localStorage.getItem('devicedesk_google_profile');
    if (stored) google = JSON.parse(stored);
  } catch (e) {}

  let clientHints = null;
  if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
    try {
      clientHints = await navigator.userAgentData.getHighEntropyValues([
        'architecture',
        'bitness',
        'model',
        'platformVersion',
        'fullVersionList'
      ]);
    } catch (e) {}
  }

  const brands = navigator.userAgentData?.brands || [];
  const isChrome = Boolean(
    window.chrome ||
    browserName.toLowerCase().includes('chrome') ||
    brands.some((b) => b.brand.toLowerCase().includes('chrome'))
  );

  const chromeBrand = brands.find((b) => b.brand.toLowerCase().includes('chrome')) || null;
  const gpu = getGpuRenderer();

  const data = {
    profileId,
    browserName,
    googleEmail: google?.email || null,
    googleName: google?.name || null,
    googleSub: google?.sub || null,
    googlePicture: google?.picture || null,
    isChrome,
    chromeVersion: chromeBrand ? chromeBrand.version : null,
    architecture: clientHints?.architecture || null,
    bitness: clientHints?.bitness || null,
    platformVersion: clientHints?.platformVersion || null,
    deviceModel: clientHints?.model || null,
    screen: `${window.screen?.width || 0}x${window.screen?.height || 0} (${window.devicePixelRatio || 1}x, ${window.screen?.colorDepth || 24}-bit)`,
    gpuRenderer: gpu?.renderer || null,
    gpuVendor: gpu?.vendor || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.languages ? navigator.languages.join(', ') : (navigator.language || 'en-US'),
    deviceMemory: navigator.deviceMemory || null,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    maxTouchPoints: navigator.maxTouchPoints || 0
  };

  syncBrowserProfileCookie(google);

  return data;
}

/**
 * Initializes Google One Tap (FedCM / Identity Services) if Google Client ID is configured.
 */
export function initGoogleOneTap({ clientId, onGoogleUser }) {
  if (typeof window === 'undefined') return;

  const targetClientId = clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!targetClientId) return;

  const setupOneTap = () => {
    if (!window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: targetClientId,
        callback: (response) => {
          if (response?.credential) {
            const decoded = decodeGoogleJwt(response.credential);
            if (decoded) {
              const googleProfile = {
                email: decoded.email,
                name: decoded.name,
                sub: decoded.sub,
                picture: decoded.picture
              };
              saveGoogleProfile(googleProfile);
              if (typeof onGoogleUser === 'function') {
                onGoogleUser({
                  credential: response.credential,
                  profile: googleProfile
                });
              }
            }
          }
        },
        auto_select: true,
        cancel_on_tap_outside: false
      });

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.log('[Google One Tap] Notification not displayed:', notification.getNotDisplayedReason());
        }
      });
    } catch (e) {
      console.warn('[Google One Tap] Initialization warning:', e);
    }
  };

  if (window.google?.accounts?.id) {
    setupOneTap();
  } else {
    const existingScript = document.getElementById('google-gsi-client');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = setupOneTap;
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener('load', setupOneTap);
    }
  }
}

/**
 * Installs a lightweight global fetch interceptor to automatically attach browser profile
 * headers (`x-browser-profile-id`, `x-google-email`, `x-browser-name`) to every client-side API call.
 */
let interceptorInstalled = false;
export function installGlobalFetchInterceptor() {
  if (typeof window === 'undefined' || interceptorInstalled) return;
  interceptorInstalled = true;

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    try {
      const [resource, config = {}] = args;
      const profileId = getStoredProfileId();
      let googleEmail = null;
      try {
        const stored = localStorage.getItem('devicedesk_google_profile');
        if (stored) googleEmail = JSON.parse(stored)?.email;
      } catch (e) {}

      const browserName = detectBrowserBrand();

      // Check if URL is internal API request
      const isApi = typeof resource === 'string' && (resource.startsWith('/api') || resource.includes('/api/'));

      if (isApi) {
        const headers = new Headers(config.headers || {});
        if (profileId && !headers.has('x-browser-profile-id')) {
          headers.set('x-browser-profile-id', profileId);
        }
        if (googleEmail && !headers.has('x-google-email')) {
          headers.set('x-google-email', googleEmail);
        }
        if (browserName && !headers.has('x-browser-name')) {
          headers.set('x-browser-name', browserName);
        }
        config.headers = headers;
        args[1] = config;
      }
    } catch (e) {}

    return originalFetch.apply(this, args);
  };
}

/**
 * Analyzes browser and sends session arrival audit to the backend once per browser tab session.
 */
export async function trackSiteArrival() {
  if (typeof window === 'undefined') return;

  try {
    installGlobalFetchInterceptor();
    const profile = await getBrowserProfileData();

    // Check if session arrival was already recorded in this tab session
    const sessionKey = 'devicedesk_session_analyzed_' + (profile.profileId || 'default');
    if (sessionStorage.getItem(sessionKey)) {
      return profile;
    }
    sessionStorage.setItem(sessionKey, 'true');

    // Notify backend about the analyzed browser arrival
    fetch('/api/security/browser-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        browserProfile: profile,
        pageUrl: window.location.pathname,
        referrer: document.referrer || null
      })
    }).catch(() => {});

    return profile;
  } catch (err) {
    console.warn('Browser profile site arrival check:', err);
  }
}
