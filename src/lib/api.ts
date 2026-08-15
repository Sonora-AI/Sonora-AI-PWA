import axios from "axios";

const client = axios.create({ baseURL: "/api/backend" });

// Vercel Functions cap request/response bodies at 4.5MB, which real audio
// files routinely exceed. Uploads and result/stem downloads therefore talk
// to the backend directly from the browser (using a short-lived, narrowly
// scoped ticket -- see getTicket below) instead of going through the
// `/api/backend` proxy above, which stays on the small-JSON-only paths.
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

async function getTicket(scope: "upload" | "download", jobId?: string): Promise<string> {
  const { data } = await client.post<{ ticket: string; expires_in: number }>("/tickets", {
    scope,
    job_id: jobId,
  });
  return data.ticket;
}

export type ProcessingMode = "A" | "B" | "C";
export type JobStatus = "pending" | "processing" | "done" | "error";

export interface ProcessResponse {
  job_id: string;
  status: JobStatus;
}

export interface AutomationSummary {
  detected_vocal_range?: string;
  overall_dynamic_range?: string;
  primary_emotion?: string;
  [key: string]: unknown;
}

export interface StatusResponse {
  job_id: string;
  status: JobStatus;
  mode: ProcessingMode;
  progress?: string;
  error?: string | null;
  automation_summary?: AutomationSummary | null;
}

export interface JobSummary {
  job_id: string;
  status: JobStatus;
  mode: ProcessingMode;
  created_at: number;
  error?: string | null;
}

export interface ProcessParams {
  mode: ProcessingMode;
  retuneSpeed: number;
  genre?: string;
  vocal: Blob;
  reference?: Blob;
  referenceYoutubeUrl?: string;
  backing?: Blob;
  backingYoutubeUrl?: string;
  extractInstrumental?: boolean;
}

// fetch() has no upload-progress event and no per-attempt timeout, so a
// large multipart upload over a slow/lossy connection just hangs with zero
// feedback (this is exactly what happened over a high-latency, lossy path:
// TCP congestion control collapsed the connection to ~80Kbps and the UI sat
// on "Uploading..." indefinitely with no way to tell a crawling transfer
// from a dead one). XMLHttpRequest gives us both.
function uploadWithProgress(
  url: string,
  form: FormData,
  ticket: string,
  { timeoutMs, onProgress }: { timeoutMs: number; onProgress?: (fraction: number) => void },
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${ticket}`);
    xhr.timeout = timeoutMs;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error(`Upload timed out after ${Math.round(timeoutMs / 1000)}s`));
    xhr.send(form);
  });
}

const UPLOAD_TIMEOUT_MS = 4 * 60 * 1000;
const MAX_UPLOAD_ATTEMPTS = 3;

export async function submitJob(
  params: ProcessParams,
  onProgress?: (fraction: number) => void,
): Promise<ProcessResponse> {
  const form = new FormData();
  form.append("mode", params.mode);
  form.append("retune_speed", String(params.retuneSpeed));
  if (params.genre) form.append("genre", params.genre);
  form.append("extract_instrumental", String(Boolean(params.extractInstrumental)));
  form.append("vocal", params.vocal, "vocal.webm");
  if (params.reference) form.append("reference", params.reference, "reference.webm");
  if (params.referenceYoutubeUrl) form.append("reference_youtube_url", params.referenceYoutubeUrl);
  if (params.backing) form.append("backing", params.backing, "backing.webm");
  if (params.backingYoutubeUrl) form.append("backing_youtube_url", params.backingYoutubeUrl);

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
    // Fetch a fresh ticket per attempt rather than reusing one across
    // retries -- cheap, and sidesteps any edge case around a ticket expiring
    // mid-retry after a timed-out prior attempt.
    const ticket = await getTicket("upload");
    const isLastAttempt = attempt === MAX_UPLOAD_ATTEMPTS;

    let result: { status: number; body: string };
    try {
      result = await uploadWithProgress(`${BACKEND_URL}/api/v1/process`, form, ticket, {
        timeoutMs: UPLOAD_TIMEOUT_MS,
        onProgress,
      });
    } catch (err) {
      // Network error or timeout -- transient, worth retrying.
      if (isLastAttempt) throw err;
      onProgress?.(0);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      continue;
    }

    if (result.status >= 200 && result.status < 300) return JSON.parse(result.body) as ProcessResponse;
    if (result.status >= 400 && result.status < 500) {
      // Client error (bad auth, bad request, payload too large) -- retrying won't help.
      throw new Error(`Upload failed (${result.status}): ${result.body}`);
    }
    // 5xx -- treat as transient and retry.
    if (isLastAttempt) throw new Error(`Upload failed (${result.status}): ${result.body}`);
    onProgress?.(0);
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  throw new Error("Upload failed after retries");
}

export async function listJobs(): Promise<JobSummary[]> {
  const { data } = await client.get<JobSummary[]>("/jobs");
  return data;
}

export async function getStatus(jobId: string): Promise<StatusResponse> {
  const { data } = await client.get<StatusResponse>(`/status/${jobId}`);
  return data;
}

async function fetchAudioBlobUrl(path: string, jobId: string): Promise<string> {
  const ticket = await getTicket("download", jobId);
  const response = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${ticket}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch audio (${response.status})`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function fetchResultBlobUrl(jobId: string): Promise<string> {
  return fetchAudioBlobUrl(`/api/v1/result/${jobId}`, jobId);
}

export async function listStems(jobId: string): Promise<string[]> {
  const { data } = await client.get<{ stems: string[] }>(`/stems/${jobId}`);
  return data.stems;
}

export async function fetchStemBlobUrl(jobId: string, stemName: string): Promise<string> {
  return fetchAudioBlobUrl(`/api/v1/stems/${jobId}/${stemName}`, jobId);
}

export async function pollUntilDone(
  jobId: string,
  // The backend VM has no GPU, so Demucs/CREPE inference is CPU-bound --
  // observed real-world completion times run 25-30+ minutes even for small
  // files, so this needs real headroom above that, not just above the
  // model-download-on-first-request case.
  {
    intervalMs = 1500,
    timeoutMs = 45 * 60 * 1000,
    onStatus,
  }: { intervalMs?: number; timeoutMs?: number; onStatus?: (status: StatusResponse) => void } = {},
): Promise<StatusResponse> {
  const start = Date.now();
  while (true) {
    const status = await getStatus(jobId);
    onStatus?.(status);
    if (status.status === "done" || status.status === "error") return status;
    if (Date.now() - start > timeoutMs) throw new Error(`Job ${jobId} timed out while polling`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
