"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { FigurePanel } from "@/components/ml/figure-panel";
import { MessageBanner } from "@/components/ml/message-banner";
import { BASE_MODEL_LABELS, BASE_MODEL_ORDER } from "@/types/metrics";
import { useMlDataContext } from "@/components/providers/ml-data-provider";

export default function VisualizacionesPage() {
  const tPage = useTranslations("pages.visualizations");
  const t = useTranslations("dashboard.visualizations");
  const tCommon = useTranslations("common");
  const { metrics, figures, loading, msg } = useMlDataContext();

  return (
    <div className="px-4 py-6 md:px-8">
      <PageHeader title={tPage("title")} description={tPage("description")} />
      <MessageBanner message={msg} />

      {loading ? (
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      ) : (
        <section className="rounded-xl border border-border bg-card/60 p-5 space-y-6">
          <div>
            <h2 className="text-lg text-foreground mb-1">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>

          <FigurePanel
            title={t("accuracyTitle")}
            src={figures.accuracy}
            alt={t("accuracyTitle")}
            pending={t("accuracyPending")}
            className="w-full max-w-3xl rounded-lg border border-border bg-white"
          />

          <div>
            <p className="text-sm font-medium text-primary mb-3">{t("confusionTitle")}</p>
            {Object.keys(figures.confusionBase).length === 0 ? (
              <div className="h-40 rounded-lg border border-dashed border-border grid place-items-center text-muted-foreground text-sm">
                {t("confusionPending")}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {BASE_MODEL_ORDER.filter((n) => figures.confusionBase[n]).map((name) => (
                  <div key={name} className="rounded-lg border border-border bg-background/40 p-2">
                    <p className="text-xs text-muted-foreground mb-2 px-1">
                      {BASE_MODEL_LABELS[name] ?? name}
                    </p>
                    <img
                      src={figures.confusionBase[name]}
                      alt={`Matriz confusión ${name}`}
                      className="w-full rounded-md bg-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FigurePanel
              title={t("rocBest", { model: metrics?.best_model ?? "—" })}
              src={figures.roc}
              alt="ROC"
              pending={t("rocPending")}
            />
            <FigurePanel
              title={t("cmBest")}
              src={figures.confusionBest}
              alt="CM best"
              pending={t("cmPending")}
            />
          </div>
        </section>
      )}
    </div>
  );
}
