"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AudioRecorder } from "@/components/ui/AudioRecorder";
import { ModeSelector } from "@/components/ui/ModeSelector";
import { WaveformVisualizer } from "@/components/ui/WaveformVisualizer";
import { submitJob, pollUntilDone, getResultUrl, type ProcessingMode } from "@/lib/api";

type FlowState = "idle" | "submitting" | "processing" | "done" | "error";

export default function Home() {
  const [mode, setMode] = useState<ProcessingMode>("A");
  const [retuneSpeed, setRetuneSpeed] = useState(0.35);
  const [vocalBlob, setVocalBlob] = useState<Blob | null>(null);
  const [referenceBlob, setReferenceBlob] = useState<Blob | null>(null);
  const [backingBlob, setBackingBlob] = useState<Blob | null>(null);
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const needsReference = mode === "B";
  const needsBacking = mode === "C";

  const canSubmit =
    Boolean(vocalBlob) &&
    (!needsReference || Boolean(referenceBlob)) &&
    (!needsBacking || Boolean(backingBlob)) &&
    flowState !== "submitting" &&
    flowState !== "processing";

  const handleSubmit = async () => {
    if (!vocalBlob) return;
    setFlowState("submitting");
    setErrorMessage(null);
    setResultUrl(null);
    try {
      const { job_id } = await submitJob({
        mode,
        retuneSpeed,
        vocal: vocalBlob,
        reference: referenceBlob ?? undefined,
        backing: backingBlob ?? undefined,
      });
      setFlowState("processing");
      const finalStatus = await pollUntilDone(job_id);
      if (finalStatus.status === "done") {
        setResultUrl(getResultUrl(job_id));
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
    <main className="min-h-screen bg-obsidian px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-semibold tracking-tight text-titanium">
            Sonora <span className="text-gold">AI</span>
          </h1>
          <p className="mt-2 text-sm text-titanium/60">
            Record, tune, and master your vocal in one pass.
          </p>
        </motion.header>

        <div className="mt-8 flex flex-col gap-5">
          <ModeSelector
            value={mode}
            onChange={setMode}
            retuneSpeed={retuneSpeed}
            onRetuneSpeedChange={setRetuneSpeed}
          />

          <AudioRecorder label="Your vocal take" onBlobChange={setVocalBlob} />

          {needsReference && (
            <AudioRecorder label="Reference vocal" onBlobChange={setReferenceBlob} />
          )}
          {needsBacking && (
            <AudioRecorder label="Backing track" onBlobChange={setBackingBlob} />
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg bg-gold py-3 text-sm font-medium text-obsidian transition disabled:cursor-not-allowed disabled:opacity-30 hover:enabled:brightness-110"
          >
            {flowState === "submitting" && "Uploading..."}
            {flowState === "processing" && "Processing..."}
            {(flowState === "idle" || flowState === "done" || flowState === "error") && "Process vocal"}
          </button>

          {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}

          <WaveformVisualizer url={resultUrl} label="Result" />
        </div>
      </div>
    </main>
  );
}
