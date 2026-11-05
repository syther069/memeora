import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/providers/wallet-provider";

export const metadata: Metadata = {
  title: "Memeora — Personal Finance with Persistent Memory",
  description:
    "Track spending, manage budgets, and achieve savings goals with a context-aware financial assistant powered by Walrus Memory and Tatum Sui RPC.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090d16",
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
    >
      <body className="min-h-full flex flex-col bg-[var(--surface-base)] text-[var(--ink-body)] font-sans">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
