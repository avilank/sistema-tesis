"use client";

import {
  AlertTriangle,
  BarChart3,
  Brain,
  Database,
  FileDown,
  LayoutDashboard,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/dashboard" as const, labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/eda" as const, labelKey: "eda", icon: Database },
  { href: "/modelos" as const, labelKey: "models", icon: Brain },
  { href: "/visualizaciones" as const, labelKey: "visualizations", icon: BarChart3 },
  { href: "/ranking" as const, labelKey: "ranking", icon: AlertTriangle },
  { href: "/reportes" as const, labelKey: "reports", icon: FileDown },
];

export function AppSidebar() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="p-4">
        <div className="group-data-[collapsible=icon]:hidden">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{tCommon("brand")}</p>
          <p className="mt-1 text-sm font-medium leading-tight">{tCommon("appName")}</p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("section")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, labelKey, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                const label = t(labelKey);

                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={label}
                      render={<Link href={href} />}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
        <p className="text-xs text-muted-foreground">{tCommon("brand")}</p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
