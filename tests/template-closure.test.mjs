// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
// Runtime template closure for Runyth Encounter Crucible Forge: every referenced
// module template must exist in the working tree, so the interactive forge window
// cannot load against a missing Handlebars asset.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleId = "runyth-encounter-crucible-forge";

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const entry = path.join(directory, name);
    return statSync(entry).isDirectory() ? walk(entry) : [entry];
  });
}

const scripts = walk(path.join(root, "scripts")).filter((entry) => entry.endsWith(".js"));
const pattern = /modules\/\$\{(?:MODULE_ID|module_id)\}\/templates\/([A-Za-z0-9./_-]+\.hbs)/g;
const referenced = new Set();
for (const script of scripts) {
  const source = readFileSync(script, "utf8");
  for (const match of source.matchAll(pattern)) {
    referenced.add(`templates/${match[1]}`);
  }
}

assert.ok(referenced.size >= 2, "the runtime scripts must reference the forge and reset templates");
for (const relative of [...referenced].sort()) {
  assert.ok(statSync(path.join(root, relative)).isFile(), `missing referenced template: ${relative}`);
}

assert.match(
  readFileSync(path.join(root, "templates/forge.hbs"), "utf8"),
  /actions?="|data-action=/,
  "the forge template stays interactive"
);

console.log("Template closure tests passed for Runyth Encounter Crucible Forge");
