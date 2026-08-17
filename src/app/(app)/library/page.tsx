"use client";

import { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { AuthHeader, useSession } from "@/components/ui/AuthHeader";
import {
  listJobs,
  fetchResultBlobUrl,
  fetchStemBlobUrl,
  submitPianoBacking,
  pollUntilPianoBackingDone,
  type JobSummary,
} from "@/lib/api";

const MODE_LABEL: Record<string, string> = { A: "12-TET", B: "CONTOUR", C: "RAGA", COVER: "COVER" };

const STATUS_STYLE: Record<string, string> = {
  done: "bg-green-50 text-green-700 border-green-200",
  error: "bg-red-50 text-red-600 border-red-200",
  processing: "bg-mustard/10 text-mustard border-mustard/30",
  pending: "bg-mist text-ink/50 border-line",
};

export default function LibraryPage() {
  const session = useSession();
  const isAuthenticated = session?.authenticated === true;
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingJobId, setPlayingJobId] = useState<string | null>(null);
  const [pianoJobId, setPianoJobId] = useState<string | null>(null);
  const [pianoDoneJobIds, setPianoDoneJobIds] = useState<Set<string>>(new Set());

  const handlePlay = async (jobId: string) => {
    setPlayingJobId(jobId);
    try {
      const blobUrl = await fetchResultBlobUrl(jobId);
      window.open(blobUrl, "_blank");
    } catch {
      setError("Failed to load audio");
    } finally {
      setPlayingJobId(null);
    }
  };

  const handleGeneratePiano = async (jobId: string) => {
    setPianoJobId(jobId);
    try {
      await submitPianoBacking(jobId);
      const finalStatus = await pollUntilPianoBackingDone(jobId);
      if (finalStatus.piano_backing_status === "done") {
        setPianoDoneJobIds((prev) => new Set(prev).add(jobId));
      } else {
        setError(finalStatus.piano_backing_error ?? "Piano backing generation failed");
      }
    } catch {
      setError("Failed to generate piano version");
    } finally {
      setPianoJobId(null);
    }
  };

  const handlePlayPiano = async (jobId: string) => {
    setPlayingJobId(jobId);
    try {
      const blobUrl = await fetchStemBlobUrl(jobId, "piano_backing");
      window.open(blobUrl, "_blank");
    } catch {
      setError("Failed to load audio");
    } finally {
      setPlayingJobId(null);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    listJobs()
      .then(setJobs)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sessions"));
  }, [isAuthenticated]);

  return (
    <div>
      <header className="flex items-center justify-between border-b border-line py-5 pl-16 pr-6 md:px-10">
        <span className="text-lg font-semibold tracking-tight">Library</span>
        <AuthHeader session={session} />
      </header>

      <div className="py-8 pl-16 pr-6 md:px-10">
        <p className="font-mono text-xs uppercase tracking-wider text-ink/40">workspace / library</p>
        <h1 className="mt-1 text-4xl font-light tracking-tight text-ink">Session History</h1>

        <div className="mt-8 rounded-xl border border-line bg-white shadow-panel">
          {!isAuthenticated && (
            <p className="p-8 text-center text-sm text-ink/40">Sign in to see your past sessions.</p>
          )}

          {isAuthenticated && error && <p className="p-8 text-center text-sm text-red-500">{error}</p>}

          {isAuthenticated && !error && jobs === null && (
            <p className="p-8 text-center text-sm text-ink/40">Loading…</p>
          )}

          {isAuthenticated && jobs !== null && jobs.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <FolderOpen size={22} strokeWidth={1.5} className="text-ink/25" />
              <p className="text-sm text-ink/40">No sessions yet — process a vocal in Console to see it here.</p>
            </div>
          )}

          {isAuthenticated && jobs !== null && jobs.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink/35">
                  <th className="px-5 py-3 font-normal">Job</th>
                  <th className="px-5 py-3 font-normal">Mode</th>
                  <th className="px-5 py-3 font-normal">Status</th>
                  <th className="px-5 py-3 font-normal">Created</th>
                  <th className="px-5 py-3 font-normal">Result</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.job_id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-ink/50">{job.job_id.slice(0, 8)}</td>
                    <td className="px-5 py-3 text-ink/70">{MODE_LABEL[job.mode] ?? job.mode}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                          STATUS_STYLE[job.status] ?? STATUS_STYLE.pending
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink/50">{new Date(job.created_at * 1000).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      {job.status === "done" ? (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handlePlay(job.job_id)}
                            disabled={playingJobId === job.job_id}
                            className="text-mustard hover:underline disabled:opacity-50"
                          >
                            {playingJobId === job.job_id ? "Loading…" : "Play"}
                          </button>
                          {job.mode === "COVER" &&
                            (pianoDoneJobIds.has(job.job_id) ? (
                              <button
                                type="button"
                                onClick={() => handlePlayPiano(job.job_id)}
                                disabled={playingJobId === job.job_id}
                                className="text-mustard hover:underline disabled:opacity-50"
                              >
                                {playingJobId === job.job_id ? "Loading…" : "Play Piano"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleGeneratePiano(job.job_id)}
                                disabled={pianoJobId === job.job_id}
                                className="text-ink/50 hover:text-mustard hover:underline disabled:opacity-50"
                              >
                                {pianoJobId === job.job_id ? "Generating…" : "Generate Piano Version"}
                              </button>
                            ))}
                        </div>
                      ) : (
                        <span className="text-ink/25">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
