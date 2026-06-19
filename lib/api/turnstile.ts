// Cloudflare Turnstile server-side verification. Set DISABLE_TURNSTILE=true
// in local dev to bypass. Free anti-abuse layer for vote submission.
export async function verifyTurnstile(
  token: string | undefined,
  ip?: string
): Promise<boolean> {
  if (process.env.DISABLE_TURNSTILE === "true") return true;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body }
  );
  if (!res.ok) return false;
  const data = await res.json();
  return data?.success === true;
}
