"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await login(username, password);
      setToken(data.access_token);
      router.push("/dashboard");
    } catch {
      setError("Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur">
        <p className="text-sky-300 text-sm tracking-[0.2em] uppercase mb-2">Yamboly · Demo tesis</p>
        <h1 className="font-display text-3xl text-white mb-2">Predicción de fallas CMMS</h1>
        <p className="text-slate-400 text-sm mb-8">
          Accede al laboratorio: EDA, 5 modelos, CV, tuning, McNemar y reportes.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm text-slate-300">
            Usuario
            <input
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-sky-400"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="block text-sm text-slate-300">
            Contraseña
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-sky-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          <button
            disabled={loading}
            className="w-full rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold py-2.5 transition disabled:opacity-60"
          >
            {loading ? "Validando…" : "Entrar al dashboard"}
          </button>
        </form>
        <p className="mt-6 text-xs text-slate-500">Demo: admin / admin123</p>
      </div>
    </main>
  );
}
