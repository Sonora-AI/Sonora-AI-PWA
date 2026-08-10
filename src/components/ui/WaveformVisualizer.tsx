"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause } from "lucide-react";

interface WaveformVisualizerProps {
  url: string | null;
  label: string;
}

export function WaveformVisualizer({ url, label }: WaveformVisualizerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !url) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "rgba(226, 232, 240, 0.35)",
      progressColor: "#E5C158",
      cursorColor: "#E5C158",
      height: 64,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      url,
    });
    wavesurferRef.current = wavesurfer;

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("finish", () => setIsPlaying(false));

    return () => {
      wavesurfer.destroy();
      wavesurferRef.current = null;
    };
  }, [url]);

  const togglePlay = () => {
    wavesurferRef.current?.playPause();
  };

  return (
    <div className="rounded-xl border border-titanium/10 bg-graphite/60 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-titanium/80">{label}</span>
        {url && (
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-obsidian transition hover:brightness-110"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
        )}
      </div>
      <div ref={containerRef} className="mt-4 min-h-[64px]" />
      {!url && <p className="mt-4 text-xs text-titanium/40">No audio yet</p>}
    </div>
  );
}
