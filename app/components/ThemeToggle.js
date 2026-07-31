"use client";
import React from "react";
import { useTheme } from "../context/ThemeContext";
import { FiSun, FiMoon } from "react-icons/fi";

export default function ThemeToggle({ style, className }) {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <div 
        style={{ width: "80px", height: "32px", borderRadius: "20px", background: "rgba(0,0,0,0.05)", ...style }} 
        className={className} 
      />
    );
  }

  const isLight = theme === "light";

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle Theme"
      title={`Switch to ${isLight ? "Dark" : "Light"} Mode`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 14px",
        borderRadius: "20px",
        border: "1px solid var(--glass-border)",
        background: isLight ? "rgba(2, 132, 199, 0.08)" : "rgba(255, 255, 255, 0.08)",
        color: isLight ? "#0284c7" : "#00f0ff",
        fontSize: "0.82rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                ...style
      }}
      className={className}
    >
      {isLight ? <FiSun style={{ fontSize: "1rem", color: "#d97706" }} /> : <FiMoon style={{ fontSize: "1rem", color: "#00f0ff" }} />}
      <span>{isLight ? "Light" : "Dark"}</span>
    </button>
  );
}
