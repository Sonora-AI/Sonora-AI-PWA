import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { decodeIdTokenClaims, exchangeCodeForTokens, APP_BASE_URL } from "@/lib/oidc";
import { setSession } from "@/lib/session";

function errorRedirect(reason: string, description?: string): NextResponse {
  const params = new URLSearchParams({ auth_error: reason });
  if (description) params.set("auth_error_description", description);
  return NextResponse.redirect(`${APP_BASE_URL}/?${params.toString()}`);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error(`[auth/callback] Asgardeo returned an error: ${error} -- ${errorDescription}`);
    return errorRedirect(error, errorDescription ?? undefined);
  }

  const jar = await cookies();
  const expectedState = jar.get("oauth_state")?.value;
  const verifier = jar.get("pkce_verifier")?.value;
  jar.delete("oauth_state");
  jar.delete("pkce_verifier");

  if (!code || !state || !verifier || state !== expectedState) {
    console.error(
      `[auth/callback] invalid_state: code=${Boolean(code)} state=${Boolean(state)} ` +
        `verifier=${Boolean(verifier)} stateMatch=${state === expectedState}`,
    );
    return errorRedirect("invalid_state", "Login session expired or was reused. Please try signing in again.");
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
    console.log(`[auth/callback] signed in: sub=${claims.sub} hasRefreshToken=${Boolean(tokens.refresh_token)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[auth/callback] token exchange failed: ${message}`);
    return errorRedirect("token_exchange_failed", message);
  }

  return NextResponse.redirect(`${APP_BASE_URL}/console`);
}
