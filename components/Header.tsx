"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/lib/ui/theme";
import { useAuth } from "@/lib/ui/useAuth";

const TABS: { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean }[] = [
  {
    href: "/arena",
    label: "Arena",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
        <path d="M21 3v5h-5" />
        <path d="M3 21v-5h5" />
        <path d="m21 3-9 9" />
        <path d="M10.5 10.5 3 21" />
        <path d="m15 9-6 6" />
      </svg>
    ),
    match: (p) => p.startsWith("/arena"),
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
        <path d="M12 2a6 6 0 0 0-6 6v3.5c0 1.66 1.34 3 3 3h6c1.66 0 3-1.34 3-3V8a6 6 0 0 0-6-6Z" />
      </svg>
    ),
    match: (p) => p.startsWith("/leaderboard") || p.startsWith("/channel"),
  },
  {
    href: "/compare",
    label: "Compare",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
        <path d="M16 16 20 20" />
        <path d="m20 16-4 4" />
        <path d="M12 3v18" />
        <path d="M3 12h18" />
        <path d="M3 3h6v6H3z" />
        <path d="M15 3h6v6h-6z" />
        <path d="M3 15h6v6H3z" />
      </svg>
    ),
    match: (p) => p.startsWith("/compare"),
  },
  {
    href: "/methodology",
    label: "Methodology",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10" />
        <path d="M6 10h10" />
      </svg>
    ),
    match: (p) => p.startsWith("/methodology") || p.startsWith("/how-we-anonymize"),
  },
];

export function Header() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const { user } = useAuth();

  function tabStyle(active: boolean): React.CSSProperties {
    return {
      padding: "8px 13px",
      borderRadius: 8,
      fontSize: 13.5,
      fontWeight: active ? 600 : 500,
      color: active ? "var(--fg)" : "var(--muted)",
      background: active ? "var(--accent-soft)" : "transparent",
      display: "inline-flex",
      alignItems: "center",
      transition: "background 0.15s, color 0.15s",
    };
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        padding: "11px clamp(15px,4vw,40px)",
        background: "color-mix(in srgb, var(--bg) 86%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <Link
        href="/"
        style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}
      >
        <img
          src="/logo.png"
          alt="PressRank Logo"
          style={{
            width: 25,
            height: 25,
            objectFit: "contain",
          }}
        />
        <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-.025em", color: "var(--fg)" }}>
          PressRank
        </span>
      </Link>

      <nav style={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} style={{ textDecoration: "none" }}>
            <span style={tabStyle(t.match(pathname))}>
              {t.icon}
              {t.label}
            </span>
          </Link>
        ))}
      </nav>

      <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={toggle}
          title="Toggle theme"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--muted)",
            padding: "7px 11px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--surface)",
          }}
        >
          {dark ? "Light" : "Dark"}
        </button>

        {/* Language Pill (Optics matching Reference) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "var(--muted)",
            fontSize: 12.5,
            fontWeight: 500,
            cursor: "pointer",
            padding: "7px 11px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--surface)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 2 }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
          <span>EN</span>
        </div>

        {/* Notification Bell with alert dot */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid var(--line)",
            background: "var(--surface)",
            cursor: "pointer",
            color: "var(--muted)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <div
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#2ecc71",
            }}
          />
        </div>

        {/* Google sign-in looking auth pill */}
        <button
          onClick={() => router.push(user ? "/arena" : "/login")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 13px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            color: "var(--fg)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            transition: "background 0.15s",
          }}
        >
          {!user && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
          )}
          <span>{user ? "Dashboard" : "Sign in"}</span>
        </button>
      </div>
    </header>
  );
}

