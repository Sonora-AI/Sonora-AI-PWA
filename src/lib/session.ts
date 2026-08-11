import { cookies } from "next/headers";

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

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const session = JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as Session;
    if (session.expires_at < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
