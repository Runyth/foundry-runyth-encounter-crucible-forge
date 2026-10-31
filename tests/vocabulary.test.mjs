// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import {
  expandVocabulary,
  filterVocabulary,
  parsePatterns,
  prepareParticipantVocabulary,
  reconcileVocabularySelection
} from "../scripts/vocabulary.js";

assert.deepEqual(
  expandVocabulary(["Human, Shapechanger"]),
  ["Human", "Shapechanger"],
  "Comma-separated race and subtype values must become independent choices"
);

assert.deepEqual(
  expandVocabulary(["Humanoid (Shapechanger)", "Fiend / Devil"]),
  ["Humanoid", "Shapechanger", "Fiend", "Devil"],
  "Parenthetical subtypes and slash-separated values must be split"
);

assert.deepEqual(
  expandVocabulary(["Human， Shapechanger", "Devil&#44; Shapechanger", "Fiend／Devil"]),
  ["Human", "Shapechanger", "Devil", "Fiend"],
  "Unicode and HTML-encoded structural separators must be normalized"
);

assert.deepEqual(
  expandVocabulary([{ value: "Human, Shapechanger", subtype: "Spy" }, new Set(["Devil, Shapechanger"])]),
  ["Human", "Shapechanger", "Spy", "Devil"],
  "Nested D&D-style vocabulary structures must be flattened before splitting"
);

assert.deepEqual(
  expandVocabulary(["Human, Shapechanger"], { splitCompounds: false }),
  ["Human", "Shapechanger"],
  "Legacy world settings must no longer preserve compound selector values"
);

assert.deepEqual(
  parsePatterns("Human\nGoblin;Shape*"),
  ["Human", "Goblin", "Shape*"],
  "Configuration lists must accept newlines and semicolons"
);

assert.deepEqual(
  filterVocabulary(["Human", "Shapechanger", "Shapeshifter"], { blacklist: "Shape*" }),
  ["Human"],
  "Blacklist wildcards must be case-insensitive and remove matching values"
);

assert.deepEqual(
  filterVocabulary(["Human", "Humanoid", "Shapechanger"], { whitelist: "human*", blacklist: "Humanoid" }),
  ["Human"],
  "Whitelist is applied first and blacklist takes precedence"
);

assert.deepEqual(
  reconcileVocabularySelection(["human, SHAPECHANGER"], ["Human", "Shapechanger", "Devil"]),
  ["Human", "Shapechanger"],
  "Persisted compound selections must migrate to current canonical choices"
);

const participant = prepareParticipantVocabulary({
  name: "Doppelganger",
  traits: {
    races: ["Human, Shapechanger", "Devil&#44; Shapechanger"],
    archetypes: ["Humanoid (Infiltrator)", "Spy"]
  }
}, {
  splitCompounds: false,
  raceBlacklist: "Shapechanger",
  archetypeWhitelist: "Humanoid, Infiltrator"
});

assert.deepEqual(participant.traits.races, ["Human", "Devil"]);
assert.deepEqual(participant.traits.archetypes, ["Humanoid", "Infiltrator"]);
assert.equal(participant.name, "Doppelganger", "Vocabulary filtering must not remove or mutate the Actor identity");
assert.equal(
  participant.traits.races.some((value) => /[,，]/u.test(value)),
  false,
  "Prepared selector values must never retain compound comma labels"
);

console.log("Validated mandatory Forge vocabulary normalization and global filters");

assert.deepEqual(
  expandVocabulary(["Any Race", "Any Class", "Human"]),
  ["Human"],
  "Any Race and Any Class are UI wildcards, never literal Actor filters"
);

const qualifiedParticipant = prepareParticipantVocabulary({
  name: "Wererat",
  traits: {
    primaryRaces: ["Human"],
    races: ["Human"],
    raceQualifiers: ["Shapechanger"],
    creatureTypes: ["Humanoid"],
    archetypes: ["Shapechanger", "Wererat"]
  }
});
assert.deepEqual(qualifiedParticipant.traits.primaryRaces, ["Human"]);
assert.deepEqual(qualifiedParticipant.traits.raceQualifiers, ["Shapechanger"]);
assert.deepEqual(qualifiedParticipant.traits.races, ["Human"]);
