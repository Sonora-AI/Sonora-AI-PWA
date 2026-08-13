import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildAuthorizeUrl, generatePkce, generateState, REDIRECT_URI } from "@/lib/oidc";

export async function GET() {
  const { verifier, challenge } = generatePkce();
  const state = generateState();

  const jar = await cookies();
  jar.set("pkce_verifier", verifier, { httpOnly: true, sameSite: "lax", path: "/api/auth", maxAge: 300 });
  jar.set("oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/api/auth", maxAge: 300 });

  const authorizeUrl = await buildAuthorizeUrl(state, challenge);
  console.log(`[auth/login] redirecting to Asgardeo: redirect_uri=${REDIRECT_URI} state=${state}`);
  return NextResponse.redirect(authorizeUrl);
}
