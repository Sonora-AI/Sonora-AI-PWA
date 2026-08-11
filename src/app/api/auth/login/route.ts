import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildAuthorizeUrl, generatePkce, generateState } from "@/lib/oidc";

export async function GET() {
  const { verifier, challenge } = generatePkce();
  const state = generateState();

  const jar = await cookies();
  jar.set("pkce_verifier", verifier, { httpOnly: true, sameSite: "lax", path: "/api/auth", maxAge: 300 });
  jar.set("oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/api/auth", maxAge: 300 });

  const authorizeUrl = await buildAuthorizeUrl(state, challenge);
  return NextResponse.redirect(authorizeUrl);
}
