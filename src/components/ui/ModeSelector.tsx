"use client";

import { Music2, Users, Waves, type LucideIcon } from "lucide-react";
import type { ProcessingMode } from "@/lib/api";

interface ModeOption {
  mode: ProcessingMode;
  title: string;
  description: string;
  icon: LucideIcon;
}

const MODES: ModeOption[] = [
  {
    mode: "A",
    title: "Western 12-TET",
    description: "Snap pitch to the standard 12-tone equal-tempered grid.",
    icon: Music2,
  },
  {
    mode: "B",
    title: "Reference-Guided",
    description: "Follow the melodic contour of an uploaded reference vocal.",
    icon: Users,
  },
  {
    mode: "C",
    title: "Microtonal Raga",
    description: "Detect the backing track's scale and tune to it, glide-aware.",
    icon: Waves,
  },
];

interface ModeSelectorProps {
  value: ProcessingMode;
  onChange: (mode: ProcessingMode) => void;
  retuneSpeed: number;
  onRetuneSpeedChange: (speed: number) => void;
}

export function ModeSelector({ value, onChange, retuneSpeed, onRetuneSpeedChange }: ModeSelectorProps) {
  return (
    <div className="rounded-xl border border-titanium/10 bg-graphite/60 p-5">
      <span className="text-sm font-medium text-titanium/80">Processing mode</span>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MODES.map(({ mode, title, description, icon: Icon }) => {
          const active = value === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              className={`rounded-lg border p-4 text-left transition ${
                active
                  ? "border-gold/60 bg-gold/10"
                  : "border-titanium/10 bg-obsidian/40 hover:border-titanium/25"
              }`}
            >
              <Icon size={18} />
              <p className={`mt-2 text-sm font-medium ${active ? "text-gold" : "text-titanium"}`}>
                {title}
              </p>
              <p className="mt-1 text-xs text-titanium/50">{description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-titanium/60">
          <span>Retune speed</span>
          <span className="font-mono text-gold">{retuneSpeed.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={retuneSpeed}
          onChange={(e) => onRetuneSpeedChange(Number(e.target.value))}
          className="mt-2 w-full accent-gold"
        />
      </div>
    </div>
  );
}
