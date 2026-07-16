"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { login, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await login(username, password);
      setToken(data.access_token);
      router.push("/dashboard");
    } catch {
      setError(t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="fixed top-4 right-4 flex items-center gap-2 z-10">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md border-border/60 bg-card/80 shadow-2xl backdrop-blur">
        <CardHeader>
          <p className="text-primary text-sm tracking-[0.2em] uppercase">{tCommon("brand")}</p>
          <CardTitle className="font-display text-3xl">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm text-muted-foreground">
              {t("username")}
              <input
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
            <label className="block text-sm text-muted-foreground">
              {t("password")}
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full h-10">
              {loading ? t("validating") : t("submit")}
            </Button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground">{t("demoHint")}</p>
        </CardContent>
      </Card>
    </main>
  );
}
