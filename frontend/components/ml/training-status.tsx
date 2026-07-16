"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrainingStatusBanner({ isTrained, bestModel }: { isTrained: boolean; bestModel?: string }) {
  const t = useTranslations("dashboard.summary");

  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex items-start gap-3",
        isTrained ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"
      )}
    >
      {isTrained ? (
        <CheckCircle2 className="size-5 text-emerald-400 shrink-0 mt-0.5" />
      ) : (
        <Clock className="size-5 text-amber-400 shrink-0 mt-0.5" />
      )}
      <div>
        <p className="font-medium text-foreground">
          {isTrained ? t("trained") : t("pending")}
        </p>
        {isTrained && bestModel && (
          <p className="text-sm text-muted-foreground mt-1">{t("bestModelLabel", { model: bestModel })}</p>
        )}
        {!isTrained && (
          <p className="text-sm text-muted-foreground mt-1">{t("pendingHint")}</p>
        )}
      </div>
    </div>
  );
}
