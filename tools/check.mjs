// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync
} from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "module.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const packageLock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function assertFile(relativePath, label = relativePath) {
  assert(existsSync(join(root, relativePath)), `Missing ${label}: ${relativePath}`);
}

function sortedKeys(object) {
  return Object.keys(object).sort();
}

assert(manifest.id === "encounter-crucible-forge", "Unexpected module id");
assert(manifest.version === packageJson.version, "module.json and package.json versions differ");
assert(packageLock.version === packageJson.version, "package-lock.json and package.json versions differ");
assert(packageLock.packages?.[""]?.version === packageJson.version, "Root lockfile package version differs");
assert(manifest.compatibility?.minimum === "13", "Foundry minimum must remain v13");
assert(manifest.relationships?.requires?.[0]?.id === "encounter-crucible", "Encounter Crucible dependency is missing");
assert(manifest.relationships?.requires?.[0]?.compatibility?.minimum === "1.8.1", "Unexpected Encounter Crucible minimum version");
assert(manifest.relationships?.systems?.[0]?.id === "dnd5e", "D&D5e system relationship is missing");

for (const path of manifest.esmodules ?? []) assertFile(path, "ES module");
for (const path of manifest.styles ?? []) assertFile(path, "stylesheet");
for (const language of manifest.languages ?? []) assertFile(language.path, `${language.lang} localization`);
for (const field of ["license", "readme", "changelog"]) {
  if (manifest[field]) assertFile(manifest[field], `manifest ${field}`);
}

const en = JSON.parse(readFileSync(join(root, "lang/en.json"), "utf8"));
const de = JSON.parse(readFileSync(join(root, "lang/de.json"), "utf8"));
assert(
  JSON.stringify(sortedKeys(en)) === JSON.stringify(sortedKeys(de)),
  "English and German localization keys differ"
);

const sourceFiles = [
  ...walk(join(root, "scripts")),
  ...walk(join(root, "tests")),
  ...walk(join(root, "tools"))
].filter((file) => [".js", ".mjs"].includes(extname(file)));

const importPattern = /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["'](\.[^"']+)["']/g;
for (const file of sourceFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(importPattern)) {
    const importedPath = resolve(dirname(file), match[1]);
    assert(existsSync(importedPath), `Unresolved local import in ${file}: ${match[1]}`);
  }
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
}

const testFiles = walk(join(root, "tests")).filter((file) => file.endsWith(".mjs")).sort();
for (const file of testFiles) {
  execFileSync(process.execPath, [file], { stdio: "inherit" });
}

console.log(`Validated ${manifest.title} ${manifest.version} (${testFiles.length} test files)`);
