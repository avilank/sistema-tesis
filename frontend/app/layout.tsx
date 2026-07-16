import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Demo IA — Fallas CMMS",
  description: "Demo del artículo: predicción de fallas no planificadas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
