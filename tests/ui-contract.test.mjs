// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const template = readFileSync(new URL("../templates/forge.hbs", import.meta.url), "utf8");
const main = readFileSync(new URL("../scripts/main.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles/forge.css", import.meta.url), "utf8");

assert.match(template, /data-action="loadSavedEncounter"/);
assert.match(template, /name="useCurrentParty"/);
assert.match(template, /assessment\.safety\.overmatched/);
assert.match(template, /diagnostics\.targetRawXpDisplay/);
assert.match(template, /diagnostics\.rawEnemyXpDisplay/);
assert.match(template, /diagnostics\.targetRatioDisplay/);
assert.doesNotMatch(template, /diagnostics\.safety\.maxTotalXp/);
assert.match(main, /button\.className = "eccf-sidebar-button"/);
assert.match(main, /waitForCompatibleCore/);
assert.match(main, /encounter-crucible\.apiReady|CORE_ID}\.apiReady/);
assert.match(css, /inline-size: auto !important/);
assert.match(css, /min-inline-size: max-content !important/);

console.log("Forge UI contract tests passed");

const forgeApp = readFileSync(new URL("../scripts/forge-app.js", import.meta.url), "utf8");
assert.doesNotMatch(forgeApp, /Number\(game\.settings\.get\(MODULE_ID, SETTINGS\.TARGET\)\) \|\| 50/);
assert.match(forgeApp, /Number\.isFinite\(storedTarget\)/);
assert.match(template, /diagnostics\.targetBandLabel/);
assert.match(template, /diagnostics\.actualBandLabel/);

assert.match(template, /diagnostics\.strategyModeLabel/);
assert.match(template, /diagnostics\.qualifiedRaceExcludedCount/);
assert.match(template, /data-strategy-mode-label/);
assert.match(template, /data-strategy-mode-hint/);
assert.match(forgeApp, /resolveCompositionMode/);
assert.match(forgeApp, /fixedGroupSize/);
assert.match(forgeApp, /createCoreApiAdapter/);
assert.doesNotMatch(forgeApp, /api\?\.generation\.sliderToTarget/);
assert.doesNotMatch(forgeApp, /api\?\.capabilities\?\.encounterGeneration/);

// Actor-folder selection is hierarchical and no longer depends on a flat core API list.
assert.match(template, /data-folder-picker/);
assert.match(template, /data-folder-search/);
assert.match(template, /data-folder-toggle/);
assert.match(template, /data-folder-select/);
assert.match(template, /class="eccf-folder-tree"/);
assert.doesNotMatch(template, /<select name="folderId"/);
assert.match(forgeApp, /actorFoldersFromGame\(game\)/);
assert.doesNotMatch(forgeApp, /api\?\.actors\?\.listFolders/);
assert.match(css, /max-height: clamp\(12rem, 34vh, 24rem\)/);
assert.match(css, /overflow: auto/);
