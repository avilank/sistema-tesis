"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { MessageBanner } from "@/components/ml/message-banner";
import { useMlDataContext } from "@/components/providers/ml-data-provider";

export default function EdaPage() {
  const tPage = useTranslations("pages.eda");
  const t = useTranslations("dashboard.eda");
  const tCommon = useTranslations("common");
  const { eda, figures, loading, msg } = useMlDataContext();

  return (
    <div className="px-4 py-6 md:px-8">
      <PageHeader title={tPage("title")} description={tPage("description")} />
      <MessageBanner message={msg} />

      {loading ? (
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      ) : (
        <section className="rounded-xl border border-border bg-card/60 p-5">
          <h2 className="text-lg text-foreground mb-3">{t("title")}</h2>
          <p className="text-sm text-muted-foreground mb-3">
            {eda
              ? t("period", {
                  start: eda.periodo.inicio,
                  end: eda.periodo.fin,
                  features: eda.n_features,
                })
              : "—"}
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2">{t("classHeader")}</th>
                <th className="py-2">{t("countHeader")}</th>
              </tr>
            </thead>
            <tbody>
              {eda?.tabla_clases.map((r) => (
                <tr key={r.clase} className="border-b border-border/50">
                  <td className="py-2 text-foreground/90">{r.clase}</td>
                  <td className="py-2 text-foreground font-medium">{r.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {figures.heatmap && (
            <img
              src={figures.heatmap}
              alt="Heatmap"
              className="mt-4 w-full rounded-lg border border-border"
            />
          )}
        </section>
      )}
    </div>
  );
}
