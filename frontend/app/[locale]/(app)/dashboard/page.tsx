"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowRight, FileDown, Brain } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { KpiGrid } from "@/components/ml/kpi-grid";
import { RiskTable } from "@/components/ml/risk-table";
import { MessageBanner } from "@/components/ml/message-banner";
import { TrainingStatusBanner } from "@/components/ml/training-status";
import { useMlDataContext } from "@/components/providers/ml-data-provider";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const t = useTranslations("pages.dashboard");
  const tRank = useTranslations("dashboard.ranking");
  const tSummary = useTranslations("dashboard.summary");
  const tCommon = useTranslations("common");
  const { eda, metrics, ranking, loading, msg, isTrained } = useMlDataContext();

  const topRisk = ranking.slice(0, 5);

  return (
    <div className="px-4 py-6 md:px-8">
      <PageHeader title={t("title")} description={t("description")} />

      <MessageBanner message={msg} />

      {loading ? (
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      ) : (
        <div className="space-y-6">
          <KpiGrid
            observations={eda?.n_observaciones}
            vehicles={eda?.n_vehiculos}
            prevalence={eda?.prevalencia_global_pct}
            bestModel={metrics?.best_model}
          />

          <TrainingStatusBanner isTrained={isTrained} bestModel={metrics?.best_model} />

          <section className="rounded-xl border border-border bg-card/60 p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-medium text-foreground">{tSummary("topRisk")}</h2>
              {ranking.length > 0 && (
                <Link
                  href="/ranking"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2")}
                >
                  {tSummary("viewAll")}
                  <ArrowRight className="size-4" />
                </Link>
              )}
            </div>
            <RiskTable
              items={topRisk}
              empty={tRank("empty")}
              columns={{
                plate: tRank("plate"),
                prob: tRank("prob"),
                risk: tRank("risk"),
                correctives: tRank("correctives"),
              }}
            />
          </section>

          <div className="flex flex-wrap gap-3">
            <Link href="/modelos" className={cn(buttonVariants(), "gap-2")}>
              <Brain className="size-4" />
              {tSummary("goTrain")}
            </Link>
            <Link href="/reportes" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
              <FileDown className="size-4" />
              {tSummary("goReports")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
