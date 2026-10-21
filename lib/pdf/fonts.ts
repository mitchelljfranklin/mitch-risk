import path from "node:path";

import { Font } from "@react-pdf/renderer";

export type PdfFontFamily =
  | "NotoSans"
  | "NotoSansArabic"
  | "NotoSansDevanagari"
  | "NotoSansJP"
  | "NotoSansKR"
  | "NotoSansSC";

const FONT_DIR = path.join(process.cwd(), "lib", "pdf", "fonts");

function fontPath(filename: string): string {
  return path.join(FONT_DIR, filename);
}

let registered = false;

export function registerPdfFonts(): void {
  if (registered) return;

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: fontPath("NotoSans-Regular.ttf"), fontWeight: "normal" },
      { src: fontPath("NotoSans-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  Font.register({
    family: "NotoSansArabic",
    fonts: [
      { src: fontPath("NotoSansArabic-Regular.ttf"), fontWeight: "normal" },
      { src: fontPath("NotoSansArabic-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  Font.register({
    family: "NotoSansDevanagari",
    fonts: [
      { src: fontPath("NotoSansDevanagari-Regular.ttf"), fontWeight: "normal" },
      { src: fontPath("NotoSansDevanagari-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  Font.register({
    family: "NotoSansJP",
    fonts: [
      { src: fontPath("NotoSansJP-Regular.otf"), fontWeight: "normal" },
      { src: fontPath("NotoSansJP-Bold.otf"), fontWeight: "bold" },
    ],
  });
  Font.register({
    family: "NotoSansKR",
    fonts: [
      { src: fontPath("NotoSansKR-Regular.otf"), fontWeight: "normal" },
      { src: fontPath("NotoSansKR-Bold.otf"), fontWeight: "bold" },
    ],
  });
  Font.register({
    family: "NotoSansSC",
    fonts: [
      { src: fontPath("NotoSansSC-Regular.otf"), fontWeight: "normal" },
      { src: fontPath("NotoSansSC-Bold.otf"), fontWeight: "bold" },
    ],
  });

  registered = true;
}

export function pdfFontFamily(locale: string): PdfFontFamily {
  const base = locale.split("-")[0]?.toLowerCase() ?? "en";
  switch (base) {
    case "ar":
      return "NotoSansArabic";
    case "hi":
      return "NotoSansDevanagari";
    case "ja":
      return "NotoSansJP";
    case "ko":
      return "NotoSansKR";
    case "zh":
      return "NotoSansSC";
    default:
      return "NotoSans";
  }
}
