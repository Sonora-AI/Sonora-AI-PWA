"use client";

import { AuthHeader, useSession } from "@/components/ui/AuthHeader";
import type { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  crumb: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export function ComingSoon({ crumb, title, description, icon: Icon }: ComingSoonProps) {
  const session = useSession();

  return (
    <div>
      <header className="flex items-center justify-between border-b border-line py-5 pl-16 pr-6 md:px-10">
        <span className="text-lg font-semibold tracking-tight">{title}</span>
        <AuthHeader session={session} />
      </header>

      <div className="py-8 pl-16 pr-6 md:px-10">
        <p className="font-mono text-xs uppercase tracking-wider text-ink/40">workspace / {crumb}</p>
        <h1 className="mt-1 text-4xl font-light tracking-tight text-ink">{title}</h1>

        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-white p-16 text-center shadow-panel">
          <Icon size={26} strokeWidth={1.5} className="text-ink/25" />
          <p className="text-sm text-ink/50">{description}</p>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink/30">Coming soon</span>
        </div>
      </div>
    </div>
  );
}
