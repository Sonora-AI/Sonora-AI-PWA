import { NextResponse } from "next/server";
import { buildLogoutUrl, APP_BASE_URL } from "@/lib/oidc";
import { clearSession, getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  await clearSession();

  if (!session) {
    return NextResponse.redirect(APP_BASE_URL);
  }

  const logoutUrl = await buildLogoutUrl(session.id_token);
  return NextResponse.redirect(logoutUrl);
}
