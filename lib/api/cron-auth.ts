import { NextRequest } from "next/server";

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. We also accept the
// same secret as a query param for manual curl testing.
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const q = new URL(req.url).searchParams.get("secret");
  return q === secret;
}
