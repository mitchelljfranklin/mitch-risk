import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
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
  const [org, appearance] = await Promise.all([
    getOrganizationSettings(),
    getAppearanceSettings(),
  ]).catch((err) => {
    console.error(
      "Failed to load settings for metadata:",
      err instanceof Error ? err.message : String(err),
    );
    return [{ name: "mitch-risk" }, { logoKey: "" }] as const;
  });

  const t = await getTranslations("Metadata");
  const orgName = org.name || "mitch-risk";
  const icons = appearance.logoKey
    ? [{ url: `/api/brand/logo?v=${appearance.logoKey}` }]
    : [{ url: "/favicon.ico" }];

  return {
    title: { template: `%s — ${orgName}`, default: orgName },
    description: t("description"),
    icons,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("Common");

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-svh antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <a
            href="#main-content"
            className="bg-primary text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-4 focus:py-2"
          >
            {t("skipToContent")}
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
