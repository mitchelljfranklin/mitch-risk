// Copies browser assets into the standalone server output.
//
// `npm run build` emits static chunks under .next/static and the public/
// folder, but `node .next/standalone/server.js` serves them from inside
// .next/standalone/. Without this copy the e2e suite (and any local
// `npm run start`) boots a shell whose JS chunks all 404 - pages render
// but never hydrate, so forms submit natively and Server Action results
// are lost. Mirrors what the Dockerfile's runner stage COPY does.
import { cpSync, existsSync } from "node:fs";

const sources = [
  { from: ".next/static", to: ".next/standalone/.next/static" },
  { from: "public", to: ".next/standalone/public" },
];

for (const { from, to } of sources) {
  if (!existsSync(from)) {
    console.warn(`[prepare-standalone] missing ${from} - skipped`);
    continue;
  }
  cpSync(from, to, { recursive: true });
  console.log(`[prepare-standalone] ${from} -> ${to}`);
}
