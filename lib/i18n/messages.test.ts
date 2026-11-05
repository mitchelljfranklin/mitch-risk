import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import es from "../../messages/es.json";
import fr from "../../messages/fr.json";
import de from "../../messages/de.json";
import pt from "../../messages/pt.json";
import itCatalog from "../../messages/it.json";
import nl from "../../messages/nl.json";
import ja from "../../messages/ja.json";
import ko from "../../messages/ko.json";
import zh from "../../messages/zh.json";
import ar from "../../messages/ar.json";
import hi from "../../messages/hi.json";
import { LOCALES } from "./config";

const CATALOGS: Record<string, unknown> = {
  en,
  es,
  fr,
  de,
  pt,
  it: itCatalog,
  nl,
  ja,
  ko,
  zh,
  ar,
  hi,
};

const PLACEHOLDER_PATTERN = /\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*[,}]/g;

const IMPORT_FIELD_LITERALS = {
  "Templates.import.errors.requiredType": "required",
  "Templates.import.errors.helpTextType": "helpText",
  "Templates.import.errors.optionsType": "options",
  "Templates.import.errors.controlCodesType": "controlCodes",
  "Templates.import.errors.expectedAnswerType": "expectedAnswer",
  "Templates.import.errors.expectedAnswer.multiSelectArray": "expectedAnswer",
  "Templates.import.errors.expectedAnswer.choiceStringOrArray":
    "expectedAnswer",
  "Templates.import.errors.expectedAnswer.numeric": "expectedAnswer",
  "Templates.import.errors.expectedAnswer.yesNoCheckboxString":
    "expectedAnswer",
} as const;

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function readMessage(catalog: unknown, key: string): string {
  let node = catalog;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null || !(part in node)) {
      throw new Error(`Missing message ${key}`);
    }
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== "string")
    throw new Error(`Message ${key} is not a string`);
  return node;
}

function placeholders(value: string): string[] {
  return [
    ...new Set(
      [...value.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]),
    ),
  ].sort();
}

describe("message catalogs", () => {
  it("defines a catalog entry for every configured locale", () => {
    for (const locale of LOCALES) {
      expect(CATALOGS[locale], `missing catalog for ${locale}`).toBeDefined();
    }
  });

  it("keeps every locale in sync with the default catalog", () => {
    const defaultKeys = flattenKeys(CATALOGS.en).sort();
    for (const locale of LOCALES) {
      expect(flattenKeys(CATALOGS[locale]).sort(), `${locale} keys`).toEqual(
        defaultKeys,
      );
    }
  });

  it("preserves every placeholder in every locale", () => {
    const defaultKeys = flattenKeys(CATALOGS.en);
    for (const locale of LOCALES) {
      for (const key of defaultKeys) {
        expect(
          placeholders(readMessage(CATALOGS[locale], key)),
          `${locale}.${key}`,
        ).toEqual(placeholders(readMessage(CATALOGS.en, key)));
      }
    }
  });

  it("keeps import field names literal", () => {
    for (const locale of LOCALES) {
      for (const [key, field] of Object.entries(IMPORT_FIELD_LITERALS)) {
        expect(
          readMessage(CATALOGS[locale], key),
          `${locale}.${key}`,
        ).toContain(field);
      }
    }
  });
});
