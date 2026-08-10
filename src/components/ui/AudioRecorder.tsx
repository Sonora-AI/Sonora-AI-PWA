"use client";

import { useEffect } from "react";
import { Mic, Square, RotateCcw } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

interface AudioRecorderProps {
  label: string;
  onBlobChange: (blob: Blob | null) => void;
}

export function AudioRecorder({ label, onBlobChange }: AudioRecorderProps) {
  const { state, blob, url, level, error, start, stop, reset } = useAudioRecorder();

  useEffect(() => {
    onBlobChange(blob);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  const handleStart = async () => {
    await start();
  };

  const handleStop = () => {
    stop();
  };

  const handleReset = () => {
    reset();
    onBlobChange(null);
  };

  return (
    <div className="rounded-xl border border-titanium/10 bg-graphite/60 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-titanium/80">{label}</span>
        {state === "recording" && (
          <span className="flex items-center gap-2 text-xs text-gold">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
            recording
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        {state !== "recording" && (
          <button
            type="button"
            onClick={handleStart}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-obsidian transition hover:brightness-110"
            aria-label="Start recording"
          >
            <Mic size={20} />
          </button>
        )}
        {state === "recording" && (
          <button
            type="button"
            onClick={handleStop}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-titanium text-obsidian transition hover:brightness-95"
            aria-label="Stop recording"
          >
            <Square size={18} />
          </button>
        )}

        <div className="h-8 flex-1 overflow-hidden rounded bg-obsidian/60">
          <div
            className="h-full bg-gold/70 transition-[width] duration-75"
            style={{ width: `${Math.min(level * 250, 100)}%` }}
          />
        </div>

        {url && state !== "recording" && (
          <button
            type="button"
            onClick={handleReset}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-titanium/20 text-titanium/70 transition hover:text-gold"
            aria-label="Re-record"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {url && <audio controls src={url} className="mt-4 w-full" />}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
