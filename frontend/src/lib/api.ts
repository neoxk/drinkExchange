export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

let csrfToken: string | null = null;

/** Nastavi CSRF žeton seje, ki ga API vrne ob prijavi in v /auth/me. */
export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (csrfToken && !SAFE_METHODS.has(init.method ?? "GET")) headers.set("X-CSRF-Token", csrfToken);
  const res = await fetch(`/api${path}`, { ...init, headers, credentials: "same-origin" });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `Napaka ${res.status}`, body?.details);
  }
  return body as T;
}

export const formatEur = (value: string | number) =>
  new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(Number(value));
