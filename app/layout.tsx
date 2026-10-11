import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = { themeColor: "#182722" };

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  applicationName: "Steady",
  title: "Steady — Your daily progress",
  description: "Your private daily workspace for PhD applications, CSIR NET preparation, and research.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
