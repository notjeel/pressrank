"use client";

import { useEffect, useState } from "react";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("pr-cookie-consent");
    if (!consent) {
      // Delay showing slightly for premium entrance transition
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("pr-cookie-consent", "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        left: 24,
        maxWidth: 360,
        background: "var(--surface)",
        border: "1.5px solid var(--line)",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        zIndex: 1000,
        marginLeft: "auto", // Align right on wide viewports
        animation: "prRise 0.3s ease both",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--accent-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5Z" />
            <path d="M8.5 8.5v.01" />
            <path d="M16 15.5v.01" />
            <path d="M12 12v.01" />
            <path d="M11 17v.01" />
            <path d="M7 14v.01" />
          </svg>
        </div>
        <div>
          <h4 style={{ margin: "0 0 4px", fontSize: 14.5, fontWeight: 600, color: "var(--fg)" }}>
            Cookie Verification
          </h4>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>
            We use essential cookies to persist your secure authentication state and store your light/dark theme preference.
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          onClick={accept}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            background: "var(--accent)",
            color: "#fff",
            fontSize: 12.5,
            fontWeight: 600,
            transition: "opacity 0.15s",
          }}
        >
          Enable cookies
        </button>
      </div>
    </div>
  );
}
