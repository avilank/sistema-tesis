"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { RiskTable } from "@/components/ml/risk-table";
import { MessageBanner } from "@/components/ml/message-banner";
import { Button } from "@/components/ui/button";
import { useMlDataContext } from "@/components/providers/ml-data-provider";
import { cn } from "@/lib/utils";

const TOP_OPTIONS = [12, 24, 50] as const;

export default function RankingPage() {
  const tPage = useTranslations("pages.ranking");
  const t = useTranslations("dashboard.ranking");
  const tCommon = useTranslations("common");
  const { ranking, loading, msg, setMsg, isTrained, loadRanking } = useMlDataContext();
  const [topN, setTopN] = useState<(typeof TOP_OPTIONS)[number]>(12);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!isTrained) return;
    setFetching(true);
    loadRanking(topN)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : tCommon("loading");
        setMsg(message);
      })
      .finally(() => setFetching(false));
  }, [topN, isTrained, loadRanking, setMsg, tCommon]);

  return (
    <div className="px-4 py-6 md:px-8">
      <PageHeader title={tPage("title")} description={tPage("description")} />
      <MessageBanner message={msg} />

      <section className="rounded-xl border border-border bg-card/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg text-foreground">{t("title")}</h2>
          <div className="flex gap-2">
            {TOP_OPTIONS.map((n) => (
              <Button
                key={n}
                variant="outline"
                size="sm"
                disabled={!isTrained || fetching}
                className={cn(topN === n && "border-primary text-primary")}
                onClick={() => setTopN(n)}
              >
                Top {n}
              </Button>
            ))}
          </div>
        </div>

        {loading || fetching ? (
          <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
        ) : (
          <RiskTable
            items={ranking}
            empty={t("empty")}
            columns={{
              plate: t("plate"),
              prob: t("prob"),
              risk: t("risk"),
              correctives: t("correctives"),
            }}
          />
        )}
      </section>
    </div>
  );
}
