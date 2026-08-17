import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Large payloads (audio upload/download) bypass this proxy entirely and
// talk to the backend directly from the browser via a scoped ticket --
// see lib/api.ts -- since Vercel's 4.5MB body cap applies platform-wide
// regardless of runtime. Everything left here is small JSON, so the
// default Node.js runtime (which lib/session.ts's crypto usage requires
// anyway) is fine.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

// Local-dev-only escape hatch -- see the backend's app/core/auth.py for the
// matching bypass. Only ever set DISABLE_AUTH in a local .env.local that
// never leaves this machine; it must never be set on Vercel.
const DISABLE_AUTH = process.env.DISABLE_AUTH === "true";

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const session = DISABLE_AUTH ? null : await getSession();
  if (!DISABLE_AUTH && !session) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const targetUrl = `${BACKEND_URL}/api/v1/${path.join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("authorization", `Bearer ${session?.access_token ?? "local-dev"}`);

  const backendRes = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
  });

  const responseHeaders = new Headers();
  const resContentType = backendRes.headers.get("content-type");
  if (resContentType) responseHeaders.set("content-type", resContentType);
  const contentDisposition = backendRes.headers.get("content-disposition");
  if (contentDisposition) responseHeaders.set("content-disposition", contentDisposition);

  return new NextResponse(backendRes.body, { status: backendRes.status, headers: responseHeaders });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path);
}
