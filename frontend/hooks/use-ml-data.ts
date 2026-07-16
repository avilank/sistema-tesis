"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { TrainJobStatus } from "@/types/train";
import { apiGet, apiPost, fetchFigureBlob, pollTrainStatus } from "@/lib/api";
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

const TRAIN_STEP_KEYS = [
  "preparing_data",
  "cross_validation",
  "hyperparameter_tuning",
  "statistical_tests",
  "generating_reports",
  "done",
] as const;

function formatTrainStep(
  step: string,
  progress: number,
  t: ReturnType<typeof useTranslations>,
): string {
  if (step.startsWith("training_model:")) {
    const model = step.slice("training_model:".length);
    return t("trainingStepModel", { model, progress });
  }
  if ((TRAIN_STEP_KEYS as readonly string[]).includes(step)) {
    return t(`trainingStep.${step}` as "trainingStep.preparing_data", { progress });
  }
  return t("trainingPolling", { progress });
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
  const [trainProgress, setTrainProgress] = useState<number | null>(null);

  const updateTrainStatus = useCallback(
    (step: string, progress: number) => {
      setTrainProgress(progress);
      setMsg(formatTrainStep(step || "preparing_data", progress, t));
    },
    [t],
  );

  const clearTrainStatus = useCallback(() => {
    setTrainProgress(null);
  }, []);

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

  const finishAfterTrain = useCallback(async () => {
    const m = await apiGet<Metrics>("/api/metrics");
    setMetrics(m);
    const e = await apiGet<Eda>("/api/eda");
    setEda(e);
    await loadFigures(e, m);
    await loadRanking(12);
    setMsg(t("trainingDone", { model: m.best_model }));
    return m;
  }, [loadFigures, loadRanking, t]);

  const waitForTrain = useCallback(async () => {
    const finalStatus = await pollTrainStatus<TrainJobStatus>((status) => {
      if (status.status === "running") {
        updateTrainStatus(status.step || "preparing_data", status.progress);
      }
    });
    if (finalStatus.status === "failed") {
      throw new Error(finalStatus.error || t("trainingError"));
    }
    if (finalStatus.status !== "completed") {
      throw new Error(t("trainingError"));
    }
    return finishAfterTrain();
  }, [finishAfterTrain, t, updateTrainStatus]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const trainStatus = await apiGet<TrainJobStatus>("/api/train/status");
      if (trainStatus.status === "running") {
        setBusy(true);
        updateTrainStatus(trainStatus.step || "preparing_data", trainStatus.progress);
        try {
          await waitForTrain();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : t("trainingError");
          setMsg(message);
        } finally {
          setBusy(false);
          clearTrainStatus();
        }
        return;
      }

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
  }, [clearTrainStatus, loadFigures, loadRanking, t, updateTrainStatus, waitForTrain]);

  const runTrain = useCallback(async () => {
    setBusy(true);
    setTrainProgress(0);
    setMsg(t("trainingMsg"));
    try {
      await apiPost("/api/train?n_folds=5&do_tuning=true");
      await waitForTrain();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("trainingError");
      setMsg(message);
    } finally {
      setBusy(false);
      clearTrainStatus();
    }
  }, [clearTrainStatus, t, waitForTrain]);

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
    trainProgress,
    setMsg,
    isTrained,
    runTrain,
    loadRanking,
    refresh: bootstrap,
  };
}
