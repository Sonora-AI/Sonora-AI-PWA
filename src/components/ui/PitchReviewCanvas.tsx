"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, RotateCcw } from "lucide-react";
import type { NoteEdit, ReviewPayload } from "@/lib/api";

interface PitchReviewCanvasProps {
  payload: ReviewPayload;
  onConfirm: (edits: NoteEdit[]) => void;
  confirming?: boolean;
}

interface EditableNote {
  index: number;
  startSec: number;
  endSec: number;
  perceivedHz: number;
  targetHz: number; // starts equal to the server's target_hz; mutated by drag
  skip: boolean;
  touched: boolean; // true once dragged OR skip-toggled
}

const REF_HZ = 440;
const PIXELS_PER_SECOND = 60;
const PAD_LEFT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;
const PLOT_HEIGHT = 220;
const CENTS_MARGIN = 300; // ~2.5 semitones of headroom above/below the note range
const SEMITONE_SNAP_CENTS = 15; // magnetic capture radius around each 12-TET semitone

const hzToCents = (hz: number) => 1200 * Math.log2(hz / REF_HZ);
const centsToHz = (cents: number) => REF_HZ * Math.pow(2, cents / 1200);

export function PitchReviewCanvas({ payload, onConfirm, confirming = false }: PitchReviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [notes, setNotes] = useState<EditableNote[]>(() =>
    payload.notes.map((n) => ({
      index: n.index,
      startSec: n.start_sec,
      endSec: n.end_sec,
      perceivedHz: n.perceived_pitch_hz,
      targetHz: n.target_hz,
      skip: false,
      touched: false,
    })),
  );

  const durationSec = useMemo(() => {
    const contourEnd = payload.contour_times.length ? payload.contour_times[payload.contour_times.length - 1] : 0;
    const notesEnd = notes.reduce((max, n) => Math.max(max, n.endSec), 0);
    return Math.max(contourEnd, notesEnd, 1);
  }, [payload.contour_times, notes]);

  const { minCents, maxCents } = useMemo(() => {
    const allCents = notes.flatMap((n) => [hzToCents(n.perceivedHz), hzToCents(n.targetHz)]);
    if (allCents.length === 0) return { minCents: -1200, maxCents: 1200 };
    return { minCents: Math.min(...allCents) - CENTS_MARGIN, maxCents: Math.max(...allCents) + CENTS_MARGIN };
  }, [notes]);

  const plotWidth = Math.max(durationSec * PIXELS_PER_SECOND, 320);
  const canvasWidth = plotWidth + PAD_LEFT * 2;
  const canvasHeight = PLOT_HEIGHT + PAD_TOP + PAD_BOTTOM;

  const xScale = (t: number) => PAD_LEFT + (t / durationSec) * plotWidth;
  const yScale = (hz: number) => PAD_TOP + ((maxCents - hzToCents(hz)) / (maxCents - minCents)) * PLOT_HEIGHT;
  const yToHz = (y: number) => centsToHz(maxCents - ((y - PAD_TOP) / PLOT_HEIGHT) * (maxCents - minCents));

  // Draw the F0 curve + note bars on canvas; the drag handles/skip toggles
  // are a separate DOM overlay below, positioned with the same xScale/yScale.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * ratio;
    canvas.height = canvasHeight * ratio;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Gridlines at each semitone.
    ctx.strokeStyle = "rgba(22, 22, 21, 0.06)";
    ctx.lineWidth = 1;
    const firstSemitone = Math.ceil(minCents / 100) * 100;
    for (let c = firstSemitone; c <= maxCents; c += 100) {
      const y = yScale(centsToHz(c));
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(PAD_LEFT + plotWidth, y);
      ctx.stroke();
    }

    // F0 curve -- break the line across unvoiced gaps (frequency <= 0) instead
    // of drawing a spurious segment down to 0 Hz.
    ctx.strokeStyle = "rgba(22, 22, 21, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let drawing = false;
    for (let i = 0; i < payload.contour_times.length; i++) {
      const hz = payload.contour_frequency[i];
      if (!hz || hz <= 0) {
        drawing = false;
        continue;
      }
      const x = xScale(payload.contour_times[i]);
      const y = yScale(hz);
      if (!drawing) {
        ctx.moveTo(x, y);
        drawing = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Per-note perceived-pitch + target bars.
    for (const note of notes) {
      const x1 = xScale(note.startSec);
      const x2 = xScale(note.endSec);

      ctx.strokeStyle = "rgba(22, 22, 21, 0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, yScale(note.perceivedHz));
      ctx.lineTo(x2, yScale(note.perceivedHz));
      ctx.stroke();

      const effectiveTargetHz = note.skip ? note.perceivedHz : note.targetHz;
      const differs = Math.abs(hzToCents(effectiveTargetHz) - hzToCents(note.perceivedHz)) >= 1;
      ctx.strokeStyle = differs ? "#C9992B" : "rgba(22, 22, 21, 0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, yScale(effectiveTargetHz));
      ctx.lineTo(x2, yScale(effectiveTargetHz));
      ctx.stroke();
    }
  }, [notes, payload, canvasWidth, canvasHeight, plotWidth, minCents, maxCents, durationSec]);

  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>, i: number) => {
    if (notes[i].skip) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const startClientY = e.clientY;
    const startCents = hzToCents(notes[i].targetHz);

    const onMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - startClientY; // X movement is ignored entirely --
      const deltaCents = (deltaY / PLOT_HEIGHT) * (maxCents - minCents); // this IS the "clamp to the
      let newCents = startCents - deltaCents; // note's own time-span" behavior: the
      // handle's X position never moves.
      const nearestSemitone = Math.round(newCents / 100) * 100;
      if (Math.abs(nearestSemitone - newCents) <= SEMITONE_SNAP_CENTS) newCents = nearestSemitone;
      const newHz = centsToHz(newCents);
      setNotes((prev) => prev.map((n, idx) => (idx === i ? { ...n, targetHz: newHz, touched: true } : n)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const toggleSkip = (i: number) => {
    setNotes((prev) => prev.map((n, idx) => (idx === i ? { ...n, skip: !n.skip, touched: true } : n)));
  };

  const handleConfirm = () => {
    const edits: NoteEdit[] = notes
      .filter((n) => n.touched)
      .map((n) => ({ note_index: n.index, target_hz: n.targetHz, skip: n.skip }));
    onConfirm(edits);
  };

  const touchedCount = notes.filter((n) => n.touched).length;

  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Pitch Review</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink/30">
          {notes.length} notes detected
        </span>
      </div>
      <p className="mt-2 text-xs text-ink/45">
        Drag a note&apos;s accent line to change its correction target, or tap the skip icon to leave it uncorrected.
      </p>

      <div ref={containerRef} className="relative mt-4 overflow-x-auto rounded-lg bg-mist/40">
        <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
          <canvas ref={canvasRef} className="absolute left-0 top-0" />
          {notes.map((note, i) => {
            const cx = xScale((note.startSec + note.endSec) / 2);
            const effectiveTargetHz = note.skip ? note.perceivedHz : note.targetHz;
            const cy = yScale(effectiveTargetHz);
            return (
              <div key={note.index} className="absolute" style={{ left: cx, top: cy }}>
                <button
                  type="button"
                  onClick={() => toggleSkip(i)}
                  className="absolute flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-white text-ink/50 shadow-sm transition hover:text-mustard"
                  style={{ top: -26 }}
                  aria-label={note.skip ? "Re-enable correction for this note" : "Don't correct this note"}
                >
                  {note.skip ? <RotateCcw size={11} /> : <Ban size={11} />}
                </button>
                <div
                  onPointerDown={(e) => onHandlePointerDown(e, i)}
                  className="h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow transition"
                  style={{
                    backgroundColor: note.skip ? "rgba(22,22,21,0.35)" : "#C9992B",
                    opacity: note.skip ? 0.35 : 1,
                    cursor: note.skip ? "not-allowed" : "ns-resize",
                    touchAction: "none",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink/35">
          {touchedCount > 0 ? `${touchedCount} note(s) edited` : "No edits yet -- defaults will be used"}
        </span>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirming}
          className="rounded-lg bg-gradient-mustard px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-mustard transition disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:brightness-110"
        >
          {confirming ? "Rendering..." : "Confirm & Render"}
        </button>
      </div>
    </div>
  );
}
