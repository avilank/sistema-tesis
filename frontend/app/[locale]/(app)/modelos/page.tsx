"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { MetricsTable } from "@/components/ml/metrics-table";
import { MessageBanner } from "@/components/ml/message-banner";
import { TrainingProgress } from "@/components/ml/training-progress";
import { useMlDataContext } from "@/components/providers/ml-data-provider";

export default function ModelosPage() {
  const tPage = useTranslations("pages.models");
  const t = useTranslations("dashboard.models");
  const tCommon = useTranslations("common");
  const { metrics, modelRows, loading, busy, msg, trainProgress, isTrained, runTrain } =
    useMlDataContext();

  return (
    <div className="px-4 py-6 md:px-8">
      <PageHeader
        title={tPage("title")}
        description={tPage("description")}
        actions={
          <Button onClick={runTrain} disabled={busy || loading}>
            {busy ? tCommon("training") : isTrained ? tCommon("retrain") : tCommon("train")}
          </Button>
        }
      />
      {trainProgress !== null ? (
        <TrainingProgress label={msg || tCommon("training")} progress={trainProgress} />
      ) : (
        <MessageBanner message={msg} />
      )}

      <section className="rounded-xl border border-border bg-card/60 p-5">
        <h2 className="text-lg text-foreground mb-4">{t("title")}</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
        ) : (
          <MetricsTable metrics={metrics} rows={modelRows} />
        )}
      </section>
    </div>
  );
}
