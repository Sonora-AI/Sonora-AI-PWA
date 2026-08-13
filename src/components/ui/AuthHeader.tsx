"use client";

import { useEffect, useState } from "react";

interface SessionInfo {
  authenticated: boolean;
  name?: string;
  email?: string;
}

export function AuthHeader({ session }: { session: SessionInfo | null }) {
  if (!session) {
    return <div className="h-9 w-24 animate-pulse rounded-full bg-mist" />;
  }

  if (session.authenticated) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-ink/50">{session.name}</span>
        <a
          href="/api/auth/logout"
          className="rounded-full border border-line bg-white px-4 py-2 text-xs font-medium text-ink/70 shadow-panel transition hover:border-red-300 hover:text-red-500"
        >
          Sign out
        </a>
      </div>
    );
  }

  return (
    <a
      href="/api/auth/login"
      className="rounded-full bg-gradient-mustard px-4 py-2 text-xs font-semibold text-white shadow-mustard transition hover:brightness-110"
    >
      Sign in
    </a>
  );
}

const SESSION_RECHECK_MS = 60 * 1000;

export function useSession(): SessionInfo | null {
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    const check = () => {
      fetch("/api/auth/session")
        .then((res) => res.json())
        .then(setSession)
        .catch(() => setSession({ authenticated: false }));
    };
    check();
    // /api/auth/session calls getSession(), which silently refreshes an
    // expired access token when possible -- polling here both keeps the UI
    // honest about sign-in state and keeps the session alive in the
    // background instead of letting it go stale mid-visit.
    const interval = setInterval(check, SESSION_RECHECK_MS);
    return () => clearInterval(interval);
  }, []);

  return session;
}
