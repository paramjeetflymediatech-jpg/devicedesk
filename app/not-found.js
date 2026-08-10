"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./components/Logo.js";
import {
  FiHome,
  FiArrowLeft,
  FiAlertCircle,
  FiCompass,
  FiRefreshCw,
} from "react-icons/fi";

export default function NotFound() {
  const [homePath, setHomePath] = useState("/login");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("devicedesk_auth_user");
      if (stored) {
        const user = JSON.parse(stored);
        const role = (user?.role || "").toLowerCase();
        if (role === "employee") {
          setHomePath("/employee-dashboard");
        } else {
          setHomePath("/");
        }
      }
    } catch {
      setHomePath("/login");
    }
  }, []);

  const handleGoBack = () => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  const handleRefresh = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col justify-between p-6 md:p-12 overflow-hidden">
      {/* Background Animated Gradient Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-[30rem] w-[30rem] rounded-full bg-cyan-400/20 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-20 -right-20 h-[30rem] w-[30rem] rounded-full bg-blue-500/15 blur-[130px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[25rem] w-[25rem] rounded-full bg-indigo-300/20 blur-[140px] animate-pulse delay-500" />

        {/* Subtle Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(#0284c7 1px, transparent 1px), radial-gradient(#2563eb 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            backgroundPosition: "0 0, 18px 18px"
          }}
        />
      </div>

      {/* Top Header Navigation */}
      <header className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between py-2">
        <div className="transition-transform hover:scale-105 duration-300">
          <Logo height="40px" />
        </div>
      </header>

      {/* Open Center Content (No Card / No Box Container) */}
      <section
        className={`relative z-10 w-full max-w-3xl mx-auto text-center my-auto py-8 transition-all duration-700 ease-out ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        

        {/* Open Floating 404 Number (No Container Box) */}
        <div className="relative mb-4 select-none">
          <div className="animate-float inline-block bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-[8rem] sm:text-[11rem] md:text-[13rem] font-black leading-none tracking-tighter text-transparent drop-shadow-sm">
            404
          </div>
        </div>

        {/* Heading & Subtitle */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">
          Oops! Page Went Offline
        </h1>
        <p className="max-w-lg mx-auto text-base sm:text-lg text-slate-600 leading-relaxed mb-10">
          The page or resource you requested does not exist, has been moved, or you don't have access permissions.
        </p>

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <Link
            href={homePath}
            className="group flex min-h-[52px] w-full sm:w-auto px-8 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/40 active:translate-y-0"
          >
            <FiHome className="text-lg transition-transform duration-300 group-hover:scale-110" />
            <span>Return to Dashboard</span>
          </Link>

          <button
            type="button"
            onClick={handleGoBack}
            className="group flex min-h-[52px] w-full sm:w-auto px-8 items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white/90 text-slate-700 font-semibold text-sm shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900 active:translate-y-0"
          >
            <FiArrowLeft className="text-lg transition-transform duration-300 group-hover:-translate-x-1" />
            <span>Go Back</span>
          </button>
        </div>

        {/* Refresh Link */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handleRefresh}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 hover:bg-slate-200/50"
          >
            <FiRefreshCw className="text-base transition-transform duration-500 group-hover:rotate-180" />
            <span>Refresh Page</span>
          </button>
        </div>
      </section>

     

      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(1deg);
          }
        }
        @keyframes spinSlow {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spinSlow 12s linear infinite;
        }
      `}</style>
    </main>
  );
}