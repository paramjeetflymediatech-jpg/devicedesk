"use client";

import { useEffect, useState } from "react";
import Logo from "./components/Logo.js";

export default function GlobalLoading() {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white/90 backdrop-blur-xl text-slate-900 font-sans p-6">
      <div className="flex flex-col items-center gap-6 p-8 md:p-10 rounded-3xl bg-white border border-slate-200/80 shadow-2xl shadow-slate-200/80 text-center max-w-sm w-full">
        {/* Pulsing Logo */}
        <div className="animate-pulse">
          <Logo height="44px" />
        </div>

        {/* Dual Ring Glowing Spinner */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 border-r-blue-600 animate-spin" />
          <div className="absolute inset-1.5 rounded-full border-4 border-transparent border-b-indigo-500 border-l-pink-500 animate-[spin_1.5s_linear_infinite_reverse]" />
        </div>

        {/* Status Subtitle & Dots */}
        <div>
          <p className="text-base font-semibold text-slate-900 tracking-wide">
            Loading DeviceDesk Workspace{dots}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Synchronizing system assets & security protocols
          </p>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
          <div className="absolute h-full w-1/3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full shadow-[0_0_10px_rgba(2,132,199,0.4)] animate-[loadingBar_1.6s_ease-in-out_infinite]" />
        </div>
      </div>

      <style jsx global>{`
        @keyframes loadingBar {
          0% { left: -33%; }
          50% { left: 100%; }
          100% { left: -33%; }
        }
      `}</style>
    </div>
  );
}
