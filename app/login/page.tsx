"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  async function signInWithGoogle() {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setError(error.message);
  }

  const card: React.CSSProperties = {
    width: "100%",
    padding: "11px 13px",
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--surface)",
    color: "var(--fg)",
    fontSize: 14,
  };

  return (
    <main style={{ maxWidth: 400, margin: "0 auto", padding: "clamp(30px,8vw,70px) clamp(15px,4vw,28px) 90px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".13em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>
        Log in
      </div>
      <h1 style={{ fontFamily: "Newsreader,'Hind',Georgia,serif", fontWeight: 500, fontSize: "clamp(26px,5vw,34px)", lineHeight: 1.1, margin: "0 0 10px" }}>
        One person, one ballot
      </h1>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--muted)", margin: "0 0 26px" }}>
        An account ties votes to a person (reputation-weighted) without storing your phone number. Reading the leaderboard needs no login.
      </p>

      <button
        onClick={signInWithGoogle}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 14, fontWeight: 600 }}
      >
        Continue with Google
      </button>

      <div style={{ textAlign: "center", fontSize: 12, color: "var(--faint)", margin: "16px 0" }}>or</div>

      {sent ? (
        <p style={{ padding: 14, borderRadius: 11, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 14 }}>
          Check your email for a magic link.
        </p>
      ) : (
        <form onSubmit={sendMagicLink} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={card}
          />
          <button type="submit" style={{ width: "100%", padding: "12px 14px", borderRadius: 11, background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600 }}>
            Send magic link
          </button>
        </form>
      )}

      {error && <p style={{ marginTop: 14, fontSize: 14, color: "#c0392b" }}>{error}</p>}
    </main>
  );
}
