"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/lib/ui/theme";
import { useAuth } from "@/lib/ui/useAuth";

const TABS: { href: string; label: string; match: (p: string) => boolean }[] = [
  { href: "/arena", label: "Arena", match: (p) => p === "/" || p.startsWith("/arena") },
  { href: "/leaderboard", label: "Leaderboard", match: (p) => p.startsWith("/leaderboard") || p.startsWith("/channel") },
  { href: "/compare", label: "Compare", match: (p) => p.startsWith("/compare") },
  { href: "/share", label: "Share", match: (p) => p.startsWith("/share") },
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
        padding: "13px clamp(15px,4vw,40px)",
        background: "color-mix(in srgb, var(--bg) 86%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <Link
        href="/arena"
        style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}
      >
        <div
          style={{
            width: 23,
            height: 23,
            borderRadius: 6,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{ width: 9, height: 9, borderRadius: "50%", border: "2px solid #fff" }}
          />
        </div>
        <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-.025em" }}>
          PressRank
        </span>
      </Link>

      <nav style={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} style={{ textDecoration: "none" }}>
            <span style={tabStyle(t.match(pathname))}>{t.label}</span>
          </Link>
        ))}
      </nav>

      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
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
          }}
        >
          {dark ? "Light" : "Dark"}
        </button>
        <button
          onClick={() => router.push(user ? "/arena" : "/login")}
          style={{
            padding: "8px 14px",
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 600,
            ...(user
              ? { background: "var(--accent-soft)", color: "var(--accent)" }
              : { background: "var(--accent)", color: "#fff" }),
          }}
        >
          {user ? "Voting ✓" : "Log in"}
        </button>
      </div>
    </header>
  );
}
