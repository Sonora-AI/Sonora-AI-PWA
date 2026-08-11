import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { decodeIdTokenClaims, exchangeCodeForTokens, APP_BASE_URL } from "@/lib/oidc";
import { setSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${APP_BASE_URL}/?auth_error=${encodeURIComponent(error)}`);
  }

  const jar = await cookies();
  const expectedState = jar.get("oauth_state")?.value;
  const verifier = jar.get("pkce_verifier")?.value;
  jar.delete("oauth_state");
  jar.delete("pkce_verifier");

  if (!code || !state || !verifier || state !== expectedState) {
    return NextResponse.redirect(`${APP_BASE_URL}/?auth_error=invalid_state`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, verifier);
    const claims = decodeIdTokenClaims(tokens.id_token);

    await setSession({
      access_token: tokens.access_token,
      id_token: tokens.id_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      sub: String(claims.sub ?? ""),
      name: String(claims.name ?? claims.given_name ?? claims.email ?? "Signed in"),
      email: String(claims.email ?? ""),
    });
  } catch {
    return NextResponse.redirect(`${APP_BASE_URL}/?auth_error=token_exchange_failed`);
  }

  return NextResponse.redirect(`${APP_BASE_URL}/console`);
}
