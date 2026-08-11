import axios from "axios";

const client = axios.create({ baseURL: "/api/backend" });

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

  const { data } = await client.post<ProcessResponse>("/process", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listJobs(): Promise<JobSummary[]> {
  const { data } = await client.get<JobSummary[]>("/jobs");
  return data;
}

export async function getStatus(jobId: string): Promise<StatusResponse> {
  const { data } = await client.get<StatusResponse>(`/status/${jobId}`);
  return data;
}

export function getResultUrl(jobId: string): string {
  return `/api/backend/result/${jobId}`;
}

export async function listStems(jobId: string): Promise<string[]> {
  const { data } = await client.get<{ stems: string[] }>(`/stems/${jobId}`);
  return data.stems;
}

export function getStemUrl(jobId: string, stemName: string): string {
  return `/api/backend/stems/${jobId}/${stemName}`;
}

export async function pollUntilDone(
  jobId: string,
  { intervalMs = 1500, timeoutMs = 5 * 60 * 1000 }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<StatusResponse> {
  const start = Date.now();
  while (true) {
    const status = await getStatus(jobId);
    if (status.status === "done" || status.status === "error") return status;
    if (Date.now() - start > timeoutMs) throw new Error(`Job ${jobId} timed out while polling`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
