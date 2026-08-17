"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AudioSource, type AudioSourceValue } from "@/components/ui/AudioSource";
import { AuthHeader, useSession } from "@/components/ui/AuthHeader";
import { PitchReviewCanvas } from "@/components/ui/PitchReviewCanvas";
import { WaveformVisualizer } from "@/components/ui/WaveformVisualizer";
import {
  submitJob,
  pollUntil,
  pollUntilDone,
  pollUntilPianoBackingDone,
  fetchResultBlobUrl,
  fetchStemBlobUrl,
  getReviewPayload,
  confirmReview,
  submitPianoBacking,
  remixCover,
  pollUntilRemixDone,
  remasterJob,
  type NoteEdit,
  type ProcessingMode,
  type ReviewPayload,
  type StatusResponse,
} from "@/lib/api";

type FlowState = "idle" | "submitting" | "processing" | "reviewing" | "done" | "error";

const MODE_TABS: { mode: ProcessingMode; label: string; description: string }[] = [
  { mode: "A", label: "12-TET", description: "Snap to the standard equal-tempered grid." },
  { mode: "B", label: "CONTOUR", description: "Follow a reference vocal's melodic contour." },
  { mode: "C", label: "RAGA", description: "Detect the backing track's scale, glide-aware." },
  { mode: "COVER", label: "COVER", description: "Cover a full song: align to it, correct, and mix over its instrumental." },
];

const emptySource: AudioSourceValue = { kind: "empty" };

