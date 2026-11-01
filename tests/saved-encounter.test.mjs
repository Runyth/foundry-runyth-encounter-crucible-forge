// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { loadedEncounterDiagnostics, prepareLoadedEncounter } from "../scripts/saved-encounter.js";

const saved = {
  id: "encounter-1",
  journalId: "journal-1",
  name: "[P4-L1-Dangerous] Naga Patrol",
  displayName: "Naga Patrol",
  participants: [
    { id: "old-party", side: "party", level: 1, quantity: 1 },
    { id: "enemy", side: "enemy", cr: 1, quantity: 2 }
  ]
};

const currentParty = [
  { id: "new-1", side: "party", level: 3, quantity: 1 },
  { id: "new-2", side: "party", level: 3, quantity: 1 }
];

const reused = prepareLoadedEncounter(saved, currentParty, true);
assert.equal(reused.journalId, "journal-1");
assert.equal(reused.name, "Naga Patrol");
assert.deepEqual(reused.participants.filter((entry) => entry.side === "party").map((entry) => entry.id), ["new-1", "new-2"]);
assert.equal(reused.participants.filter((entry) => entry.side === "enemy")[0].quantity, 2);

const exact = prepareLoadedEncounter(saved, currentParty, false);
assert.deepEqual(exact.participants.filter((entry) => entry.side === "party").map((entry) => entry.id), ["old-party"]);

const diagnostics = loadedEncounterDiagnostics(reused, { score: 2.5 });
assert.equal(diagnostics.enemyCount, 2);
assert.equal(diagnostics.uniqueActors, 1);
assert.equal(diagnostics.averageCr, "1.00");
assert.equal(diagnostics.highestCr, 1);

console.log("Saved encounter loading tests passed");
