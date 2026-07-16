"use client";

import { PanelLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { clearToken } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const t = useTranslations("common");
  const router = useRouter();
  const { toggleSidebar } = useSidebar();

  function logout() {
    clearToken();
    router.replace("/");
  }

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <button
        type="button"
        onClick={toggleSidebar}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "-ml-1")}
        aria-label="Toggle sidebar"
      >
        <PanelLeftIcon className="size-4" />
      </button>
      <Separator orientation="vertical" className="mr-1 h-4" />
      <div className="flex-1" />
      <div className="relative z-50 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={logout}
        >
          {t("logout")}
        </button>
      </div>
    </header>
  );
}