export default function ConsolePage() {
  const session = useSession();
  const isAuthenticated = session?.authenticated === true;

  const [mode, setMode] = useState<ProcessingMode>("A");
  const [retuneSpeed, setRetuneSpeed] = useState(0.35);
  const [genre, setGenre] = useState("pop");
  const [extractInstrumental, setExtractInstrumental] = useState(false);
  const [enableReview, setEnableReview] = useState(false);
  const [denoiseStrength, setDenoiseStrength] = useState(0.4);

  const [vocalSource, setVocalSource] = useState<AudioSourceValue>(emptySource);
  const [referenceSource, setReferenceSource] = useState<AudioSourceValue>(emptySource);
  const [backingSource, setBackingSource] = useState<AudioSourceValue>(emptySource);

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<StatusResponse | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [reviewPayload, setReviewPayload] = useState<ReviewPayload | null>(null);
  const [confirmingReview, setConfirmingReview] = useState(false);
  const [pianoUrl, setPianoUrl] = useState<string | null>(null);
  const [generatingPiano, setGeneratingPiano] = useState(false);
  const [pianoError, setPianoError] = useState<string | null>(null);

  const [remixOffset, setRemixOffset] = useState(0);
  const [remixVocalGainDb, setRemixVocalGainDb] = useState(0);
  const [remixBackingGainDb, setRemixBackingGainDb] = useState(0);
  const [remixUsePiano, setRemixUsePiano] = useState(false);
  const [remixing, setRemixing] = useState(false);
  const [remixError, setRemixError] = useState<string | null>(null);
  const [remixUrl, setRemixUrl] = useState<string | null>(null);

  const [correctionMix, setCorrectionMix] = useState(0.8);
  const [remastering, setRemastering] = useState(false);
  const [remasterError, setRemasterError] = useState<string | null>(null);

  const needsReference = mode === "B" || mode === "COVER";
  const needsBacking = mode === "C";
  const isCover = mode === "COVER";

  const hasVocal = vocalSource.kind !== "empty";
  const hasReference = referenceSource.kind !== "empty";
  const hasBacking = backingSource.kind !== "empty";

  const canSubmit =
    isAuthenticated &&
    hasVocal &&
    (!needsReference || hasReference) &&
    (!needsBacking || hasBacking) &&
    flowState !== "submitting" &&
    flowState !== "processing" &&
    flowState !== "reviewing";

  const handleSubmit = async () => {
    if (vocalSource.kind !== "blob") return;
    setFlowState("submitting");
    setErrorMessage(null);
    setResultUrl(null);
    setLastStatus(null);
    setReviewPayload(null);
    setUploadProgress(0);
    setPianoUrl(null);
    setPianoError(null);
    setRemixError(null);
    setRemixOffset(0);
    setRemixVocalGainDb(0);
    setRemixBackingGainDb(0);
    setRemixUsePiano(false);
    setRemixUrl(null);
    setCorrectionMix(0.8);
    setRemasterError(null);
    try {
      const { job_id } = await submitJob(
        {
          mode,
          retuneSpeed,
          genre,
          extractInstrumental,
          enableReview,
          denoiseStrength,
          vocal: vocalSource.blob,
          reference: referenceSource.kind === "blob" ? referenceSource.blob : undefined,
          referenceYoutubeUrl: referenceSource.kind === "youtube" ? referenceSource.url : undefined,
          backing: backingSource.kind === "blob" ? backingSource.blob : undefined,
          backingYoutubeUrl: backingSource.kind === "youtube" ? backingSource.url : undefined,
        },
        setUploadProgress,
      );
      setJobId(job_id);
      setFlowState("processing");
      const status = await pollUntil(
        job_id,
        (s) => s.status === "awaiting_review" || s.status === "done" || s.status === "error",
        { onStatus: setLastStatus },
      );
      setLastStatus(status);
      if (status.status === "awaiting_review") {
        setReviewPayload(await getReviewPayload(job_id));
        setFlowState("reviewing");
      } else if (status.status === "done") {
        setResultUrl(await fetchResultBlobUrl(job_id));
        setFlowState("done");
      } else {
        setErrorMessage(status.error ?? "Processing failed");
        setFlowState("error");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      setFlowState("error");
    }
  };

  const handleConfirmReview = async (edits: NoteEdit[]) => {
    if (!jobId) return;
    setConfirmingReview(true);
    setErrorMessage(null);
    try {
      await confirmReview(jobId, edits);
      setFlowState("processing");
      const finalStatus = await pollUntilDone(jobId, { onStatus: setLastStatus });
      setLastStatus(finalStatus);
      if (finalStatus.status === "done") {
        setResultUrl(await fetchResultBlobUrl(jobId));
        setFlowState("done");
      } else {
        setErrorMessage(finalStatus.error ?? "Processing failed");
        setFlowState("error");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      setFlowState("error");
    } finally {
      setConfirmingReview(false);
    }
  };

  const handleGeneratePiano = async () => {
    if (!jobId) return;
    setGeneratingPiano(true);
    setPianoError(null);
    try {
      await submitPianoBacking(jobId);
      const finalStatus = await pollUntilPianoBackingDone(jobId);
      if (finalStatus.piano_backing_status === "done") {
        setPianoUrl(await fetchStemBlobUrl(jobId, "piano_backing"));
      } else {
        setPianoError(finalStatus.piano_backing_error ?? "Piano backing generation failed");
      }
    } catch (err) {
      setPianoError(err instanceof Error ? err.message : "Failed to generate piano version");
    } finally {
      setGeneratingPiano(false);
    }
  };

  const handleApplyRemix = async () => {
    if (!jobId) return;
    setRemixing(true);
    setRemixError(null);
    try {
      await remixCover(jobId, {
        offsetSeconds: remixOffset,
        vocalGainDb: remixVocalGainDb,
        backingGainDb: remixBackingGainDb,
        usePiano: remixUsePiano,
      });
      const finalStatus = await pollUntilRemixDone(jobId);
      if (finalStatus.remix_status === "done") {
        setRemixUrl(await fetchStemBlobUrl(jobId, "remix"));
      } else {
        setRemixError(finalStatus.remix_error ?? "Remix failed");
      }
    } catch (err) {
      setRemixError(err instanceof Error ? err.message : "Failed to apply remix");
    } finally {
      setRemixing(false);
    }
  };

  const handleRemaster = async () => {
    if (!jobId) return;
    setRemastering(true);
    setRemasterError(null);
    try {
      await remasterJob(jobId, correctionMix);
      const finalStatus = await pollUntilDone(jobId, { onStatus: setLastStatus });
      if (finalStatus.status === "done") {
        setResultUrl(await fetchResultBlobUrl(jobId));
      } else {
        setRemasterError(finalStatus.error ?? "Re-render failed");
      }
    } catch (err) {
      setRemasterError(err instanceof Error ? err.message : "Failed to re-render");
    } finally {
      setRemastering(false);
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

                <label className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-xs text-ink/50">
                  <input
                    type="checkbox"
                    checked={enableReview}
                    onChange={(e) => setEnableReview(e.target.checked)}
                    className="accent-mustard"
                  />
                  Review detected notes before finalizing
                </label>
              </div>
            </div>

            <div>
              <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/50">Mastering</span>
              <div className="rounded-xl border border-line bg-white p-5 shadow-panel">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink/45">
                    Noise Reduction
                  </span>
                  <span className="font-mono text-xs text-mustard">{denoiseStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={denoiseStrength}
                  onChange={(e) => setDenoiseStrength(Number(e.target.value))}
                  className="mt-2 w-full accent-mustard"
                />
                <p className="mt-1 text-[11px] text-ink/40">
                  Strips background hiss/room noise. Higher values remove more noise but can dull the vocal — 0
                  disables it. This is a separate issue from a "robotic" sound below, which is the pitch
                  correction itself, not noise.
                </p>

                {flowState === "done" && (
                  <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-ink/45">
                          Correction Strength
                        </span>
                        <span className="font-mono text-xs text-mustard">{correctionMix.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={correctionMix}
                        onChange={(e) => setCorrectionMix(Number(e.target.value))}
                        className="mt-2 w-full accent-mustard"
                      />
                      <p className="mt-1 text-[11px] text-ink/40">
                        How much of the detected correction to actually apply — lower sounds closer to your
                        original take (less robotic), higher snaps harder to pitch. This re-renders the vocal, so
                        it takes a moment.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemaster}
                      disabled={remastering}
                      className="rounded-lg bg-gradient-mustard px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-mustard transition disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:brightness-110"
                    >
                      {remastering ? "Re-rendering..." : "Apply Correction Strength"}
                    </button>
                    {remasterError && <p className="text-xs text-red-500">{remasterError}</p>}
                  </div>
                )}

                {isCover && flowState === "done" && (
                  <div className="mt-5 flex flex-col gap-4 border-t border-line pt-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-ink/45">
                          Backing Track Offset
                        </span>
                        <span className="font-mono text-xs text-mustard">{remixOffset.toFixed(2)}s</span>
                      </div>
                      <input
                        type="range"
                        min={-5}
                        max={5}
                        step={0.05}
                        value={remixOffset}
                        onChange={(e) => setRemixOffset(Number(e.target.value))}
                        className="mt-2 w-full accent-mustard"
                      />
                      <p className="mt-1 text-[11px] text-ink/40">
                        Manually nudge the backing track's alignment to your voice if the automatic sync is off.
                        Negative = backing starts earlier, positive = later.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-ink/45">
                          Vocal Volume
                        </span>
                        <span className="font-mono text-xs text-mustard">
                          {remixVocalGainDb > 0 ? "+" : ""}
                          {remixVocalGainDb.toFixed(1)} dB
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-24}
                        max={24}
                        step={0.5}
                        value={remixVocalGainDb}
                        onChange={(e) => setRemixVocalGainDb(Number(e.target.value))}
                        className="mt-2 w-full accent-mustard"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-ink/45">
                          {remixUsePiano ? "Piano Volume" : "Backing Volume"}
                        </span>
                        <span className="font-mono text-xs text-mustard">
                          {remixBackingGainDb > 0 ? "+" : ""}
                          {remixBackingGainDb.toFixed(1)} dB
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-24}
                        max={24}
                        step={0.5}
                        value={remixBackingGainDb}
                        onChange={(e) => setRemixBackingGainDb(Number(e.target.value))}
                        className="mt-2 w-full accent-mustard"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-ink/50">
                      <input
                        type="checkbox"
                        checked={remixUsePiano}
                        onChange={(e) => setRemixUsePiano(e.target.checked)}
                        disabled={!pianoUrl}
                        className="accent-mustard"
                      />
                      Mix against the piano version instead of the original instrumental
                      {!pianoUrl && " (generate it below first)"}
                    </label>

                    <button
                      type="button"
                      onClick={handleApplyRemix}
                      disabled={remixing}
                      className="rounded-lg bg-gradient-mustard px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-mustard transition disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:brightness-110"
                    >
                      {remixing ? "Remixing..." : "Apply Remix"}
                    </button>
                    {remixError && <p className="text-xs text-red-500">{remixError}</p>}
                  </div>
                )}
              </div>
            </div>

            {needsReference && (
              <AudioSource
                label={isCover ? "Song to cover (full mix, with vocals)" : "Reference vocal"}
                allowYoutube
                onChange={setReferenceSource}
              />
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
                  {flowState === "processing" && (lastStatus?.progress || "Processing...")}
                  {flowState === "reviewing" && "Awaiting your review..."}
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
            {flowState === "reviewing" && reviewPayload ? (
              <PitchReviewCanvas payload={reviewPayload} onConfirm={handleConfirmReview} confirming={confirmingReview} />
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/50">
                    {isCover && flowState === "done" ? "Output A · Original Instrumental" : "Result"}
                  </span>
                  <WaveformVisualizer url={resultUrl} label="Result" downloadFileName="sonora-result.wav" />
                </div>

                {isCover && flowState === "done" && (
                  <div>
                    <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/50">
                      Output B · Piano Backing
                    </span>
                    {pianoUrl ? (
                      <WaveformVisualizer url={pianoUrl} label="Piano Version" downloadFileName="sonora-piano-backing.wav" />
                    ) : (
                      <div className="rounded-xl border border-line bg-white p-5 shadow-panel">
                        <p className="text-xs text-ink/45">
                          Swap the extracted instrumental for a Gemini-generated piano arrangement of the same song.
                        </p>
                        <button
                          type="button"
                          onClick={handleGeneratePiano}
                          disabled={generatingPiano}
                          className="mt-3 rounded-lg bg-gradient-mustard px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-mustard transition disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:brightness-110"
                        >
                          {generatingPiano ? "Generating..." : "Generate Piano Version"}
                        </button>
                        {pianoError && <p className="mt-2 text-xs text-red-500">{pianoError}</p>}
                      </div>
                    )}
                  </div>
                )}

                {isCover && flowState === "done" && (remixUrl || remixing) && (
                  <div>
                    <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/50">
                      Remix Preview
                    </span>
                    <WaveformVisualizer url={remixUrl} label="Remix" downloadFileName="sonora-remix.wav" />
                    <p className="mt-1 text-[11px] text-ink/40">
                      Your offset/volume adjustments, previewed here — Output A above is untouched until you're
                      happy with this and replace it manually.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-line bg-white p-5 shadow-panel">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Session Diagnostics</span>
              <div className="mt-4 flex flex-col gap-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ink/50">STATUS</span>
                  <span className="text-ink">
                    {flowState.toUpperCase()}
                    {flowState === "submitting" && ` · ${Math.round(uploadProgress * 100)}%`}
                    {flowState === "processing" && lastStatus?.progress && ` · ${lastStatus.progress}`}
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
