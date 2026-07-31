// app/auth/AuthContext.js
"use client";
import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("devicedesk_auth_user");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          localStorage.removeItem("devicedesk_auth_user");
        }
      }
    }
    return null;
  });

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
      localStorage.removeItem("devicedesk_employee_view");
      localStorage.removeItem("devicedesk_unread_chat_count");
      
      // Clear cookies with max-age=0 & expired date
      document.cookie = "devicedesk_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
      document.cookie = "devicedesk_auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
      
      // Perform clean full-page refresh to login page
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
