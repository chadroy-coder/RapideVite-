import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";

export const metadata: Metadata = {
  title: "RapideVite — Tout sa w bezwen, rapid vit.",
  description:
    "RapideVite livre epicerie, boissons et produits du quotidien rapidement partout en Haiti.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-brand-ink font-sans">
        <Toaster />
        {children}
      </body>
    </html>
  );
}
