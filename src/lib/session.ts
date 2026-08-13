import { cookies } from "next/headers";
import { refreshAccessToken } from "@/lib/oidc";

const COOKIE_NAME = "sonora_session";

export interface Session {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_at: number;
  sub: string;
  name: string;
  email: string;
}

export async function setSession(session: Session): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, Buffer.from(JSON.stringify(session)).toString("base64"), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

// Reads the session cookie as-is, without checking whether the access
// token has expired. Only for the logout flow: we still need the id_token
// to properly end the Asgardeo SSO session even if our access token is stale.
export async function getRawSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as Session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const session = await getRawSession();
  if (!session) return null;
  if (session.expires_at >= Date.now()) return session;

  // Access token expired -- try a silent refresh instead of forcing the
  // user to log in again every ~hour. If there's no refresh token, or the
  // refresh itself fails (e.g. it was revoked), fall through to logged-out.
  if (!session.refresh_token) {
    console.warn(`[session] access token expired for sub=${session.sub} and no refresh_token was issued -- ` +
      "check that Asgardeo's app has the Refresh Token grant type enabled");
    await clearSession();
    return null;
  }
  try {
    const tokens = await refreshAccessToken(session.refresh_token);
    const refreshed: Session = {
      ...session,
      access_token: tokens.access_token,
      id_token: tokens.id_token ?? session.id_token,
      refresh_token: tokens.refresh_token ?? session.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
    };
    await setSession(refreshed);
    console.log(`[session] silently refreshed access token for sub=${session.sub}`);
    return refreshed;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[session] silent refresh failed for sub=${session.sub}: ${message}`);
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
