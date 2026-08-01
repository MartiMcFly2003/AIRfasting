import type { Metadata } from "next";
import { Cinzel, Inter, DM_Sans } from "next/font/google";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import { Footer } from "@/components/legal/Footer";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  weight: "300",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  weight: "500",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AIRfasting",
  description: "A cycle-aware fasting calendar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${inter.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-obsidian text-ivory">
        {children}
        <Footer />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
