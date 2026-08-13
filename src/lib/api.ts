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

export async function submitJob(params: ProcessParams): Promise<ProcessResponse> {
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

  const ticket = await getTicket("upload");
  const response = await fetch(`${BACKEND_URL}/api/v1/process`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ticket}` },
    body: form,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Upload failed (${response.status}): ${detail}`);
  }
  return (await response.json()) as ProcessResponse;
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
  // The backend VM has no GPU, so Demucs/CREPE inference is CPU-bound and can
  // legitimately take well past 5 minutes, especially on first request while
  // model weights are still downloading.
  { intervalMs = 1500, timeoutMs = 20 * 60 * 1000 }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<StatusResponse> {
  const start = Date.now();
  while (true) {
    const status = await getStatus(jobId);
    if (status.status === "done" || status.status === "error") return status;
    if (Date.now() - start > timeoutMs) throw new Error(`Job ${jobId} timed out while polling`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
