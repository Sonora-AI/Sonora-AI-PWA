"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import {
  SlidersHorizontal,
  BarChart3,
  FolderOpen,
  LineChart,
  FileText,
  HelpCircle,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/console", label: "Console", icon: SlidersHorizontal },
  { href: "/mastering", label: "Mastering", icon: BarChart3 },
  { href: "/library", label: "Library", icon: FolderOpen },
  { href: "/analytics", label: "Analytics", icon: LineChart },
];

const FOOTER_ITEMS: NavItem[] = [
  { href: "/docs", label: "Docs", icon: FileText },
  { href: "/support", label: "Support", icon: HelpCircle },
];

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
        active ? "bg-white text-ink shadow-panel" : "text-ink/50 hover:bg-white/60 hover:text-ink"
      }`}
    >
      <Icon size={16} strokeWidth={1.75} />
      {item.label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-paper md:flex">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white shadow-panel md:hidden"
        aria-label="Open menu"
      >
        <Menu size={16} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/20 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 -translate-x-full flex-col justify-between border-r border-line bg-mist px-4 py-6 transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div>
          <div className="flex items-center justify-between px-2 pb-8">
            <Link href="/" className="flex items-center gap-3">
              <Logo size={36} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink">Sonora AI</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink/40">v 1.0.0</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink/40 hover:text-ink md:hidden"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={pathname === item.href}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </nav>
        </div>

        <nav className="flex flex-col gap-1">
          {FOOTER_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname === item.href}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
