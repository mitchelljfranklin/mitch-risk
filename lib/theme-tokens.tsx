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
  const appearance = await getAppearanceSettings();
  const {
    primaryHex,
    secondaryHex,
    ragGreenHex,
    ragAmberHex,
    ragRedHex,
    ragUnscoredHex,
    borderRadius,
  } = appearance;

  const tokens: string[] = [];

  if (primaryHex) {
    tokens.push(`--primary: ${primaryHex};`);
    tokens.push(`--primary-foreground: ${foregroundFor(primaryHex)};`);
    tokens.push(`--ring: ${primaryHex};`);
    tokens.push(`--sidebar-primary: ${primaryHex};`);
    tokens.push(`--sidebar-primary-foreground: ${foregroundFor(primaryHex)};`);
  }

  if (secondaryHex) {
    tokens.push(`--secondary: ${secondaryHex};`);
    tokens.push(`--secondary-foreground: ${foregroundFor(secondaryHex)};`);
  }

  if (ragGreenHex) tokens.push(`--rag-green: ${ragGreenHex};`);
  if (ragAmberHex) tokens.push(`--rag-amber: ${ragAmberHex};`);
  if (ragRedHex) tokens.push(`--rag-red: ${ragRedHex};`);
  if (ragUnscoredHex) tokens.push(`--rag-unscored: ${ragUnscoredHex};`);

  tokens.push(`--radius: ${borderRadius / 16}rem;`);

  if (tokens.length === 0) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root { ${tokens.join(" ")} }`,
      }}
    />
  );
}
