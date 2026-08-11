"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, UploadCloud, Youtube, RotateCcw, AudioLines } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export type AudioSourceValue =
  | { kind: "blob"; blob: Blob; url: string }
  | { kind: "youtube"; url: string }
  | { kind: "empty" };

type Tab = "record" | "upload" | "youtube";

interface AudioSourceProps {
  label: string;
  allowYoutube?: boolean;
  onChange: (value: AudioSourceValue) => void;
}

export function AudioSource({ label, allowYoutube = false, onChange }: AudioSourceProps) {
  const [tab, setTab] = useState<Tab>("record");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [uploadName, setUploadName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { state, blob, url, level, error, start, stop, reset } = useAudioRecorder();

  useEffect(() => {
    if (tab === "record") {
      onChange(blob && url ? { kind: "blob", blob, url } : { kind: "empty" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob, url, tab]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setUploadName(file.name);
    onChange({ kind: "blob", blob: file, url: URL.createObjectURL(file) });
  };

  const handleYoutubeChange = (value: string) => {
    setYoutubeInput(value);
    onChange(value.trim() ? { kind: "youtube", url: value.trim() } : { kind: "empty" });
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    if (next === "record") {
      onChange(blob && url ? { kind: "blob", blob, url } : { kind: "empty" });
    } else if (next === "upload") {
      onChange({ kind: "empty" });
      setUploadName(null);
    } else {
      onChange(youtubeInput.trim() ? { kind: "youtube", url: youtubeInput.trim() } : { kind: "empty" });
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Mic }[] = [
    { id: "record", label: "Record", icon: Mic },
    { id: "upload", label: "Upload", icon: UploadCloud },
    ...(allowYoutube ? [{ id: "youtube" as Tab, label: "YouTube", icon: Youtube }] : []),
  ];

  return (
    <div className="rounded-xl border border-line bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="font-mono text-xs uppercase tracking-wider text-ink/60">{label}</span>
        <div className="flex gap-1 rounded-lg bg-mist p-1">
          {tabs.map(({ id, label: tabLabel, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition ${
                tab === id ? "bg-white text-ink shadow-panel" : "text-ink/40 hover:text-ink/70"
              }`}
            >
              <Icon size={12} strokeWidth={1.75} />
              {tabLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {tab === "record" && (
          <div className="flex items-center gap-4">
            {state !== "recording" ? (
              <button
                type="button"
                onClick={() => start()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-mustard text-white shadow-mustard transition hover:brightness-110"
                aria-label="Start recording"
              >
                <Mic size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition hover:brightness-125"
                aria-label="Stop recording"
              >
                <Square size={18} />
              </button>
            )}

            <div className="relative h-8 flex-1 overflow-hidden rounded-full bg-mist">
              {state === "idle" && !url && (
                <div className="absolute inset-0 flex items-center gap-1.5 px-3 text-ink/30">
                  <AudioLines size={13} strokeWidth={1.75} />
                  <span className="font-mono text-[10px] uppercase tracking-wider">ready for input</span>
                </div>
              )}
              <div
                className="h-full bg-mustard transition-[width] duration-75"
                style={{ width: `${Math.min(level * 250, 100)}%` }}
              />
            </div>

            {url && state !== "recording" && (
              <button
                type="button"
                onClick={reset}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink/50 transition hover:text-mustard"
                aria-label="Re-record"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        )}

        {tab === "upload" && (
          <label
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-mustard/40 py-10 text-center transition hover:border-mustard/70"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <UploadCloud size={22} strokeWidth={1.5} className="text-ink/40" />
            <span className="text-sm text-ink/70">
              {uploadName ?? "Drop audio file"}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink/45">
              {uploadName ? "click to replace" : "or click to browse"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        )}

        {tab === "youtube" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-mist px-3 py-2.5">
              <Youtube size={16} className="shrink-0 text-ink/40" />
              <input
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeInput}
                onChange={(e) => handleYoutubeChange(e.target.value)}
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/30"
              />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink/45">
              downloaded & processed server-side when you submit
            </span>
          </div>
        )}

        {url && tab === "record" && <audio controls src={url} className="mt-4 w-full" />}
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
