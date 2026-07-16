"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

type TrainingProgressProps = {
  label: string;
  progress: number;
};

export function TrainingProgress({ label, progress }: TrainingProgressProps) {
  const t = useTranslations("dashboard");

  return (
    <div
      className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-start gap-3">
        <Loader2 className="size-5 shrink-0 text-primary animate-spin mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("trainingProgressHint")}</p>
          </div>
          <Progress value={progress} max={100} className="w-full">
            <ProgressLabel className="sr-only">{label}</ProgressLabel>
            <ProgressValue>
              {(formatted) => formatted ?? `${Math.round(progress)}%`}
            </ProgressValue>
          </Progress>
        </div>
      </div>
    </div>
  );
}
