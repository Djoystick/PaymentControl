import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import { TelegramMiniAppProvider } from "@/components/telegram/telegram-mini-app-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Payment Control Mini App",
  description:
    "Phase 0 foundation for a Telegram Mini App for recurring payments and subscriptions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${manrope.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-app-bg text-app-text">
        <TelegramMiniAppProvider>{children}</TelegramMiniAppProvider>
      </body>
    </html>
  );
}
