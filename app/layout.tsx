import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeTokens } from "@/lib/theme-tokens";
import { getAppearanceSettings, getOrganizationSettings } from "@/lib/settings";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const organization = await getOrganizationSettings();
  const orgName = organization.name || "mitch-risk";
  return {
    title: { template: `%s — ${orgName}`, default: orgName },
    description: "Vendor risk management for small businesses",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appearance = await getAppearanceSettings();
  const faviconUrl = appearance.logoKey ? "/api/brand/logo" : "/favicon.ico";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <link rel="icon" href={faviconUrl} />
      </head>
      <body className="min-h-svh antialiased">
        <a
          href="#main-content"
          className="bg-primary text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeTokens />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
