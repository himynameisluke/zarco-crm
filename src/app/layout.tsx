import type { Metadata } from "next";
import { DM_Serif_Display, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * Brand fonts — Zarco Design System v2 (paper/ink/magenta).
 *
 *   Hanken Grotesk — display + body. The grotesque carries the whole UI.
 *   DM Serif Display — italic-only, used as an editorial accent inside
 *     headlines (<em> inside .t-display). Never sets a full paragraph.
 *   JetBrains Mono — code, IDs, chapter marks, eyebrows, metric figures.
 *
 * CSS var names are consumed by globals.css; renaming requires updating both.
 */
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic", "normal"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Zarco CRM",
  description: "AI-native CRM for UK SMEs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${hanken.variable} ${dmSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
