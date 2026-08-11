import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const targetUrl = `${BACKEND_URL}/api/v1/${path.join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("authorization", `Bearer ${session.access_token}`);

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
