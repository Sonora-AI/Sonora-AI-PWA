import { randomBytes, createHash } from "crypto";

const ASGARDEO_BASE_URL = process.env.NEXT_PUBLIC_ASGARDEO_BASE_URL!;
const CLIENT_ID = process.env.NEXT_PUBLIC_ASGARDEO_CLIENT_ID!;
const CLIENT_SECRET = process.env.ASGARDEO_CLIENT_SECRET!;
const SCOPES = process.env.NEXT_PUBLIC_ASGARDEO_SCOPES ?? "openid profile";
export const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3001";
export const REDIRECT_URI = `${APP_BASE_URL}/api/auth/callback`;

interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
}

let discoveryCache: OidcDiscovery | null = null;

export async function getDiscovery(): Promise<OidcDiscovery> {
  if (discoveryCache) return discoveryCache;
  const res = await fetch(`${ASGARDEO_BASE_URL}/oauth2/token/.well-known/openid-configuration`);
  if (!res.ok) throw new Error(`Asgardeo discovery fetch failed: ${res.status}`);
  discoveryCache = (await res.json()) as OidcDiscovery;
  return discoveryCache;
}

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generatePkce() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  return base64url(randomBytes(16));
}

export async function buildAuthorizeUrl(state: string, codeChallenge: string): Promise<string> {
  const { authorization_endpoint } = await getDiscovery();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${authorization_endpoint}?${params.toString()}`;
}

export interface TokenSet {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenSet> {
  const { token_endpoint } = await getDiscovery();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code_verifier: codeVerifier,
  });
  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as TokenSet;
}

export function decodeIdTokenClaims(idToken: string): Record<string, unknown> {
  const payload = idToken.split(".")[1];
  const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  return JSON.parse(json);
}

export async function buildLogoutUrl(idToken: string): Promise<string> {
  const { end_session_endpoint } = await getDiscovery();
  const params = new URLSearchParams({
    id_token_hint: idToken,
    post_logout_redirect_uri: APP_BASE_URL,
  });
  return `${end_session_endpoint}?${params.toString()}`;
}
