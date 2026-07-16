"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiGet,
  apiPost,
  clearToken,
  downloadReport,
  fetchFigureBlob,
  getToken,
} from "@/lib/api";

type Eda = {
  n_observaciones: number;
  n_vehiculos: number;
  n_features: number;
  prevalencia_global_pct: number;
  periodo: { inicio: string; fin: string };
  tabla_clases: { clase: string; n: number }[];
  figuras: { heatmap: string };
};

type Metrics = {
  best_model: string;
  split: any;
  models: Record<string, any>;
  cv: any;
  tuning: any;
  mcnemar: Record<string, any>;
  selection_rule: string;
  figures?: { accuracy_comparison?: string };
  base_models?: string[];
};

const BASE_MODEL_ORDER = ["M1_LogisticRegression", "M2_RandomForest", "M3_XGBoost"];

export default function DashboardPage() {
  const router = useRouter();
  const [eda, setEda] = useState<Eda | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [heatUrl, setHeatUrl] = useState<string | null>(null);
  const [rocUrl, setRocUrl] = useState<string | null>(null);
  const [cmUrl, setCmUrl] = useState<string | null>(null);
  const [accUrl, setAccUrl] = useState<string | null>(null);
  const [baseCmUrls, setBaseCmUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    void bootstrap();
  }, [router]);

  async function bootstrap() {
    try {
      const e = await apiGet<Eda>("/api/eda");
      setEda(e);
      try {
        const m = await apiGet<Metrics>("/api/metrics");
        setMetrics(m);
        await loadFigures(e, m);
        const r = await apiGet<{ items: any[] }>("/api/predict/ranking?top_n=12");
        setRanking(r.items);
      } catch {
        // aún no entrenado
      }
    } catch (err: any) {
      setMsg(err.message || "Error al cargar");
    }
  }

  async function loadFigures(e: Eda, m: Metrics) {
    try {
      setHeatUrl(await fetchFigureBlob(e.figuras.heatmap));
      const best = m.best_model;
      setRocUrl(await fetchFigureBlob(m.models[best].figures.roc));
      setCmUrl(await fetchFigureBlob(m.models[best].figures.confusion));

      const accFile = m.figures?.accuracy_comparison || "accuracy_comparison.png";
      try {
        setAccUrl(await fetchFigureBlob(accFile));
      } catch {
        setAccUrl(null);
      }

      const baseNames =
        m.base_models?.length
          ? m.base_models
          : BASE_MODEL_ORDER.filter((n) => m.models[n]);
      const cms: Record<string, string> = {};
      for (const name of baseNames) {
        const file = m.models[name]?.figures?.confusion;
        if (!file) continue;
        try {
          cms[name] = await fetchFigureBlob(file);
        } catch {
          /* ignore */
        }
      }
      setBaseCmUrls(cms);
    } catch {
      /* ignore */
    }
  }

  async function runTrain() {
    setBusy(true);
    setMsg("Entrenando 5 modelos (puede tomar 1–3 min)…");
    try {
      const m = await apiPost<Metrics>("/api/train?n_folds=5&do_tuning=true");
      setMetrics(m);
      const e = await apiGet<Eda>("/api/eda");
      setEda(e);
      await loadFigures(e, m);
      const r = await apiGet<{ items: any[] }>("/api/predict/ranking?top_n=12");
      setRanking(r.items);
      setMsg(`Listo. Mejor modelo: ${m.best_model}`);
    } catch (err: any) {
      setMsg(err.message || "Fallo el entrenamiento");
    } finally {
      setBusy(false);
    }
  }

  const rows = useMemo(() => {
    if (!metrics) return [];
    return Object.entries(metrics.models).map(([name, m]) => ({ name, ...m }));
  }, [metrics]);

  const baseModelLabels: Record<string, string> = {
    M1_LogisticRegression: "(a) M1 — Regresión Logística",
    M2_RandomForest: "(b) M2 — Random Forest",
    M3_XGBoost: "(c) M3 — XGBoost",
  };

  function logout() {
    clearToken();
    router.replace("/");
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sky-300 text-xs tracking-[0.25em] uppercase">Demo rápida · artículo CMMS</p>
          <h1 className="font-display text-3xl md:text-4xl text-white">Laboratorio de predicción de fallas</h1>
          <p className="text-slate-400 text-sm mt-1">
            Secuencia: EDA → Entrenamiento (3+2) → Figuras → Reportes → Ranking
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runTrain}
            disabled={busy}
            className="rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-4 py-2 disabled:opacity-60"
          >
            {busy ? "Entrenando…" : metrics ? "Re-entrenar" : "Entrenar modelos"}
          </button>
          <button onClick={logout} className="rounded-lg border border-white/15 px-4 py-2 text-slate-200">
            Salir
          </button>
        </div>
      </header>

      {msg && (
        <div className="mb-4 rounded-lg border border-sky-400/30 bg-sky-950/40 px-4 py-3 text-sm text-sky-100">
          {msg}
        </div>
      )}

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          ["Observaciones", eda?.n_observaciones ?? "—"],
          ["Vehículos", eda?.n_vehiculos ?? "—"],
          ["Prevalencia y=1", eda ? `${eda.prevalencia_global_pct}%` : "—"],
          ["Mejor modelo", metrics?.best_model ?? "Pendiente"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{k}</p>
            <p className="text-xl text-white mt-1 break-all">{v}</p>
          </div>
        ))}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* EDA */}
        <section className="rounded-xl border border-white/10 bg-slate-950/50 p-5">
          <h2 className="text-lg text-white mb-3">1. EDA — Tabla 1 (clases)</h2>
          <p className="text-sm text-slate-400 mb-3">
            Periodo {eda?.periodo.inicio} → {eda?.periodo.fin} · {eda?.n_features} features tabulares
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10">
                <th className="py-2">Clases</th>
                <th className="py-2">Número de registros</th>
              </tr>
            </thead>
            <tbody>
              {eda?.tabla_clases.map((r) => (
                <tr key={r.clase} className="border-b border-white/5">
                  <td className="py-2 text-slate-200">{r.clase}</td>
                  <td className="py-2 text-white font-medium">{r.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {heatUrl && (
            <img src={heatUrl} alt="Heatmap" className="mt-4 w-full rounded-lg border border-white/10" />
          )}
        </section>

        {/* Comparativa */}
        <section className="rounded-xl border border-white/10 bg-slate-950/50 p-5 overflow-auto">
          <h2 className="text-lg text-white mb-3">2. Entrenamiento — comparativa</h2>
          {!metrics ? (
            <p className="text-slate-400 text-sm">Pulsa “Entrenar modelos” para generar métricas y figuras.</p>
          ) : (
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-white/10">
                  <th className="py-2 pr-2">Modelo</th>
                  <th>PR-AUC</th>
                  <th>ROC-AUC</th>
                  <th>F1</th>
                  <th>MCC</th>
                  <th>Acc</th>
                  <th>s</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.name}
                    className={`border-b border-white/5 ${
                      r.name === metrics.best_model ? "bg-sky-500/10 text-sky-100" : "text-slate-200"
                    }`}
                  >
                    <td className="py-2 pr-2 font-medium">{r.name}</td>
                    <td>{r.pr_auc.toFixed(3)}</td>
                    <td>{r.roc_auc.toFixed(3)}</td>
                    <td>{r.f1.toFixed(3)}</td>
                    <td>{r.mcc.toFixed(3)}</td>
                    <td>{r.accuracy.toFixed(3)}</td>
                    <td>{r.train_seconds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-slate-500 mt-3">{metrics?.selection_rule}</p>
        </section>

        {/* Figuras análisis */}
        <section className="rounded-xl border border-white/10 bg-slate-950/50 p-5 lg:col-span-2">
          <h2 className="text-lg text-white mb-1">Análisis visual de modelos</h2>
          <p className="text-sm text-slate-400 mb-4">
            Comparación de accuracy (todos) y matrices de confusión de los 3 modelos base (M1–M3). Clases: Sin falla / Falla.
          </p>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-sky-200 mb-2">
              Comparación de Accuracy entre Modelos
            </h3>
            {accUrl ? (
              <img
                src={accUrl}
                alt="Comparación de accuracy"
                className="w-full max-w-3xl rounded-lg border border-white/10 bg-white"
              />
            ) : (
              <div className="h-40 rounded-lg border border-dashed border-white/15 grid place-items-center text-slate-500 text-sm">
                Gráfico de accuracy pendiente — entrena o reinicia el backend si ya hay métricas
              </div>
            )}
          </div>

          <h3 className="text-sm font-medium text-sky-200 mb-2">
            Matrices de confusión — modelos base
          </h3>
          {Object.keys(baseCmUrls).length === 0 ? (
            <div className="h-40 rounded-lg border border-dashed border-white/15 grid place-items-center text-slate-500 text-sm">
              Matrices pendientes de entrenamiento
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {BASE_MODEL_ORDER.filter((n) => baseCmUrls[n]).map((name) => (
                <div key={name} className="rounded-lg border border-white/10 bg-black/20 p-2">
                  <p className="text-xs text-slate-300 mb-2 px-1">
                    {baseModelLabels[name] ?? name}
                  </p>
                  <img
                    src={baseCmUrls[name]}
                    alt={`Matriz confusión ${name}`}
                    className="w-full rounded-md bg-white"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-400 mb-2">ROC del mejor modelo ({metrics?.best_model ?? "—"})</p>
              {rocUrl ? (
                <img src={rocUrl} alt="ROC" className="rounded-lg border border-white/10 w-full bg-white" />
              ) : (
                <div className="h-40 rounded-lg border border-dashed border-white/15 grid place-items-center text-slate-500 text-sm">
                  ROC pendiente
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2">Matriz del mejor modelo</p>
              {cmUrl ? (
                <img src={cmUrl} alt="CM best" className="rounded-lg border border-white/10 w-full bg-white" />
              ) : (
                <div className="h-40 rounded-lg border border-dashed border-white/15 grid place-items-center text-slate-500 text-sm">
                  Matriz pendiente
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Ranking + reports */}
      <section className="mt-6 grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5">
          <h2 className="text-lg text-white mb-3">Ranking de riesgo (modelo guardado .joblib)</h2>
          {!ranking.length ? (
            <p className="text-sm text-slate-500">Entrena para generar predicciones sin reentrenar.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-white/10">
                  <th className="py-2">Placa</th>
                  <th>Prob.</th>
                  <th>Riesgo</th>
                  <th>Corr.90d</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r) => (
                  <tr key={r.vehicle_id} className="border-b border-white/5 text-slate-200">
                    <td className="py-2">{r.placa}</td>
                    <td>{Number(r.prob_falla_30d).toFixed(3)}</td>
                    <td
                      className={
                        r.riesgo === "alto"
                          ? "text-rose-300"
                          : r.riesgo === "medio"
                            ? "text-amber-300"
                            : "text-emerald-300"
                      }
                    >
                      {r.riesgo}
                    </td>
                    <td>{r.correctivos_90d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5">
          <h2 className="text-lg text-white mb-3">6. Reportes</h2>
          <p className="text-sm text-slate-400 mb-4">
            PDF, Word y Excel con tablas e interpretación. Se generan al entrenar.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              ["informe_resultados.pdf", "PDF"],
              ["informe_resultados.docx", "Word"],
              ["comparativa_modelos.xlsx", "Excel"],
            ].map(([file, label]) => (
              <button
                key={file}
                disabled={!metrics}
                onClick={() => downloadReport(file).catch((e) => setMsg(String(e.message || e)))}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-40"
              >
                Descargar {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Artefacto del mejor modelo: <code>backend/artifacts/best_model.joblib</code>
          </p>
        </div>
      </section>
    </main>
  );
}
