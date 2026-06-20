"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Palette ported verbatim from the approved design (x-dc `pal()`).
export interface Palette {
  bg: string;
  surface: string;
  fg: string;
  muted: string;
  faint: string;
  line: string;
  grid: string;
  accent: string;
  accentSoft: string;
  accent2: string;
}

const LIGHT: Palette = {
  bg: "#fbfbf9",
  surface: "#ffffff",
  fg: "#16181d",
  muted: "#6b6f76",
  faint: "#a2a6ad",
  line: "#e7e5df",
  grid: "#f1f0eb",
  accent: "#3a3f8f",
  accentSoft: "#eceaf6",
  accent2: "#0f7d77",
};

const DARK: Palette = {
  bg: "#000000",
  surface: "#0d0e11",
  fg: "#ecedf0",
  muted: "#9aa0a8",
  faint: "#666c75",
  line: "#1c1e22",
  grid: "#0b0c0e",
  accent: "#9296ee",
  accentSoft: "#0e0f1a",
  accent2: "#3fb6ab",
};

export function paletteVars(p: Palette): React.CSSProperties {
  return {
    // CSS custom properties consumed by the ported inline styles.
    ["--bg" as any]: p.bg,
    ["--surface" as any]: p.surface,
    ["--fg" as any]: p.fg,
    ["--muted" as any]: p.muted,
    ["--faint" as any]: p.faint,
    ["--line" as any]: p.line,
    ["--grid" as any]: p.grid,
    ["--accent" as any]: p.accent,
    ["--accent-soft" as any]: p.accentSoft,
    ["--accent2" as any]: p.accent2,
  };
}

interface ThemeCtx {
  dark: boolean;
  toggle: () => void;
  pal: Palette;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  // Restore preference on mount (client only).
  useEffect(() => {
    const saved = localStorage.getItem("pr-theme");
    if (saved) {
      setDark(saved === "dark");
    } else {
      setDark(false); // Default to light mode
    }
  }, []);

  const toggle = useCallback(() => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem("pr-theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  const pal = dark ? DARK : LIGHT;
  const value = useMemo(() => ({ dark, toggle, pal }), [dark, toggle, pal]);

  return (
    <Ctx.Provider value={value}>
      <div
        style={{
          ...paletteVars(pal),
          minHeight: "100vh",
          background: "var(--bg)",
          color: "var(--fg)",
          fontFamily: "Inter, 'Hind', system-ui, sans-serif",
        }}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}
