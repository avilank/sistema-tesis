"use client";

import { useTranslations } from "next-intl";

type KpiGridProps = {
  observations?: number;
  vehicles?: number;
  prevalence?: number;
  bestModel?: string | null;
};

export function KpiGrid({ observations, vehicles, prevalence, bestModel }: KpiGridProps) {
  const t = useTranslations("dashboard.kpis");

  const items = [
    { label: t("observations"), value: observations ?? "—" },
    { label: t("vehicles"), value: vehicles ?? "—" },
    { label: t("prevalence"), value: prevalence != null ? `${prevalence}%` : "—" },
    { label: t("bestModel"), value: bestModel ?? t("pending") },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-border bg-card/60 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-xl text-foreground mt-1 break-all">{value}</p>
        </div>
      ))}
    </section>
  );
}
