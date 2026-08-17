"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, Download } from "lucide-react";

interface WaveformVisualizerProps {
  url: string | null;
  label: string;
  downloadFileName?: string;
}

export function WaveformVisualizer({ url, label, downloadFileName = "sonora-result.wav" }: WaveformVisualizerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !url) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "rgba(22, 22, 21, 0.2)",
      progressColor: "#C9992B",
      cursorColor: "#161615",
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
    <div className="rounded-xl border border-line bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-ink/50">{label}</span>
        {url && (
          <div className="flex items-center gap-2">
            <a
              href={url}
              download={downloadFileName}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink/60 transition hover:border-mustard hover:text-mustard"
              aria-label="Download"
            >
              <Download size={14} />
            </a>
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-mustard text-white shadow-mustard transition hover:brightness-110"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
          </div>
        )}
      </div>
      <div ref={containerRef} className="mt-4 min-h-[64px]" />
      {!url && <p className="mt-4 text-xs text-ink/40">No audio yet</p>}
    </div>
  );
}
