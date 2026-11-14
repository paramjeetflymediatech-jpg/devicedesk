// app/auth/AuthContext.js
"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { saveGoogleProfile } from "../utils/browserProfile.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("devicedesk_auth_user");
      if (stored) {
        try {
          const parsedUser = JSON.parse(stored);
          const now = Date.now();

          // Check if stored token / session has expired
          if (parsedUser?.expiresAt && now > Number(parsedUser.expiresAt)) {
            console.warn("[AuthContext] Stored session token is expired. Removing...");
            localStorage.removeItem("devicedesk_auth_user");
            localStorage.removeItem("devicedesk_google_profile");
            document.cookie = "devicedesk_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax";
            document.cookie = "devicedesk_auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax";
            document.cookie = "devicedesk_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax";
            document.cookie = "devicedesk_token_exp=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax";
            return null;
          }

          const remainingSeconds = parsedUser?.expiresAt
            ? Math.max(0, Math.floor((Number(parsedUser.expiresAt) - now) / 1000))
            : 86400;

          const roleValue = parsedUser.dbRole || parsedUser.role || 'employee';
          document.cookie = `devicedesk_user_role=${encodeURIComponent(roleValue)}; path=/; max-age=${remainingSeconds}; SameSite=Lax`;
          document.cookie = `devicedesk_auth_user=${encodeURIComponent(stored)}; path=/; max-age=${remainingSeconds}; SameSite=Lax`;
          if (parsedUser.token) {
            document.cookie = `devicedesk_token=${encodeURIComponent(parsedUser.token)}; path=/; max-age=${remainingSeconds}; SameSite=Lax`;
          }
          if (parsedUser.expiresAt) {
            document.cookie = `devicedesk_token_exp=${parsedUser.expiresAt}; path=/; max-age=${remainingSeconds}; SameSite=Lax`;
          }

          if (parsedUser && parsedUser.email) {
            saveGoogleProfile({ email: parsedUser.email, name: parsedUser.name });
          }
          return parsedUser;
        } catch (e) {
          localStorage.removeItem("devicedesk_auth_user");
        }
      }
    }
    return null;
  });

  const logout = useCallback((isExpired = false) => {
    setUser(null);
    if (typeof window !== "undefined") {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      localStorage.removeItem('devicedesk_auth_user');
      localStorage.removeItem('devicedesk_google_profile');
      sessionStorage.clear();

      // Clear cookies with max-age=0 & expired date
      const expiredCookie = "; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax";
      document.cookie = `devicedesk_user_role=${expiredCookie}`;
      document.cookie = `devicedesk_auth_user=${expiredCookie}`;
      document.cookie = `devicedesk_token=${expiredCookie}`;
      document.cookie = `devicedesk_token_exp=${expiredCookie}`;
      document.cookie = `devicedesk_browser_profile=${expiredCookie}`;

      // Perform clean full-page navigation to login page
      const targetUrl = isExpired ? "/login?expired=1" : "/login?logout=1";
      window.location.href = targetUrl;
    }
  }, []);

  const login = useCallback((usr, token, expiresAt) => {
    if (!usr) return;
    const now = Date.now();
    const effectiveToken = token || usr?.token || '';
    const effectiveExpiresAt = expiresAt || usr?.expiresAt || (now + 86400 * 1000);

    const fullUser = {
      ...usr,
      token: effectiveToken,
      expiresAt: effectiveExpiresAt
    };

    setUser(fullUser);

    if (typeof window !== "undefined") {
      const remainingSeconds = Math.max(0, Math.floor((effectiveExpiresAt - now) / 1000));
      const serializedUser = JSON.stringify(fullUser);

      localStorage.setItem("devicedesk_auth_user", serializedUser);

      const roleValue = fullUser.dbRole || fullUser.role || 'employee';
      document.cookie = `devicedesk_user_role=${encodeURIComponent(roleValue)}; path=/; max-age=${remainingSeconds}; SameSite=Lax`;
      document.cookie = `devicedesk_auth_user=${encodeURIComponent(serializedUser)}; path=/; max-age=${remainingSeconds}; SameSite=Lax`;
      if (effectiveToken) {
        document.cookie = `devicedesk_token=${encodeURIComponent(effectiveToken)}; path=/; max-age=${remainingSeconds}; SameSite=Lax`;
      }
      document.cookie = `devicedesk_token_exp=${effectiveExpiresAt}; path=/; max-age=${remainingSeconds}; SameSite=Lax`;

      // Auto-bind active browser profile to logged-in user's email
      if (fullUser && fullUser.email) {
        saveGoogleProfile({ email: fullUser.email, name: fullUser.name });
      }
    }
  }, []);

  // Proactive token expiration polling:
  // Automatically detects when the active session expires and cleanly sends the user to /login
  useEffect(() => {
    setLoading(false);

    const checkTokenExpiry = () => {
      if (typeof window === "undefined") return;
      const stored = localStorage.getItem("devicedesk_auth_user");
      if (!stored) return;

      try {
        const parsed = JSON.parse(stored);
        if (parsed?.expiresAt && Date.now() > Number(parsed.expiresAt)) {
          console.warn("[AuthContext] Session expired during active usage. Redirecting to login...");
          logout(true);
        }
      } catch (err) {
        // Corrupted localStorage item
        logout(true);
      }
    };

    // Check immediately on mount, on window focus, and periodically every 15 seconds
    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 15000);
    window.addEventListener("focus", checkTokenExpiry);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkTokenExpiry();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkTokenExpiry);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
