"use client";

import { ArrowUpRight } from "lucide-react";
import { AuthHeader, useSession } from "@/components/ui/AuthHeader";

const REPOS = [
  { name: "Sonora-AI-backend", desc: "FastAPI DSP engine, Gemini automation, pitch tracking" },
  { name: "Sonora-AI-PWA", desc: "This web app" },
  { name: "Sonora-AI-mobile-app", desc: "Expo scaffold" },
  { name: "Sonora-AI-desktop-app", desc: "Tauri scaffold" },
];

export default function DocsPage() {
  const session = useSession();

  return (
    <div>
      <header className="flex items-center justify-between border-b border-line py-5 pl-16 pr-6 md:px-10">
        <span className="text-lg font-semibold tracking-tight">Docs</span>
        <AuthHeader session={session} />
      </header>

      <div className="py-8 pl-16 pr-6 md:px-10">
        <p className="font-mono text-xs uppercase tracking-wider text-ink/40">workspace / docs</p>
        <h1 className="mt-1 text-4xl font-light tracking-tight text-ink">Documentation</h1>
        <p className="mt-3 max-w-xl text-sm text-ink/50">
          No hosted docs site yet — for now, the source repos are the reference.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {REPOS.map((repo) => (
            <a
              key={repo.name}
              href={`https://github.com/Sonora-AI/${repo.name}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-line bg-white p-5 shadow-panel transition hover:border-mustard"
            >
              <div>
                <p className="text-sm font-medium text-ink">{repo.name}</p>
                <p className="mt-1 text-xs text-ink/45">{repo.desc}</p>
              </div>
              <ArrowUpRight size={16} className="shrink-0 text-ink/30" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
