import { getAppearanceSettings } from "@/lib/settings";

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function foregroundFor(hex: string): string {
  return relativeLuminance(hex) > 0.4 ? "oklch(0.205 0 0)" : "oklch(0.985 0 0)";
}

export async function ThemeTokens() {
  const appearance = await getAppearanceSettings().catch(() => ({
    primaryHex: "",
    secondaryHex: "",
    ragGreenHex: "",
    ragAmberHex: "",
    ragRedHex: "",
    ragUnscoredHex: "",
    borderRadius: 10,
    logoKey: "",
  }));
  const {
    primaryHex,
    secondaryHex,
    ragGreenHex,
    ragAmberHex,
    ragRedHex,
    ragUnscoredHex,
    borderRadius,
  } = appearance;

  // Primary/secondary (and their ring/sidebar tokens) are neutral tokens that
  // shadcn inverts between themes — light uses a dark primary, dark uses a light
  // one. Applying a single custom value to both themes makes e.g. a dark brand
  // primary invisible on the dark background (a button that looks like plain
  // text). So the brand neutrals are scoped to light mode (`:root:not(.dark)`),
  // leaving dark mode on shadcn's tuned dark palette. RAG colours and radius are
  // theme-agnostic, so they apply to both.
  const lightOnlyTokens: string[] = [];
  const universalTokens: string[] = [];

  if (primaryHex) {
    lightOnlyTokens.push(`--primary: ${primaryHex};`);
    lightOnlyTokens.push(`--primary-foreground: ${foregroundFor(primaryHex)};`);
    lightOnlyTokens.push(`--ring: ${primaryHex};`);
    lightOnlyTokens.push(`--sidebar-primary: ${primaryHex};`);
    lightOnlyTokens.push(
      `--sidebar-primary-foreground: ${foregroundFor(primaryHex)};`,
    );
  }

  if (secondaryHex) {
    lightOnlyTokens.push(`--secondary: ${secondaryHex};`);
    lightOnlyTokens.push(
      `--secondary-foreground: ${foregroundFor(secondaryHex)};`,
    );
  }

  if (ragGreenHex) universalTokens.push(`--rag-green: ${ragGreenHex};`);
  if (ragAmberHex) universalTokens.push(`--rag-amber: ${ragAmberHex};`);
  if (ragRedHex) universalTokens.push(`--rag-red: ${ragRedHex};`);
  if (ragUnscoredHex)
    universalTokens.push(`--rag-unscored: ${ragUnscoredHex};`);

  universalTokens.push(`--radius: ${borderRadius / 16}rem;`);

  if (lightOnlyTokens.length === 0 && universalTokens.length === 0) {
    return null;
  }

  const css = [
    lightOnlyTokens.length > 0
      ? `:root:not(.dark) { ${lightOnlyTokens.join(" ")} }`
      : "",
    universalTokens.length > 0 ? `:root { ${universalTokens.join(" ")} }` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
