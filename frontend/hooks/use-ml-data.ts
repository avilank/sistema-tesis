"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { apiGet, apiPost, fetchFigureBlob } from "@/lib/api";
import { getCachedFigure, setCachedFigure } from "@/lib/figure-cache";
import type { Eda } from "@/types/eda";
import type { Metrics } from "@/types/metrics";
import { BASE_MODEL_ORDER } from "@/types/metrics";
import type { RankingItem } from "@/types/ranking";

export type FigureSet = {
  heatmap: string | null;
  accuracy: string | null;
  roc: string | null;
  confusionBest: string | null;
  confusionBase: Record<string, string>;
};

const emptyFigures = (): FigureSet => ({
  heatmap: null,
  accuracy: null,
  roc: null,
  confusionBest: null,
  confusionBase: {},
});

async function loadFigure(name: string): Promise<string | null> {
  const cached = getCachedFigure(name);
  if (cached) return cached;
  try {
    const url = await fetchFigureBlob(name);
    setCachedFigure(name, url);
    return url;
  } catch {
    return null;
  }
}

export function useMlData() {
  const t = useTranslations("dashboard");
  const [eda, setEda] = useState<Eda | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [figures, setFigures] = useState<FigureSet>(emptyFigures);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const loadFigures = useCallback(async (e: Eda, m: Metrics) => {
    const heatmap = await loadFigure(e.figuras.heatmap);
    const best = m.best_model;
    const roc = m.models[best] ? await loadFigure(m.models[best].figures.roc) : null;
    const confusionBest = m.models[best]
      ? await loadFigure(m.models[best].figures.confusion)
      : null;
    const accFile = m.figures?.accuracy_comparison || "accuracy_comparison.png";
    const accuracy = await loadFigure(accFile);

    const baseNames =
      m.base_models?.length ? m.base_models : BASE_MODEL_ORDER.filter((n) => m.models[n]);
    const confusionBase: Record<string, string> = {};
    for (const name of baseNames) {
      const file = m.models[name]?.figures?.confusion;
      if (!file) continue;
      const url = await loadFigure(file);
      if (url) confusionBase[name] = url;
    }

    setFigures({ heatmap, accuracy, roc, confusionBest, confusionBase });
  }, []);

  const loadRanking = useCallback(async (topN = 12) => {
    const r = await apiGet<{ items: RankingItem[] }>(`/api/predict/ranking?top_n=${topN}`);
    setRanking(r.items);
    return r.items;
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const e = await apiGet<Eda>("/api/eda");
      setEda(e);
      try {
        const m = await apiGet<Metrics>("/api/metrics");
        setMetrics(m);
        await loadFigures(e, m);
        await loadRanking(12);
      } catch {
        setMetrics(null);
        setFigures(emptyFigures());
        setRanking([]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("loadError");
      setMsg(message);
    } finally {
      setLoading(false);
    }
  }, [loadFigures, loadRanking, t]);

  const runTrain = useCallback(async () => {
    setBusy(true);
    setMsg(t("trainingMsg"));
    try {
      const m = await apiPost<Metrics>("/api/train?n_folds=5&do_tuning=true");
      setMetrics(m);
      const e = await apiGet<Eda>("/api/eda");
      setEda(e);
      await loadFigures(e, m);
      await loadRanking(12);
      setMsg(t("trainingDone", { model: m.best_model }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("trainingError");
      setMsg(message);
    } finally {
      setBusy(false);
    }
  }, [loadFigures, loadRanking, t]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const modelRows = useMemo(() => {
    if (!metrics) return [];
    return Object.entries(metrics.models).map(([name, m]) => ({ name, ...m }));
  }, [metrics]);

  const isTrained = !!metrics;

  return {
    eda,
    metrics,
    ranking,
    figures,
    modelRows,
    loading,
    busy,
    msg,
    setMsg,
    isTrained,
    runTrain,
    loadRanking,
    refresh: bootstrap,
  };
}
