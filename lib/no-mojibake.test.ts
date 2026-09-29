import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// UTF-8 text that passes through a Windows-1252 decoding round-trip picks up
// "mojibake" lead characters (the A-circumflex/accented-A family) immediately
// followed by punctuation-range characters. This has bitten real source files
// before - a due-date placeholder in the assessments table rendered as three
// garbled characters instead of an em-dash - so the whole class is banned.
// Scripted repairs have also accidentally written the ESCAPE SEQUENCE text
// (backslash-u-2014) into JSX attributes, which browsers render verbatim, so
// escaped forms of the glyphs this codebase actually uses are banned too.

const MOJIBAKE_PATTERN =
  /[\u00C2\u00E2\u00C3\u00C5][\u0080-\u00BF\u20AC\u201A\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013—\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/;

const GLYPHS = ["00B7", "2014", "2190", "2192"];
const ESCAPED_GLYPH_PATTERN = new RegExp(
  "\\\\u(?:" + GLYPHS.join("|") + ")\\b",
  "i",
);

const SCAN_ROOTS = [
  "app",
  "components",
  "emails",
  "hooks",
  "lib",
  "docs",
  "scripts",
];
const SCANNED_EXTENSIONS = [".ts", ".tsx", ".md", ".mjs", ".cjs"];
const SKIPPED_SEGMENTS = new Set([
  "generated",
  "node_modules",
  ".next",
  "dist",
  "cache",
  ".vitepress",
  "test-results",
  ".storage",
]);

function collectSourceFiles(directory: string, files: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (SKIPPED_SEGMENTS.has(entry)) continue;
    if (statSync(fullPath).isDirectory()) {
      collectSourceFiles(fullPath, files);
    } else if (isScannedFile(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

function isScannedFile(name: string): boolean {
  return SCANNED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

// Root-level docs (README.md, AGENTS.md, …) are part of the same surface and
// are discovered dynamically so new ones are covered automatically.
function collectRootFiles(): string[] {
  return readdirSync(".")
    .filter((entry) => isScannedFile(entry) && statSync(entry).isFile())
    .map((entry) => entry);
}

describe("source encoding guard", () => {
  it("no source file contains cp1252-mojibake sequences", () => {
    const violations: string[] = [];

    const files = [
      ...SCAN_ROOTS.flatMap((root) => collectSourceFiles(root)),
      ...collectRootFiles(),
    ];

    for (const file of files) {
      const lines = readFileSync(file, "utf8").split("\n");
      for (const [index, line] of lines.entries()) {
        if (MOJIBAKE_PATTERN.test(line) || ESCAPED_GLYPH_PATTERN.test(line)) {
          violations.push(`${file}:${index + 1}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
