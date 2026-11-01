// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return structuredClone(value);
}

export function prepareLoadedEncounter(saved, currentParty = [], useCurrentParty = true) {
  if (!saved) throw new TypeError("A saved Runyth Encounter Crucible definition is required.");
  const savedParticipants = clone(saved.participants ?? []);
  const party = useCurrentParty ? clone(currentParty ?? []) : savedParticipants.filter((participant) => participant.side === "party");
  if (useCurrentParty && !party.length) throw new Error("The selected party source contains no characters.");
  const nonParty = savedParticipants.filter((participant) => participant.side !== "party");
  return {
    ...clone(saved),
    participants: [...party, ...nonParty],
    name: saved.displayName ?? saved.name,
    displayName: saved.displayName ?? saved.name
  };
}

export function loadedEncounterDiagnostics(encounter, assessment) {
  const enemies = (encounter?.participants ?? []).filter((participant) => participant.side === "enemy");
  const expandedCrs = enemies.flatMap((enemy) => Array.from({ length: Math.max(1, Number(enemy.quantity ?? 1)) }, () => Number(enemy.cr ?? 0)));
  const rawEnemyXp = enemies.reduce((sum, enemy) => sum + Number(enemy.xp ?? 0) * Math.max(1, Number(enemy.quantity ?? 1)), 0);
  const xp2014 = assessment?.models?.find((model) => model.modelId === "xp2014")?.metrics ?? {};
  const targetProfile = encounter?.generation?.targetProfile ?? encounter?.generation?.safety ?? {};
  const targetRawXp = Number(targetProfile.rawXp ?? rawEnemyXp);
  const targetRatio = targetRawXp > 0 ? rawEnemyXp / targetRawXp : 1;
  return {
    targetScore: Number(assessment?.score ?? 0).toFixed(2),
    actualScore: Number(assessment?.score ?? 0).toFixed(2),
    enemyCount: enemies.reduce((sum, enemy) => sum + Math.max(1, Number(enemy.quantity ?? 1)), 0),
    uniqueActors: enemies.length,
    averageCr: expandedCrs.length ? (expandedCrs.reduce((sum, cr) => sum + cr, 0) / expandedCrs.length).toFixed(2) : "0",
    highestCr: Math.max(0, ...expandedCrs),
    loadedFromJournal: true,
    rawEnemyXp,
    adjustedXp2014: Number(xp2014.adjustedXp ?? rawEnemyXp),
    targetRawXp,
    targetAdjustedXp2014: Number(targetProfile.adjustedXp2014 ?? xp2014.adjustedXp ?? rawEnemyXp),
    targetRatio,
    fitStatus: targetRatio > 1.35 ? "over-target" : targetRatio < 0.74 ? "under-target" : "close",
    candidateCountAfterFilters: 0,
    warnings: []
  };
}
