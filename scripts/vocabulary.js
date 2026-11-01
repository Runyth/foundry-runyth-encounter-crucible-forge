// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
const HTML_SEPARATOR_ENTITIES = Object.freeze([
  [/&comma;|&#0*44;|&#x0*2c;/giu, ","],
  [/&semi;|&#0*59;|&#x0*3b;/giu, ";"],
  [/&sol;|&#0*47;|&#x0*2f;/giu, "/"],
  [/&vert;|&#0*124;|&#x0*7c;/giu, "|"]
]);

const STRUCTURAL_SEPARATOR = /\s*[,，﹐､、;；|｜/／:]\s*/gu;
const LABEL_OBJECT_KEYS = Object.freeze(["value", "custom", "subtype", "name", "label"]);
const ANY_VALUE_PATTERN = /^(?:any|all|no preference|any race|any races|any ancestry|any class|any classes|any type|any archetype|any theme)$/iu;

function flattenVocabularyInput(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(flattenVocabularyInput);
  if (value instanceof Set) return [...value].flatMap(flattenVocabularyInput);
  if (typeof value === "object") {
    const extracted = LABEL_OBJECT_KEYS.flatMap((key) => flattenVocabularyInput(value[key]));
    return extracted.length ? extracted : [];
  }
  return [value];
}

function decodeStructuralEntities(value) {
  return HTML_SEPARATOR_ENTITIES.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    String(value ?? "")
  );
}

function cleanLabel(value) {
  const label = decodeStructuralEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!label) return "";
  const normalized = label.replace(/^(\p{L})/u, (letter) => letter.toLocaleUpperCase());
  return ANY_VALUE_PATTERN.test(normalized) ? "" : normalized;
}

function uniqueLabels(values) {
  const seen = new Set();
  const output = [];
  for (const value of flattenVocabularyInput(values)) {
    const label = cleanLabel(value);
    const key = label.toLocaleLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    output.push(label);
  }
  return output;
}

function splitStructuralLabel(value) {
  const parenthetical = [];
  const withoutParentheses = cleanLabel(value).replace(/\s*\(([^()]*)\)\s*/g, (_match, inner) => {
    parenthetical.push(inner);
    return ",";
  });
  return [withoutParentheses, ...parenthetical]
    .flatMap((part) => part.split(STRUCTURAL_SEPARATOR))
    .map(cleanLabel)
    .filter(Boolean);
}

/**
 * Expand compound trait labels into independent canonical values.
 *
 * High-confidence structural normalization is mandatory. The legacy
 * splitCompounds option is accepted for API compatibility, but can no longer
 * preserve compound race/archetype labels in the Forge selectors.
 *
 * Examples:
 * - "Human, Shapechanger" -> ["Human", "Shapechanger"]
 * - "Humanoid (Shapechanger)" -> ["Humanoid", "Shapechanger"]
 * - "Fiend / Devil" -> ["Fiend", "Devil"]
 * - "Human&#44; Shapechanger" -> ["Human", "Shapechanger"]
 */
export function expandVocabulary(values, { splitCompounds: _splitCompounds = true } = {}) {
  const expanded = flattenVocabularyInput(values).flatMap(splitStructuralLabel);
  return uniqueLabels(expanded);
}

/** Parse a comma, semicolon, or newline-separated whitelist/blacklist field. */
export function parsePatterns(value) {
  return uniqueLabels(String(value ?? "").split(/[\r\n,;]+/g));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternMatcher(pattern) {
  const source = escapeRegExp(pattern).replace(/\\\*/g, ".*").replace(/\\\?/g, ".");
  return new RegExp(`^${source}$`, "iu");
}

export function matchesAnyPattern(value, patterns) {
  const label = cleanLabel(value);
  return patterns.some((pattern) => patternMatcher(pattern).test(label));
}

/**
 * Apply a vocabulary whitelist and blacklist.
 *
 * An empty whitelist allows every value. The blacklist is evaluated last and
 * therefore always wins. Patterns are case-insensitive and support * and ?.
 */
export function filterVocabulary(values, { whitelist = "", blacklist = "" } = {}) {
  const whitelistPatterns = parsePatterns(whitelist);
  const blacklistPatterns = parsePatterns(blacklist);
  return uniqueLabels(values).filter((value) => {
    if (whitelistPatterns.length && !matchesAnyPattern(value, whitelistPatterns)) return false;
    if (blacklistPatterns.length && matchesAnyPattern(value, blacklistPatterns)) return false;
    return true;
  });
}

/**
 * Reconcile persisted selections with the current canonical vocabulary.
 *
 * This migrates an old selection such as "Human, Shapechanger" to the two
 * current choices while preserving the exact capitalization exposed by the
 * current Actor folder.
 */
export function reconcileVocabularySelection(values, availableValues) {
  const canonicalByKey = new Map(
    expandVocabulary(availableValues).map((value) => [value.toLocaleLowerCase(), value])
  );
  const reconciled = expandVocabulary(values)
    .map((value) => canonicalByKey.get(value.toLocaleLowerCase()))
    .filter(Boolean);
  return uniqueLabels(reconciled);
}

/**
 * Return a participant copy whose race and archetype metadata is suitable for
 * Forge selection, strict matching, and automatic theme derivation.
 *
 * This never excludes the participant itself from the generation pool.
 */
export function prepareParticipantVocabulary(participant, configuration = {}) {
  if (!participant) return participant;
  const primaryRaces = filterVocabulary(
    expandVocabulary(participant.traits?.primaryRaces ?? participant.traits?.races ?? []),
    { whitelist: configuration.raceWhitelist, blacklist: configuration.raceBlacklist }
  );
  const raceQualifiers = filterVocabulary(
    expandVocabulary(participant.traits?.raceQualifiers ?? []),
    { whitelist: configuration.archetypeWhitelist, blacklist: configuration.archetypeBlacklist }
  );
  const creatureTypes = filterVocabulary(
    expandVocabulary(participant.traits?.creatureTypes ?? []),
    { whitelist: configuration.archetypeWhitelist, blacklist: configuration.archetypeBlacklist }
  );
  const archetypes = filterVocabulary(
    expandVocabulary([participant.traits?.archetypes ?? [], raceQualifiers, creatureTypes]),
    { whitelist: configuration.archetypeWhitelist, blacklist: configuration.archetypeBlacklist }
  );

  return {
    ...participant,
    traits: {
      ...(participant.traits ?? {}),
      races: primaryRaces,
      primaryRaces,
      raceQualifiers,
      creatureTypes,
      archetypes
    }
  };
}
