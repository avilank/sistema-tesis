"use client";

import { useTranslations } from "next-intl";
import { FileSpreadsheet, FileText, FileType } from "lucide-react";
import { downloadReport } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { MessageBanner } from "@/components/ml/message-banner";
import { useMlDataContext } from "@/components/providers/ml-data-provider";
import { cn } from "@/lib/utils";

const REPORTS = [
  {
    file: "informe_resultados.pdf",
    format: "PDF",
    icon: FileText,
    titleKey: "pdfTitle",
    descKey: "pdfDesc",
    accent: "text-red-400",
  },
  {
    file: "informe_resultados.docx",
    format: "Word",
    icon: FileType,
    titleKey: "wordTitle",
    descKey: "wordDesc",
    accent: "text-blue-400",
  },
  {
    file: "comparativa_modelos.xlsx",
    format: "Excel",
    icon: FileSpreadsheet,
    titleKey: "excelTitle",
    descKey: "excelDesc",
    accent: "text-emerald-400",
  },
] as const;

export default function ReportesPage() {
  const tPage = useTranslations("pages.reports");
  const t = useTranslations("reports");
  const tDash = useTranslations("dashboard.reports");
  const tCommon = useTranslations("common");
  const { loading, msg, setMsg, isTrained, metrics } = useMlDataContext();

  async function handleDownload(file: string) {
    try {
      await downloadReport(file);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("downloadError");
      setMsg(message);
    }
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <PageHeader title={tPage("title")} description={tPage("description")} />
      <MessageBanner message={msg} />

      {!isTrained && !loading && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          {t("requiresTraining")}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {REPORTS.map(({ file, format, icon: Icon, titleKey, descKey, accent }) => (
            <article
              key={file}
              className="rounded-xl border border-border bg-card/60 p-5 flex flex-col gap-4"
            >
              <div className="flex items-start gap-3">
                <div className={cn("rounded-lg border border-border bg-background/60 p-2.5", accent)}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{t(titleKey)}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t(descKey)}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-auto"
                disabled={!isTrained}
                onClick={() => handleDownload(file)}
              >
                {tDash("download", { format })}
              </Button>
            </article>
          ))}
        </div>
      )}

      {isTrained && metrics && (
        <p className="text-xs text-muted-foreground mt-6">
          {tDash("artifact")} · {t("bestModel", { model: metrics.best_model })}
        </p>
      )}
    </div>
  );
}
