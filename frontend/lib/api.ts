const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T = any>(path: string, query = ""): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}${query}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
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
