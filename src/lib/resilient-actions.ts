export const GENERATION_TIMEOUT_MS = 2500;

export function timeoutError(label: string) {
  const error = new Error(`${label} timed out`);
  error.name = "TimeoutError";
  return error;
}

export function withTimeout<T>(promise: Promise<T>, ms = GENERATION_TIMEOUT_MS, label = "Request"): Promise<T> {
  let timeoutId: number | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(timeoutError(label)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  });
}

export function runInBackground(label: string, job: Promise<unknown>) {
  job.catch((error) => console.warn(`[${label}] background action failed`, error));
}