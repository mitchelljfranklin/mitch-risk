import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

type BuildInfo = {
  version: string;
  commit: string;
  buildTime: string;
};

let cached: BuildInfo | null = null;

function tryReadBuildFile(): BuildInfo | null {
  try {
    const path = join(process.cwd(), ".next/build-info.json");
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function tryGitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      timeout: 3000,
    })
      .trim()
      .slice(0, 7);
  } catch {
    return "unknown";
  }
}

export function getBuildInfo(): BuildInfo {
  if (!cached) {
    const fromFile = tryReadBuildFile();
    cached = {
      version: fromFile?.version ?? "1.3.0",
      commit: fromFile?.commit ?? tryGitCommit(),
      buildTime: fromFile?.buildTime ?? "",
    };
  }
  return cached;
}

export function getUptimeSeconds(): number {
  return Math.floor(process.uptime());
}
