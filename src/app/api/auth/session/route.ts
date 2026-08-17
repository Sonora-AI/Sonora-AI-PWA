import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Local-dev-only escape hatch -- see BACKEND's app/core/auth.py for the
// matching bypass. Only ever set DISABLE_AUTH in a local .env.local that
// never leaves this machine; it must never be set on Vercel.
const DISABLE_AUTH = process.env.DISABLE_AUTH === "true";

export async function GET() {
  if (DISABLE_AUTH) {
    return NextResponse.json({ authenticated: true, name: "Local Dev", email: "dev@localhost" });
  }
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({ authenticated: true, name: session.name, email: session.email });
}
