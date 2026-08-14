"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AudioSource, type AudioSourceValue } from "@/components/ui/AudioSource";
import { AuthHeader, useSession } from "@/components/ui/AuthHeader";
import { WaveformVisualizer } from "@/components/ui/WaveformVisualizer";
import { submitJob, pollUntilDone, fetchResultBlobUrl, type ProcessingMode, type StatusResponse } from "@/lib/api";

type FlowState = "idle" | "submitting" | "processing" | "done" | "error";

const MODE_TABS: { mode: ProcessingMode; label: string; description: string }[] = [
  { mode: "A", label: "12-TET", description: "Snap to the standard equal-tempered grid." },
  { mode: "B", label: "CONTOUR", description: "Follow a reference vocal's melodic contour." },
  { mode: "C", label: "RAGA", description: "Detect the backing track's scale, glide-aware." },
];

const emptySource: AudioSourceValue = { kind: "empty" };

export default function ConsolePage() {
  const session = useSession();
  const isAuthenticated = session?.authenticated === true;

  const [mode, setMode] = useState<ProcessingMode>("A");
  const [retuneSpeed, setRetuneSpeed] = useState(0.35);
  const [genre, setGenre] = useState("pop");
  const [extractInstrumental, setExtractInstrumental] = useState(false);

  const [vocalSource, setVocalSource] = useState<AudioSourceValue>(emptySource);
  const [referenceSource, setReferenceSource] = useState<AudioSourceValue>(emptySource);
  const [backingSource, setBackingSource] = useState<AudioSourceValue>(emptySource);

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<StatusResponse | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const needsReference = mode === "B";
  const needsBacking = mode === "C";

  const hasVocal = vocalSource.kind !== "empty";
  const hasReference = referenceSource.kind !== "empty";
  const hasBacking = backingSource.kind !== "empty";

  const canSubmit =
    isAuthenticated &&
    hasVocal &&
    (!needsReference || hasReference) &&
    (!needsBacking || hasBacking) &&
    flowState !== "submitting" &&
    flowState !== "processing";

  const handleSubmit = async () => {
    if (vocalSource.kind !== "blob") return;
    setFlowState("submitting");
    setErrorMessage(null);
    setResultUrl(null);
    setLastStatus(null);
    setUploadProgress(0);
    try {
      const { job_id } = await submitJob(
        {
          mode,
          retuneSpeed,
          genre,
          extractInstrumental,
          vocal: vocalSource.blob,
          reference: referenceSource.kind === "blob" ? referenceSource.blob : undefined,
          referenceYoutubeUrl: referenceSource.kind === "youtube" ? referenceSource.url : undefined,
          backing: backingSource.kind === "blob" ? backingSource.blob : undefined,
          backingYoutubeUrl: backingSource.kind === "youtube" ? backingSource.url : undefined,
        },
        setUploadProgress,
      );
      setFlowState("processing");
      const finalStatus = await pollUntilDone(job_id);
      setLastStatus(finalStatus);
      if (finalStatus.status === "done") {
        setResultUrl(await fetchResultBlobUrl(job_id));
        setFlowState("done");
      } else {
        setErrorMessage(finalStatus.error ?? "Processing failed");
        setFlowState("error");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      setFlowState("error");
    }
  };

  return (
    <div>
      <header className="flex items-center justify-between border-b border-line py-5 pl-16 pr-6 md:px-10">
        <span className="text-lg font-semibold tracking-tight">Studio Control</span>
        <AuthHeader session={session} />
      </header>

      <div className="py-8 pl-16 pr-6 md:px-10">
        <p className="font-mono text-xs uppercase tracking-wider text-ink/50">workspace / console</p>
        <h1 className="mt-1 text-4xl font-light tracking-tight text-ink">Vocal Session</h1>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-6"
          >
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Audio Ingestion</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink/30">44.1kHz / 24-bit</span>
              </div>
              <AudioSource label="Your vocal take" onChange={setVocalSource} />
            </div>

            <div>
              <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/50">
                Analysis Engine
              </span>
              <div className="rounded-xl border border-line bg-white p-5 shadow-panel">
                <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                  {MODE_TABS.map((tab) => (
                    <button
                      key={tab.mode}
                      type="button"
                      onClick={() => setMode(tab.mode)}
                      className={`rounded-lg py-2.5 text-sm font-medium transition ${
                        mode === tab.mode
                          ? "bg-gradient-mustard text-white shadow-mustard"
                          : "bg-mist text-ink/60 hover:text-ink"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-ink/45">
                  {MODE_TABS.find((tab) => tab.mode === mode)?.description}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-line pt-4 font-mono text-xs min-[420px]:grid-cols-2">
                  <div>
                    <p className="text-ink/45">TUNING ROOT</p>
                    <p className="mt-1 text-ink">A4 = 440.0 HZ</p>
                  </div>
                  <div>
                    <p className="text-ink/45">TEMPERAMENT</p>
                    <p className="mt-1 text-ink">{mode === "A" ? "EQUAL" : mode === "B" ? "CONTOUR" : "DETECTED"}</p>
                  </div>
                  <div>
                    <p className="text-ink/45">DETECTION HOP</p>
                    <p className="mt-1 text-ink">10MS (CREPE)</p>
                  </div>
                  <div>
                    <p className="text-ink/45">RETUNE SPEED</p>
                    <p className="mt-1 text-mustard">{retuneSpeed.toFixed(2)}</p>
                  </div>
                </div>

                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={retuneSpeed}
                  onChange={(e) => setRetuneSpeed(Number(e.target.value))}
                  className="mt-3 w-full accent-mustard"
                />

                <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink/45">Genre</span>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="pop"
                    className="w-32 rounded-md border border-line bg-mist px-2 py-1 text-xs text-ink outline-none focus:border-mustard"
                  />
                </div>
              </div>
            </div>

            {needsReference && (
              <AudioSource label="Reference vocal" allowYoutube onChange={setReferenceSource} />
            )}

            {needsBacking && (
              <div className="flex flex-col gap-2">
                <AudioSource label="Backing track" allowYoutube onChange={setBackingSource} />
                <label className="flex items-center gap-2 px-1 text-xs text-ink/50">
                  <input
                    type="checkbox"
                    checked={extractInstrumental}
                    onChange={(e) => setExtractInstrumental(e.target.checked)}
                    className="accent-mustard"
                  />
                  This track has vocals in it — extract instrumental (karaoke) first
                </label>
              </div>
            )}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="relative overflow-hidden rounded-lg bg-gradient-mustard py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-mustard transition disabled:cursor-not-allowed disabled:opacity-30 hover:enabled:brightness-110"
              >
                {flowState === "submitting" && (
                  <span
                    className="absolute inset-y-0 left-0 bg-white/20 transition-[width]"
                    style={{ width: `${Math.round(uploadProgress * 100)}%` }}
                  />
                )}
                <span className="relative">
                  {flowState === "submitting" && `Uploading... ${Math.round(uploadProgress * 100)}%`}
                  {flowState === "processing" && "Processing..."}
                  {(flowState === "idle" || flowState === "done" || flowState === "error") && "Initialize Session"}
                </span>
              </button>
            ) : (
              <a
                href="/api/auth/login"
                className="rounded-lg border border-line bg-white py-3 text-center text-sm font-medium text-ink/60 transition hover:border-mustard hover:text-mustard"
              >
                Sign in to process a vocal
              </a>
            )}

            {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="flex flex-col gap-6"
          >
            <div>
              <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/50">Result</span>
              <WaveformVisualizer url={resultUrl} label="Result" />
            </div>

            <div className="rounded-xl border border-line bg-white p-5 shadow-panel">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Session Diagnostics</span>
              <div className="mt-4 flex flex-col gap-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ink/50">STATUS</span>
                  <span className="text-ink">
                    {flowState.toUpperCase()}
                    {flowState === "submitting" && ` · ${Math.round(uploadProgress * 100)}%`}
                  </span>
                </div>
                {lastStatus?.automation_summary ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-ink/50">VOCAL RANGE</span>
                      <span className="text-ink">
                        {String(lastStatus.automation_summary.detected_vocal_range ?? "—")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink/50">DYNAMIC RANGE</span>
                      <span className="text-ink">
                        {String(lastStatus.automation_summary.overall_dynamic_range ?? "—")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink/50">EMOTION</span>
                      <span className="text-ink">{String(lastStatus.automation_summary.primary_emotion ?? "—")}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-ink/45">Gemini automation data appears here after processing.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-white p-5 shadow-panel">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Pipeline</span>
              <ol className="mt-4 flex flex-col gap-2.5 text-xs text-ink/50">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-mustard" /> Record, upload, or link
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink/60" /> Gemini analyzes structure & dynamics
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink/40" /> Per-segment retune, reverb & compression
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink/25" /> Mastered result, ready to play
                </li>
              </ol>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
