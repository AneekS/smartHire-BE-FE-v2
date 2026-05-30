#!/usr/bin/env node
import { rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
for (const rel of [".next", "out", ".turbo", "node_modules/.cache", "coverage"]) {
  const abs = join(root, rel);
  if (!existsSync(abs)) continue;
  try {
    rmSync(abs, { recursive: true, force: true });
    console.log("removed", rel);
  } catch (e) {
    console.warn("skip", rel);
  }
}
