import { describe, expect, it } from "vitest";

import {
  transformAppSecurityMd,
  transformArchitectureMd,
  transformBuildInfoTs,
  transformDockerfile,
  transformPackageJson,
  transformSbomMd,
} from "./bump-version.mjs";

const FROM = "1.4.1";
const TO = "1.5.0";

describe("version bump transforms", () => {
  it("updates the package.json version field", () => {
    const content = '{\n  "name": "mitch-risk",\n  "version": "1.4.1",\n}\n';
    const updated = transformPackageJson(content, FROM, TO);
    expect(updated).toContain('"version": "1.5.0",');
    expect(updated).not.toContain('"version": "1.4.1"');
  });

  it("updates the Dockerfile build-info version", () => {
    const content = `RUN node -e "fs.writeFileSync('.next/build-info.json', JSON.stringify({ version: '1.4.1', commit }));"`;
    const updated = transformDockerfile(content, FROM, TO);
    expect(updated).toContain("version: '1.5.0'");
    expect(updated).not.toContain("version: '1.4.1'");
  });

  it("updates the lib/build-info.ts fallback version", () => {
    const content = `  version: fromFile?.version ?? "1.4.1",`;
    const updated = transformBuildInfoTs(content, FROM, TO);
    expect(updated).toContain('version: fromFile?.version ?? "1.5.0"');
  });

  it("updates the ARCHITECTURE.md version line", () => {
    const content = "> **Version:** 1.4.1\n";
    expect(transformArchitectureMd(content, FROM, TO)).toBe(
      "> **Version:** 1.5.0\n",
    );
  });

  it("updates the APPSECURITY.md version footer", () => {
    const content = "**App version:** 1.4.1\n";
    expect(transformAppSecurityMd(content, FROM, TO)).toBe(
      "**App version:** 1.5.0\n",
    );
  });

  it("updates the SBOM version line and preserves non-ASCII characters", () => {
    // The dash in "Mitch‑Risk" is a non-breaking hyphen (U+2011) — a
    // encoding-naive transform would corrupt it into mojibake.
    const content =
      "This document lists every direct software dependency used by Mitch\u2011Risk v1.4.1, organised by functional purpose.\n";
    const updated = transformSbomMd(content, FROM, TO);
    expect(updated).toContain("v1.5.0");
    expect(updated).toContain("Mitch\u2011Risk");
    expect(updated).not.toContain("v1.4.1");
  });

  it("throws when the expected old version is missing", () => {
    expect(() =>
      transformPackageJson('{"version": "9.9.9"}', FROM, TO),
    ).toThrow("package.json version field");
    expect(() => transformDockerfile("nothing here", FROM, TO)).toThrow(
      "Dockerfile build-info version",
    );
    expect(() => transformSbomMd("no version", FROM, TO)).toThrow(
      "SBOM version line",
    );
  });

  it("replaces every occurrence of the pattern, not just the first", () => {
    const content =
      '  "version": "1.4.1",\n  "other": { "version": "1.4.1", },\n';
    expect(transformPackageJson(content, FROM, TO)).toBe(
      '  "version": "1.5.0",\n  "other": { "version": "1.5.0", },\n',
    );
  });
});
