"use client";
import React from "react";
import { useTheme } from "../context/ThemeContext";

export default function Logo({ style, className, height = "30px", alt = "Fly Media Technology" }) {
  const { theme, mounted } = useTheme();

  if (!mounted) {
    return (
      <span className="logo-img-wrapper" style={{ display: "inline-flex", alignItems: "center" }}>
        <img
          src="/logo.png"
          alt={alt}
          className="logo-light-only"
          style={{ height, objectFit: "contain", ...style }}
        />
        <img
          src="/flymedia-logo-white.png"
          alt={alt}
          className="logo-dark-only"
          style={{ height, objectFit: "contain", ...style }}
        />
      </span>
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
