"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { getToken } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { MlDataProvider } from "@/components/providers/ml-data-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
    }
  }, [router]);

  return (
    <MlDataProvider>
      <AppShell>{children}</AppShell>
    </MlDataProvider>
  );
}
