import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PulseBite | Restaurant OS",
  description:
    "Modern restaurant ordering system with an admin dashboard, kitchen monitor, and customer menu.",
  metadataBase: new URL("https://restaurant.example.com"),
  openGraph: {
    title: "PulseBite | Restaurant OS",
    description:
      "Beautifully-crafted restaurant ordering system for admins, kitchens, and guests.",
    url: "https://restaurant.example.com",
    siteName: "PulseBite",
    images: [
      {
        url: "https://restaurant.example.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "PulseBite restaurant platform preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PulseBite | Restaurant OS",
    description:
      "Beautifully-crafted restaurant ordering system for admins, kitchens, and guests.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative min-h-screen overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-80">
              <div className="absolute -left-1/2 top-0 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_center,theme(colors.orange.300),transparent_60%)] blur-3xl" />
              <div className="absolute bottom-0 -right-1/3 h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(circle_at_center,theme(colors.fuchsia.400),transparent_60%)] blur-3xl" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10" />
            </div>
            <div className="relative">{children}</div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

