import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/providers/wallet-provider";

export const metadata: Metadata = {
  title: "Memeora: a finance assistant that remembers",
  description:
    "Track spending, manage budgets, and achieve savings goals with a context-aware financial assistant powered by Walrus Memory and Tatum Sui RPC.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f3f0",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <link rel="preload" href="/fonts/SpaceGrotesk-VariableFont_wght.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--surface-base)] text-[var(--ink-body)] font-sans">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
