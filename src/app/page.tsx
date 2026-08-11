"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Music2, Users, Waves, Sparkles, Youtube, UploadCloud, ArrowRight } from "lucide-react";
import { useSession } from "@/components/ui/AuthHeader";
import { Logo } from "@/components/ui/Logo";

const MODES = [
  {
    icon: Music2,
    title: "12-TET",
    description: "Snap pitch to the standard 12-tone equal-tempered grid — pop, rock, anything mainstream.",
  },
  {
    icon: Users,
    title: "Contour",
    description: "Follow a reference vocal's melodic contour instead of a fixed scale — works for any tuning system.",
  },
  {
    icon: Waves,
    title: "Raga",
    description: "Detects the backing track's scale automatically and preserves glides between notes.",
  },
];

const PIPELINE = [
  { title: "Ingest", detail: "Record, upload, or pull straight from a YouTube link." },
  { title: "Analyze", detail: "Gemini reads structure, dynamics, and emotional delivery." },
  { title: "Render", detail: "Per-segment retune speed, reverb, compression & EQ." },
  { title: "Master", detail: "A finished, playable take — ready to export." },
];

export default function LandingPage() {
  const session = useSession();
  const isAuthenticated = session?.authenticated === true;

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between px-8 py-6 sm:px-14">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="text-sm font-semibold uppercase tracking-wider text-ink">Sonora AI</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/console" className="text-sm text-ink/60 transition hover:text-ink">
            Console
          </Link>
          {isAuthenticated ? (
            <Link
              href="/console"
              className="rounded-full bg-gradient-mustard px-4 py-2 text-xs font-semibold text-white shadow-mustard transition hover:brightness-110"
            >
              Go to Console
            </Link>
          ) : (
            <a
              href="/api/auth/login"
              className="rounded-full bg-gradient-mustard px-4 py-2 text-xs font-semibold text-white shadow-mustard transition hover:brightness-110"
            >
              Sign in
            </a>
          )}
        </nav>
      </header>

      <section className="px-8 pb-20 pt-16 sm:px-14 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ink/50 shadow-panel"
          >
            <Sparkles size={11} /> Gemini-driven vocal production
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-6 text-5xl font-light leading-tight tracking-tight text-ink sm:text-6xl"
          >
            Record, tune, and master
            <br />
            your vocal in one pass.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-5 max-w-xl text-base text-ink/55"
          >
            Sonora AI listens to your take, understands its structure, and drives a full pitch-correction
            and mastering chain around it — Western equal temperament, contour-following, or microtonal
            raga tuning.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/console"
              className="flex items-center gap-2 rounded-lg bg-gradient-mustard px-6 py-3 text-sm font-semibold text-white shadow-mustard transition hover:brightness-110"
            >
              Enter the Console <ArrowRight size={15} />
            </Link>
            {!isAuthenticated && (
              <a
                href="/api/auth/login"
                className="rounded-lg border border-line bg-white px-6 py-3 text-sm font-medium text-ink/70 shadow-panel transition hover:border-mustard hover:text-mustard"
              >
                Sign in with Asgardeo
              </a>
            )}
          </motion.div>
        </div>
      </section>

      <section className="px-8 pb-20 sm:px-14">
        <div className="mx-auto max-w-5xl">
          <p className="text-center font-mono text-xs uppercase tracking-wider text-ink/40">Three tuning engines</p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {MODES.map((mode, i) => (
              <motion.div
                key={mode.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-xl border border-line bg-white p-6 shadow-panel"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mist">
                  <mode.icon size={18} strokeWidth={1.75} className="text-mustard" />
                </div>
                <p className="mt-4 text-sm font-semibold text-ink">{mode.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-ink/55">{mode.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-mist/60 px-8 py-20 sm:px-14">
        <div className="mx-auto max-w-5xl">
          <p className="text-center font-mono text-xs uppercase tracking-wider text-ink/40">How it works</p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-4">
            {PIPELINE.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <span className="font-mono text-xs text-mustard">0{i + 1}</span>
                <p className="mt-2 text-sm font-semibold text-ink">{step.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink/55">{step.detail}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-4 text-ink/40">
              <UploadCloud size={16} />
              <Youtube size={16} />
            </div>
            <p className="max-w-md text-xs text-ink/50">
              Every source — vocal take, reference, or backing track — can be recorded live, uploaded, or
              pulled straight from a YouTube link. Backing tracks with vocals in them get an automatic
              instrumental extraction pass.
            </p>
          </div>
        </div>
      </section>

      <footer className="flex items-center justify-between px-8 py-8 sm:px-14">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink/35">Sonora AI · v 1.0.0</span>
        <div className="flex gap-4 font-mono text-[10px] uppercase tracking-wider text-ink/40">
          <Link href="/docs" className="hover:text-ink">
            Docs
          </Link>
          <Link href="/support" className="hover:text-ink">
            Support
          </Link>
        </div>
      </footer>
    </div>
  );
}
