const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const POLL_INTERVAL_MS = 2500;
const POLL_MAX_WAIT_MS = 20 * 60 * 1000;

function networkErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Error de red";
  const msg = err.message.toLowerCase();
  if (
    err.name === "AbortError" ||
    msg.includes("aborted") ||
    msg.includes("timeout")
  ) {
    return "El entrenamiento tardó demasiado. Revisa los logs del backend o intenta de nuevo.";
  }
  if (msg.includes("failed to fetch") || msg.includes("networkerror")) {
    return "No se pudo conectar con el backend. Verifica que el servicio esté activo y NEXT_PUBLIC_API_URL.";
  }
  return err.message;
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  timeoutMs?: number,
): Promise<T> {
  const controller = timeoutMs ? new AbortController() : null;
  const timer =
    controller &&
    setTimeout(() => {
      controller.abort();
    }, timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller?.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Error ${res.status}`);
    }
    return res.json();
  } catch (err) {
    throw new Error(networkErrorMessage(err));
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export async function login(username: string, password: string) {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error("Login fallido");
  return res.json();
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const token = getToken();
  return fetchJson<T>(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
}

export async function apiPost<T = any>(path: string): Promise<T> {
  const token = getToken();
  return fetchJson<T>(`${API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollTrainStatus<T extends { status: string }>(
  onTick?: (status: T) => void,
): Promise<T> {
  const started = Date.now();
  for (;;) {
    const status = await apiGet<T>("/api/train/status");
    onTick?.(status);
    if (status.status === "completed" || status.status === "failed") {
      return status;
    }
    if (status.status === "idle" && Date.now() - started > POLL_INTERVAL_MS * 2) {
      return status;
    }
    if (Date.now() - started > POLL_MAX_WAIT_MS) {
      throw new Error("El entrenamiento tardó demasiado. Revisa los logs del backend.");
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

export function figureUrl(name: string) {
  const token = getToken();
  return `${API_URL}/api/figures/${name}?token_hint=1#${token || ""}`;
}

export function reportUrl(name: string) {
  return `${API_URL}/api/reports/${name}`;
}

export async function downloadReport(name: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/reports/${name}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("No se pudo descargar");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchFigureBlob(name: string): Promise<string> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/figures/${name}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Figura no disponible");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export { API_URL };
