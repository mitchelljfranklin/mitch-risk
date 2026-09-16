import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

// Pure content-in/content-out transforms, exported for the unit tests. Each
// asserts the expected old version is present — a file that doesn't contain
// it means the version spots have drifted from this script, and bumping
// half the tree is worse than bumping none of it. Every writer in this
// script uses explicit UTF-8 without a BOM (a PowerShell -Encoding utf8
// BOM once broke CI's JSON parse of package.json).
function replaceExactly(content, from, to, description) {
  if (!content.includes(from)) {
    throw new Error(`Expected to find ${description} ("${from}")`);
  }
  return content.split(from).join(to);
}

export function transformPackageJson(content, from, to) {
  return replaceExactly(
    content,
    `"version": "${from}",`,
    `"version": "${to}",`,
    "the package.json version field",
  );
}

export function transformDockerfile(content, from, to) {
  return replaceExactly(
    content,
    `version: '${from}'`,
    `version: '${to}'`,
    "the Dockerfile build-info version",
  );
}

export function transformBuildInfoTs(content, from, to) {
  return replaceExactly(
    content,
    `version: fromFile?.version ?? "${from}"`,
    `version: fromFile?.version ?? "${to}"`,
    "the lib/build-info.ts fallback version",
  );
}

export function transformArchitectureMd(content, from, to) {
  return replaceExactly(
    content,
    `> **Version:** ${from}`,
    `> **Version:** ${to}`,
    "the ARCHITECTURE.md version line",
  );
}

export function transformAppSecurityMd(content, from, to) {
  return replaceExactly(
    content,
    `**App version:** ${from}`,
    `**App version:** ${to}`,
    "the APPSECURITY.md version footer",
  );
}

export function transformSbomMd(content, from, to) {
  return replaceExactly(
    content,
    ` v${from},`,
    ` v${to},`,
    "the SBOM version line",
  );
}

function syncPackageLock(from, to) {
  // The lockfile's two root-version spots are authoritative npm state —
  // regenerate them instead of hand-editing 15k lines of JSON. When run via
  // `npm run bump`, npm exposes its own CLI through npm_execpath (modern
  // npm no longer bundles itself into node_modules/npm); fall back to the
  // shell-resolved `npm` for direct node invocations.
  const npmArguments = [
    "install",
    "--package-lock-only",
    "--no-audit",
    "--no-fund",
    "--legacy-peer-deps",
  ];
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    execFileSync(process.execPath, [npmExecPath, ...npmArguments], {
      stdio: "inherit",
      cwd: repoRoot,
    });
  } else {
    execFileSync("npm", npmArguments, {
      stdio: "inherit",
      cwd: repoRoot,
      shell: true,
    });
  }

  const lock = readFileSync(path.join(repoRoot, "package-lock.json"), "utf8");
  const occurrences = lock.split(`"version": "${to}"`).length - 1;
  if (occurrences < 2) {
    throw new Error(
      `package-lock.json sync did not produce the ${to} version (${occurrences} spot(s) found, expected 2).`,
    );
  }
}

function writeUtf8NoBom(filePath, content) {
  // Encode to a buffer explicitly so no BOM can sneak in.
  writeFileSync(filePath, Buffer.from(content, "utf8"));
}

function main() {
  const target = process.argv[2];
  if (!target || !VERSION_PATTERN.test(target)) {
    console.error(`Usage: npm run bump -- X.Y.Z   (got: ${target ?? "<none>"})`);
    process.exit(1);
  }

  const packageJson = readFileSync(path.join(repoRoot, "package.json"), "utf8");
  const current = JSON.parse(packageJson).version;

  if (current === target) {
    console.error(
      `Already at version ${target} — nothing to do. Pass the new version, e.g. npm run bump -- 1.5.0`,
    );
    process.exit(1);
  }

  const edits = [
    { file: "package.json", transform: transformPackageJson },
    { file: "Dockerfile", transform: transformDockerfile },
    { file: path.join("lib", "build-info.ts"), transform: transformBuildInfoTs },
    { file: "ARCHITECTURE.md", transform: transformArchitectureMd },
    { file: "APPSECURITY.md", transform: transformAppSecurityMd },
    { file: path.join("docs", "advanced", "sbom.md"), transform: transformSbomMd },
  ];

  // Transform everything first; write only if every spot resolved.
  const results = [];
  for (const edit of edits) {
    const content = readFileSync(path.join(repoRoot, edit.file), "utf8");
    const updated = edit.transform(content, current, target);
    results.push({ file: edit.file, content: updated });
  }

  for (const result of results) {
    writeUtf8NoBom(path.join(repoRoot, result.file), result.content);
    console.log(`  updated ${result.file}`);
  }

  syncPackageLock(current, target);
  console.log("  updated package-lock.json (2 spots, via npm)");

  console.log(`Bumped ${current} -> ${target}. Review the diff and commit.`);
}

const isDirectRun =
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  main();
}
