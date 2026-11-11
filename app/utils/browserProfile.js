'use client';

/**
 * Generates or retrieves a persistent Browser Profile Identifier unique to this browser's profile sandbox.
 * Because Google Chrome keeps separate localStorage, IndexedDB, and cookies for each Chrome profile,
 * this identifier uniquely isolates and identifies the specific Chrome profile.
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
 * Decodes a Google JWT Credential returned by Google One Tap / Google Identity Services.
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
export function syncBrowserProfileCookie(explicitGoogle = null) {
  if (typeof window === 'undefined') return;
  try {
    const profileId = getStoredProfileId();
    let google = explicitGoogle;
    if (!google) {
      const stored = localStorage.getItem('devicedesk_google_profile');
      if (stored) {
        try {
          google = JSON.parse(stored);
        } catch (e) {}
      }
    }

    const isChrome = Boolean(
      window.chrome ||
      (navigator.userAgentData?.brands || []).some((b) => b.brand.toLowerCase().includes('chrome'))
    );

    const cookiePayload = {
      profileId,
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
      isChrome: false,
      googleEmail: null,
      googleName: null
    };
  }

  const profileId = getStoredProfileId();

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
    brands.some((b) => b.brand.toLowerCase().includes('chrome'))
  );

  const chromeBrand = brands.find((b) => b.brand.toLowerCase().includes('chrome')) || null;

  const data = {
    profileId,
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
    screen: `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio || 1}x)`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language || 'en-US',
    deviceMemory: navigator.deviceMemory || null,
    hardwareConcurrency: navigator.hardwareConcurrency || null
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
    // Dynamically inject Google Identity Services script
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
