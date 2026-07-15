// app/auth/AuthContext.js
"use client";
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Load user from localStorage on mount (client only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("devicedesk_auth_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    }
  }, []);

  const login = (usr) => {
    setUser(usr);
    if (typeof window !== "undefined") {
      localStorage.setItem("devicedesk_auth_user", JSON.stringify(usr));
      document.cookie = `devicedesk_user_role=${usr.role}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `devicedesk_auth_user=${encodeURIComponent(JSON.stringify(usr))}; path=/; max-age=86400; SameSite=Lax`;
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("devicedesk_auth_user");
      document.cookie = "devicedesk_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "devicedesk_auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
