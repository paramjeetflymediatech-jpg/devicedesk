"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import { useAuth } from "../auth/AuthContext";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import { FiMail, FiShield, FiRefreshCw, FiLogOut, FiCopy, FiCheck, FiPause } from "react-icons/fi";

const HR_EMAIL = "hr@flymediatech.in";
const ADMIN_EMAIL = "admin@flymediatech.in";

function routeForRole(role, router) {
  const r = (role || "").toLowerCase();
  if (r === "admin" || r === "management") router.push("/");
  else if (r.includes("leader") || r === "tl") router.push("/portal/leader");
  else router.push("/employee-dashboard");
}

function InactiveAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, logout } = useAuth();

  const [checking, setChecking] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [copied, setCopied] = useState("");
  const [targetUser, setTargetUser] = useState(null);

  // Guarantee 100vw layout across desktop monitors by overriding body flex-row
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.add("page-full-width");
    const prevDisplay = document.body.style.display;
    const prevFlexDir = document.body.style.flexDirection;
    const prevWidth = document.body.style.width;
    const prevMinHeight = document.body.style.minHeight;

    document.body.style.display = "flex";
    document.body.style.flexDirection = "column";
    document.body.style.width = "100%";
    document.body.style.minWidth = "100vw";
    document.body.style.minHeight = "100vh";
    document.body.style.margin = "0";
    document.body.style.padding = "0";

    return () => {
      document.body.classList.remove("page-full-width");
      document.body.style.display = prevDisplay;
      document.body.style.flexDirection = prevFlexDir;
      document.body.style.width = prevWidth;
      document.body.style.minHeight = prevMinHeight;
    };
  }, []);

  // Resolve which account this page is about
  useEffect(() => {
    const qId = searchParams.get("userId") || searchParams.get("id");
    const qEmail = searchParams.get("email");
    const qName = searchParams.get("name");

    if (qId || qEmail || qName) {
      setTargetUser({
        id: qId || user?.id || "emp_hr",
        name: qName || user?.name || "Amandeep kumar",
        email: qEmail || user?.email || "",
        role: "Team Member",
        status: "Inactive"
      });
    } else if (user && user.id) {
      setTargetUser({ ...user, status: user.status || "Inactive" });
    } else {
      setTargetUser({
        id: "emp_hr",
        name: "Amandeep kumar",
        email: "amandeepkumar.flymediatech@gmail.com",
        status: "Inactive"
      });
    }
  }, [user, searchParams]);

  // Background check every 12 seconds
  useEffect(() => {
    const empId = targetUser?.id || user?.id;
    if (!empId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/employees/${empId}`);
        const json = await res.json();
        if (json.success && json.data) {
          const st = (json.data.status || "").toLowerCase().trim();
          if (st === "active") {
            if (login) login({ ...(user || {}), ...json.data, status: "Active" });
            const isDark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";
            Swal.fire({
              icon: "success",
              title: "Account reactivated",
              text: "Taking you to your dashboard.",
              timer: 1600,
              showConfirmButton: false,
              background: isDark ? "#161e26" : "#ffffff",
              color: isDark ? "#e8eef3" : "#14202b"
            }).then(() => routeForRole(json.data.role, router));
          }
        }
      } catch (err) {
        // Silent background check failure
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [targetUser?.id, user, login, router]);

  const handleCheckStatus = async () => {
    if (checking) return;
    setChecking(true);
    setScanStep(1);

    const empId = targetUser?.id || user?.id;
    const userEmail = targetUser?.email || user?.email;
    const isDark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";

    await new Promise((r) => setTimeout(r, 600));
    setScanStep(2);

    try {
      let isNowActive = false;
      let freshData = null;

      if (empId && empId !== "EMP-PENDING" && empId !== "EMP-IDENTITY") {
        const res = await fetch(`/api/employees/${empId}`);
        const json = await res.json();
        if (json.success && json.data) {
          freshData = json.data;
          if ((json.data.status || "").toLowerCase().trim() === "active") isNowActive = true;
        }
      }

      if (!isNowActive && userEmail) {
        const dbRes = await fetch("/api/db");
        const dbData = await dbRes.json();
        const found = (dbData.employees || []).find(
          (e) => (e.email || "").toLowerCase() === userEmail.toLowerCase()
        );
        if (found && (found.status || "").toLowerCase().trim() === "active") {
          isNowActive = true;
          freshData = found;
        }
      }

      await new Promise((r) => setTimeout(r, 500));
      setScanStep(3);

      if (isNowActive && freshData) {
        if (login) login({ ...(user || {}), ...freshData, status: "Active" });
        Swal.fire({
          icon: "success",
          title: "You're back in",
          text: `Welcome back, ${freshData.name}.`,
          timer: 1800,
          showConfirmButton: false,
          background: isDark ? "#161e26" : "#ffffff",
          color: isDark ? "#e8eef3" : "#14202b"
        }).then(() => routeForRole(freshData.role, router));
      } else {
        Swal.fire({
          icon: "info",
          title: "Still inactive",
          text: "Your account hasn't been reactivated yet. Email HR or your administrator to request it.",
          confirmButtonText: "Got it",
          confirmButtonColor: "#0f6b6b",
          background: isDark ? "#161e26" : "#ffffff",
          color: isDark ? "#e8eef3" : "#14202b"
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Couldn't check your status",
        text: "The server didn't respond. Check your connection and try again.",
        confirmButtonText: "Close",
        confirmButtonColor: "#0f6b6b",
        background: isDark ? "#161e26" : "#ffffff",
        color: isDark ? "#e8eef3" : "#14202b"
      });
    } finally {
      setTimeout(() => {
        setChecking(false);
        setScanStep(0);
      }, 400);
    }
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleSignOut = () => {
    if (logout) {
      logout();
    } else {
      localStorage.removeItem("devicedesk_auth_user");
      sessionStorage.clear();
      document.cookie = "devicedesk_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax";
      document.cookie = "devicedesk_auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax";
      router.push("/login");
    }
  };

  const name = targetUser?.name || "Amandeep kumar";
  const email = targetUser?.email || "";
  const empId = targetUser?.id || "";

  const hrSubject = `Reactivation request - ${name} (${empId || "ID"})`;
  const hrBody =
    `Hello HR team,\n\nMy account (${email}) is marked as inactive on the DeviceDesk portal. ` +
    `Please verify my details and reactivate my access.\n\nEmployee ID: ${empId || "N/A"}\nName: ${name}\n\nThank you.`;
  const hrHref = `mailto:${HR_EMAIL}?subject=${encodeURIComponent(hrSubject)}&body=${encodeURIComponent(hrBody)}`;
  const adminHref = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(`Inactive account - ${email || name}`)}`;

  const stepLabel =
    scanStep === 1 ? "Contacting server…" : scanStep === 2 ? "Looking up your record…" : "Almost done…";

  const rows = [
    { key: "name", label: "Name", value: name },
    { key: "email", label: "Email", value: email, copy: true },
    { key: "id", label: "Employee ID", value: empId, copy: true }
  ].filter((r) => r.value);

  return (
    <div
      className="page"
      style={{
        width: "100%",
        minWidth: "100vw",
        flex: "1 1 100%",
        boxSizing: "border-box"
      }}
    >
      <header className="bar">
        <div className="bar-brand">
          <Logo height="32px" />
        </div>
        <div className="bar-actions">
          <ThemeToggle />
        </div>
      </header>

      <main className="wrap">
        <section className="lead">
          <div className="paused-wrap">
            <span className="paused" aria-hidden="true">
              <FiPause />
            </span>
            <span className="paused-label">ACCOUNT DEACTIVATED</span>
          </div>

          <h1>Your account is inactive</h1>

          <div className="lead-notice">
            <span className="lead-icon" aria-hidden="true">⚠️ </span>
            <p>
              Your account is currently inactive. Please contact Administrator or HR to reactivate your account.
            </p>
          </div>
        </section>

        <div className="grid">
          {/* Panel 1: Account Information */}
          <section className="panel" aria-labelledby="acct-h">
            <div className="panel-header">
              <h2 id="acct-h">Account Details</h2>
              <span className="panel-badge">Profile </span>
            </div>

            <dl className="rows">
              {rows.map((r) => (
                <div className="row" key={r.key}>
                  <dt>{r.label}</dt>
                  <dd>
                    <span className="val">{r.value}</span>
                    {r.copy && (
                      <button
                        type="button"
                        className={`icon-btn ${copied === r.key ? "copied" : ""}`}
                        onClick={() => handleCopy(r.value, r.key)}
                        aria-label={`Copy ${r.label.toLowerCase()}`}
                        title={copied === r.key ? "Copied!" : `Copy ${r.label}`}
                      >
                        {copied === r.key ? <FiCheck className="check-icon" /> : <FiCopy />}
                      </button>
                    )}
                  </dd>
                </div>
              ))}
              <div className="row">
                <dt>Access Status</dt>
                <dd>
                  <span className="badge">
                    <span className="badge-dot"></span>
                    Inactive
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {/* Panel 2: Request Reactivation */}
          <section className="panel panel-actions" aria-labelledby="help-h">
            <div className="panel-header">
              <h2 id="help-h">Request Reactivation</h2>
              <span className="panel-badge">Support Desk</span>
            </div>

            <div className="contact-group">
              <div className="contact">
                <div className="c-icon-wrap hr-icon-wrap">
                  <FiMail className="c-icon" />
                </div>
                <div className="c-text">
                  <strong>HR Operations</strong>
                  <span>{HR_EMAIL}</span>
                </div>
                <button
                  type="button"
                  className={`icon-btn ${copied === "hr" ? "copied" : ""}`}
                  onClick={() => handleCopy(HR_EMAIL, "hr")}
                  aria-label="Copy HR email address"
                  title={copied === "hr" ? "Copied!" : "Copy HR email"}
                >
                  {copied === "hr" ? <FiCheck className="check-icon" /> : <FiCopy />}
                </button>
              </div>
              <a className="btn btn-primary" href={hrHref}>
                <FiMail />
                <span>Email HR</span>
              </a>
            </div>

            <div className="contact-divider" role="separator" />

            <div className="contact-group">
              <div className="contact">
                <div className="c-icon-wrap admin-icon-wrap">
                  <FiShield className="c-icon" />
                </div>
                <div className="c-text">
                  <strong>System Administrator</strong>
                  <span>For role, team, or policy review</span>
                </div>
              </div>
              <a className="btn btn-outline" href={adminHref}>
                <FiShield />
                <span>Email Administrator</span>
              </a>
            </div>
          </section>
        </div>

        {/* Status Check Section */}
        <section className="check-card" aria-labelledby="check-h">
          <div className="check-info">
            <div className="check-title-row">
              <h2 id="check-h">Already reactivated?</h2>
              <span className="auto-pill">
                <span className="pulse-dot"></span>
                <span>Auto-checking every 12s</span>
              </span>
            </div>
            <p>
              We verify your database status automatically in the background. Once an admin reactivates your account, you will be redirected immediately.
            </p>
          </div>

          <div className="check-actions">
            <button
              type="button"
              className="btn btn-solid"
              onClick={handleCheckStatus}
              disabled={checking}
            >
              <FiRefreshCw className={`btn-icon ${checking ? "spin" : ""}`} />
              <span aria-live="polite">{checking ? stepLabel : "Check status now"}</span>
            </button>
            <button
              type="button"
              className="btn btn-text"
              onClick={handleSignOut}
            >
              <FiLogOut className="btn-icon" />
              <span>Sign out</span>
            </button>
          </div>
        </section>
      </main>

      <style jsx>{`
        :global(body) {
          flex-direction: column !important;
          width: 100% !important;
          min-width: 100vw !important;
          overflow-x: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .page {
          --bg: #f8fafc;
          --surface: #ffffff;
          --ink: #0f172a;
          --muted: #64748b;
          --line: #e2e8f0;
          --accent: #0f766e;
          --accent-hover: #0d9488;
          --accent-ink: #ffffff;
          --warn-bg: #fef3c7;
          --warn-ink: #92400e;
          --warn-border: #fde68a;
          --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 10px 25px -5px rgba(0, 0, 0, 0.04);
          min-height: 100vh;
          width: 100% !important;
          min-width: 100vw !important;
          flex: 1 1 100% !important;
          box-sizing: border-box !important;
          background: var(--bg);
          color: var(--ink);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        :global([data-theme="dark"]) .page,
        :global(.dark) .page {
          --bg: #090d16;
          --surface: #111827;
          --ink: #f8fafc;
          --muted: #94a3b8;
          --line: #1e293b;
          --accent: #14b8a6;
          --accent-hover: #2dd4bf;
          --accent-ink: #042f2e;
          --warn-bg: #451a03;
          --warn-ink: #fcd34d;
          --warn-border: #78350f;
          --card-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        /* Full-width sticky top bar */
        .bar {
          width: 100% !important;
          box-sizing: border-box !important;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem clamp(1.25rem, 5vw, 3.5rem);
          border-bottom: 1px solid var(--line);
          background: var(--surface);
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(12px);
        }

        .bar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .bar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Centered main container with comfortable max-width */
        .wrap {
          width: 100% !important;
          max-width: 1040px !important;
          margin: 0 auto !important;
          padding: clamp(2rem, 5vw, 3.5rem) clamp(1rem, 4vw, 2.5rem) 3.5rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          box-sizing: border-box !important;
        }

        .lead {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          box-sizing: border-box;
        }

        .paused-wrap {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .paused {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: var(--warn-bg);
          border: 1px solid var(--warn-border);
          color: var(--warn-ink);
          display: grid;
          place-items: center;
          font-size: 1.15rem;
          flex-shrink: 0;
        }

        .paused-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--warn-ink);
          background: var(--warn-bg);
          border: 1px solid var(--warn-border);
          padding: 3px 10px;
          border-radius: 20px;
        }

        h1 {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
          font-size: clamp(2rem, 4.5vw, 2.75rem);
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 0;
          color: var(--ink);
        }

        .lead-notice {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: var(--warn-bg);
          border: 1px solid var(--warn-border);
          border-radius: 14px;
          padding: 1rem 1.25rem;
          width: 100%;
          box-sizing: border-box;
        }

        .lead-icon {
          font-size: 1.35rem;
          line-height: 1;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .lead-notice p {
          margin: 0;
          font-size: 0.98rem;
          line-height: 1.55;
          font-weight: 600;
          color: var(--warn-ink);
        }

        /* Fully responsive 2-column grid */
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          align-items: stretch;
          width: 100%;
          box-sizing: border-box;
        }

        .panel {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: clamp(1.25rem, 3vw, 1.75rem);
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
          box-shadow: var(--card-shadow);
          box-sizing: border-box;
          width: 100%;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .panel:hover {
          border-color: rgba(15, 118, 110, 0.4);
        }

        .panel-actions {
          justify-content: space-between;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 0.85rem;
          border-bottom: 1px solid var(--line);
        }

        h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--ink);
          letter-spacing: -0.01em;
        }

        .panel-badge {
          font-size: 0.72rem;
          color: var(--muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: var(--bg);
          border: 1px solid var(--line);
          padding: 2px 8px;
          border-radius: 6px;
        }

        .rows {
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 0.75rem 0;
          border-top: 1px solid var(--line);
        }

        .row:first-child {
          border-top: 0;
          padding-top: 0;
        }

        dt {
          font-size: 0.76rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--muted);
        }

        dd {
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 0.98rem;
          color: var(--ink);
        }

        .val {
          min-width: 0;
          font-weight: 600;
          overflow-wrap: anywhere;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--warn-bg);
          color: var(--warn-ink);
          border: 1px solid var(--warn-border);
          font-size: 0.76rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 3px 10px;
          border-radius: 999px;
        }

        .badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--warn-ink);
        }

        /* Contact Groups */
        .contact-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .contact-divider {
          height: 1px;
          background: var(--line);
          margin: 0.25rem 0;
        }

        .contact {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .c-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .hr-icon-wrap {
          background: rgba(15, 118, 110, 0.1);
          color: var(--accent);
        }

        .admin-icon-wrap {
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
        }

        :global(.c-icon) {
          font-size: 1.15rem;
        }

        .c-text {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .c-text strong {
          font-size: 0.92rem;
          color: var(--ink);
        }

        .c-text span {
          color: var(--muted);
          font-size: 0.82rem;
          overflow-wrap: anywhere;
        }

        .icon-btn {
          border: 1px solid var(--line);
          background: var(--bg);
          color: var(--muted);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .icon-btn:hover {
          background: var(--surface);
          color: var(--ink);
          border-color: var(--accent);
        }

        .icon-btn.copied {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }

        :global(.check-icon) {
          color: #10b981;
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          font-size: 0.92rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }

        .btn-primary,
        .btn-solid {
          background: var(--accent);
          color: var(--accent-ink);
        }

        .btn-primary:hover,
        .btn-solid:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .btn-outline {
          border-color: var(--line);
          color: var(--ink);
          background: var(--surface);
        }

        .btn-outline:hover {
          background: var(--bg);
          border-color: var(--accent);
        }

        .btn-text {
          background: transparent;
          color: var(--muted);
          border: 1px solid transparent;
        }

        .btn-text:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.08);
        }

        .btn:disabled {
          opacity: 0.75;
          cursor: wait;
        }

        .btn:focus-visible,
        .icon-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        :global(.btn-icon) {
          font-size: 1rem;
        }

        /* Bottom Check Card */
        .check-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: clamp(1.25rem, 3vw, 1.75rem);
          box-shadow: var(--card-shadow);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
          width: 100%;
          box-sizing: border-box;
        }

        .check-info {
          flex: 1;
          min-width: 260px;
        }

        .check-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .auto-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 3px 10px;
          border-radius: 14px;
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
          animation: pulseDot 2s infinite ease-in-out;
        }

        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        .check-card p {
          margin: 0.4rem 0 0;
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--muted);
          max-width: 52ch;
        }

        .check-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        :global(.spin) {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Mobile and tablet responsiveness */
        @media (max-width: 768px) {
          .bar {
            padding: 0.85rem 1rem;
          }
          .wrap {
            padding: 1.5rem 1rem 2.5rem;
            gap: 1.5rem;
          }
          .grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
          .check-card {
            flex-direction: column;
            align-items: stretch;
            gap: 1.25rem;
          }
          .check-actions {
            flex-direction: column;
            width: 100%;
          }
          .check-actions .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default function InactiveAccountPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", width: "100vw", display: "grid", placeItems: "center", color: "#64748b" }}>
          Loading account details…
        </div>
      }
    >
      <InactiveAccountContent />
    </Suspense>
  );
}
