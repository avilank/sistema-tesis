"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { clearToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AppHeader() {
  const t = useTranslations("common");
  const router = useRouter();

  function logout() {
    clearToken();
    router.replace("/");
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
        <Button variant="outline" size="sm" onClick={logout}>
          {t("logout")}
        </Button>
      </div>
    </header>
  );
}
