import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
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
  const orgName = await getOrganizationSettings()
    .then((org) => org.name || "mitch-risk")
    .catch((err) => {
      console.error(
        "Failed to load organization settings:",
        err instanceof Error ? err.message : String(err),
      );
      return "mitch-risk";
    });
  return {
    title: { template: `%s — ${orgName}`, default: orgName },
    description: "Lightweight third party vendor risk management solution",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appearance = await getAppearanceSettings().catch((err) => {
    console.error(
      "Failed to load appearance settings:",
      err instanceof Error ? err.message : String(err),
    );
    return {
      primaryHex: "",
      secondaryHex: "",
      ragGreenHex: "",
      ragAmberHex: "",
      ragRedHex: "",
      ragUnscoredHex: "",
      borderRadius: 10,
      logoKey: "",
    };
  });
  const faviconUrl = appearance.logoKey
    ? `/api/brand/logo?v=${appearance.logoKey}`
    : "/favicon.ico";
  const nonce = (await headers()).get("x-nonce") ?? undefined;

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
          nonce={nonce}
        >
          <ThemeTokens />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
