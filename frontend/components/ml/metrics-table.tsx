"use client";

import type { Metrics } from "@/types/metrics";
import { useTranslations } from "next-intl";

type MetricsTableProps = {
  metrics: Metrics | null;
  rows: Array<{ name: string; pr_auc: number; roc_auc: number; f1: number; mcc: number; accuracy: number; train_seconds: number }>;
};

export function MetricsTable({ metrics, rows }: MetricsTableProps) {
  const t = useTranslations("dashboard.models");

  if (!metrics) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <>
      <div className="overflow-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2 pr-2">{t("model")}</th>
              <th>PR-AUC</th>
              <th>ROC-AUC</th>
              <th>F1</th>
              <th>MCC</th>
              <th>Acc</th>
              <th>{t("trainSeconds")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.name}
                className={`border-b border-border/50 ${
                  r.name === metrics.best_model ? "bg-primary/10 text-primary" : "text-foreground/90"
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
      </div>
      <p className="text-xs text-muted-foreground mt-3">{metrics.selection_rule}</p>
    </>
  );
}
