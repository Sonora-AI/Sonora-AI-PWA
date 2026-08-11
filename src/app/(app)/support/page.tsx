"use client";

import { Github, Mail } from "lucide-react";
import { AuthHeader, useSession } from "@/components/ui/AuthHeader";

export default function SupportPage() {
  const session = useSession();

  return (
    <div>
      <header className="flex items-center justify-between border-b border-line py-5 pl-16 pr-6 md:px-10">
        <span className="text-lg font-semibold tracking-tight">Support</span>
        <AuthHeader session={session} />
      </header>

      <div className="py-8 pl-16 pr-6 md:px-10">
        <p className="font-mono text-xs uppercase tracking-wider text-ink/40">workspace / support</p>
        <h1 className="mt-1 text-4xl font-light tracking-tight text-ink">Support</h1>

        <div className="mt-8 flex flex-col gap-3 sm:max-w-md">
          <a
            href="https://github.com/Sonora-AI/Sonora-AI-backend/issues"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-line bg-white p-5 shadow-panel transition hover:border-mustard"
          >
            <Github size={18} className="text-ink/50" />
            <div>
              <p className="text-sm font-medium text-ink">Report an issue</p>
              <p className="mt-0.5 text-xs text-ink/45">GitHub issues on Sonora-AI-backend</p>
            </div>
          </a>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-5 shadow-panel">
            <Mail size={18} className="text-ink/50" />
            <div>
              <p className="text-sm font-medium text-ink">Contact</p>
              <p className="mt-0.5 text-xs text-ink/45">ishakyaranhiru@gmail.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
