export type ModelMetrics = {
  pr_auc: number;
  roc_auc: number;
  f1: number;
  mcc: number;
  accuracy: number;
  train_seconds: number;
  figures: {
    confusion: string;
    roc: string;
    pr?: string;
  };
};

export type Metrics = {
  best_model: string;
  split: Record<string, unknown>;
  models: Record<string, ModelMetrics>;
  cv: Record<string, unknown>;
  tuning: Record<string, unknown>;
  mcnemar: Record<string, unknown>;
  selection_rule: string;
  figures?: { accuracy_comparison?: string };
  base_models?: string[];
};

export const BASE_MODEL_ORDER = [
  "M1_LogisticRegression",
  "M2_RandomForest",
  "M3_XGBoost",
] as const;

export const BASE_MODEL_LABELS: Record<string, string> = {
  M1_LogisticRegression: "(a) M1 — Regresión Logística",
  M2_RandomForest: "(b) M2 — Random Forest",
  M3_XGBoost: "(c) M3 — XGBoost",
};
