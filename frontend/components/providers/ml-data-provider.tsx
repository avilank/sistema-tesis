"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useMlData } from "@/hooks/use-ml-data";

type MlDataContextValue = ReturnType<typeof useMlData>;

const MlDataContext = createContext<MlDataContextValue | null>(null);

export function MlDataProvider({ children }: { children: ReactNode }) {
  const value = useMlData();
  return <MlDataContext.Provider value={value}>{children}</MlDataContext.Provider>;
}

export function useMlDataContext() {
  const ctx = useContext(MlDataContext);
  if (!ctx) {
    throw new Error("useMlDataContext debe usarse dentro de MlDataProvider");
  }
  return ctx;
}
