"use client";
import React from "react";
import { useTheme } from "../context/ThemeContext";

export default function Logo({ style, className, height = "30px", alt = "Fly Media Technology" }) {
  const { theme, mounted } = useTheme();

  if (!mounted) {
    return (
      <img
        src="/logo.png"
        alt={alt}
        style={{ height, objectFit: "contain", ...style }}
        className={className}
      />
    );
  }

  const isLight = theme === "light";

  return (
    <img
      src={isLight ? "/logo.png" : "/flymedia-logo-white.png"}
      alt={alt}
      style={{ height, objectFit: "contain", ...style }}
      className={className}
    />
  );
}
