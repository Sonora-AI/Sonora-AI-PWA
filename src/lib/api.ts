import axios from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const client = axios.create({ baseURL: `${API_BASE_URL}/api/v1` });

export type ProcessingMode = "A" | "B" | "C";
export type JobStatus = "pending" | "processing" | "done" | "error";

export interface ProcessResponse {
  job_id: string;
  status: JobStatus;
}

export interface StatusResponse {
  job_id: string;
  status: JobStatus;
  error?: string | null;
}

export interface ProcessParams {
  mode: ProcessingMode;
  retuneSpeed: number;
  vocal: Blob;
  reference?: Blob;
  backing?: Blob;
}

export async function submitJob(params: ProcessParams): Promise<ProcessResponse> {
  const form = new FormData();
  form.append("mode", params.mode);
  form.append("retune_speed", String(params.retuneSpeed));
  form.append("vocal", params.vocal, "vocal.webm");
  if (params.reference) form.append("reference", params.reference, "reference.webm");
  if (params.backing) form.append("backing", params.backing, "backing.webm");

  const { data } = await client.post<ProcessResponse>("/process", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getStatus(jobId: string): Promise<StatusResponse> {
  const { data } = await client.get<StatusResponse>(`/status/${jobId}`);
  return data;
}

export function getResultUrl(jobId: string): string {
  return `${API_BASE_URL}/api/v1/result/${jobId}`;
}

export async function listStems(jobId: string): Promise<string[]> {
  const { data } = await client.get<{ stems: string[] }>(`/stems/${jobId}`);
  return data.stems;
}

export function getStemUrl(jobId: string, stemName: string): string {
  return `${API_BASE_URL}/api/v1/stems/${jobId}/${stemName}`;
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
