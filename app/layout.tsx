import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tenderlab-ai-agents.web.app"),
  title: "TenderLab.ai — Agent Command Center",
  description: "64 AI agents coordinating the full international tender lifecycle.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "TenderLab.ai — Agent Command Center",
    description: "64 AI agents. 8 operational layers. One tender operating system.",
    images: [{ url: "/og.png", width: 1664, height: 944 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TenderLab.ai — Agent Command Center",
    description: "64 AI agents. 8 operational layers. One tender operating system.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
