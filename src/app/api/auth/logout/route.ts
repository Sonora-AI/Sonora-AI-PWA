import { NextResponse } from "next/server";
import { buildLogoutUrl, APP_BASE_URL } from "@/lib/oidc";
import { clearSession, getRawSession } from "@/lib/session";

export async function GET() {
  // Use the raw session (ignores access-token expiry) -- we still need the
  // id_token to end the Asgardeo SSO session even if our own access token
  // had already expired. Using the expiry-checked getSession() here was the
  // bug: an expired token made logout skip Asgardeo entirely, leaving its
  // SSO session alive so the next "sign in" silently succeeded without a
  // real login prompt.
  const session = await getRawSession();
  await clearSession();

  if (!session?.id_token) {
    console.log("[auth/logout] no local session found -- clearing cookie and redirecting home without Asgardeo");
    return NextResponse.redirect(APP_BASE_URL);
  }

  const logoutUrl = await buildLogoutUrl(session.id_token);
  console.log(`[auth/logout] ending Asgardeo SSO session for sub=${session.sub}`);
  return NextResponse.redirect(logoutUrl);
}
