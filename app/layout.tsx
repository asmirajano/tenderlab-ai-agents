import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TenderGlossaryShell } from "./tender-glossary-ui";

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
  title: "TenderLab.ai — Agent Architecture",
  description: "A working 64-agent architecture for the international tender lifecycle, progressively explained and tested against realistic procurement cases.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "TenderLab.ai — Agent Architecture",
    description: "64 current agent roles. 8 functional layers. One architecture under validation.",
    images: [{ url: "/og.png", width: 1664, height: 944 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TenderLab.ai — Agent Architecture",
    description: "64 current agent roles. 8 functional layers. One architecture under validation.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <TenderGlossaryShell>{children}</TenderGlossaryShell>
      </body>
    </html>
  );
}
