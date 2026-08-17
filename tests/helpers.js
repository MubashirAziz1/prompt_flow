import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const testsDir = dirname(fileURLToPath(import.meta.url));

export const repoRoot = join(testsDir, "..");
export const extensionRoot = join(repoRoot, "extension");
export const manifestPath = join(extensionRoot, "manifest.json");

export function readManifest() {
  const raw = readFileSync(manifestPath, "utf8");
  return JSON.parse(raw);
}

export function extensionFile(relativePath) {
  return join(extensionRoot, relativePath);
}

export function fileExists(relativePath) {
  return existsSync(extensionFile(relativePath));
}
