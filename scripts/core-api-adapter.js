// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
const DEFAULT_DIFFICULTY_BANDS = Object.freeze([
  "trivial",
  "manageable",
  "challenging",
  "dangerous",
  "extreme"
]);

const COMPOSITION_MODES = new Set(["neutral", "quantity", "strength", "balanced", "fixed"]);

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function bindMethod(owner, names) {
  if (!owner) return null;
  for (const name of names) {
    if (typeof owner[name] === "function") return owner[name].bind(owner);
  }
  return null;
}

function generationCandidates(api) {
  return [
    ["generation", api?.generation, api],
    ["encounterGeneration", api?.encounterGeneration, api],
    ["generator", api?.generator, api],
    ["encounterGenerator", api?.encounterGenerator, api],
    ["services.generation", api?.services?.generation, api?.services],
    ["services.encounterGeneration", api?.services?.encounterGeneration, api?.services],
    ["services.generator", api?.services?.generator, api?.services],
    ["encounters.generation", api?.encounters?.generation, api?.encounters]
  ].filter(([, namespace]) => namespace && ["object", "function"].includes(typeof namespace));
}

function bindGenerationMethod(namespace, owner) {
  if (typeof namespace === "function") return namespace.bind(owner);
  return bindMethod(namespace, ["suggest", "generate"]);
}

function normalizeBands(bands) {
  if (!Array.isArray(bands) || bands.length < 5) return DEFAULT_DIFFICULTY_BANDS;
  const normalized = bands.map((band) => String(band ?? "").trim().toLowerCase()).filter(Boolean);
  return normalized.length >= 5 ? normalized : DEFAULT_DIFFICULTY_BANDS;
}

function normalizeSliderResult(result, value, bands) {
  if (!result || typeof result !== "object") return null;
  const usableBands = normalizeBands(bands);
  const numericValue = Number(result.value ?? value);
  const numericScore = Number(result.score);
  const normalizedValue = clamp(Number.isFinite(numericValue) ? numericValue : Number(value) || 50, 0, 100);
  const fallbackScore = (normalizedValue / 100) * 4;
  const score = Number.isFinite(numericScore) ? clamp(numericScore, 0, 4) : fallbackScore;
  const requestedBand = String(result.band ?? "").trim().toLowerCase();
  const band = usableBands.includes(requestedBand)
    ? requestedBand
    : usableBands[clamp(Math.round(score), 0, usableBands.length - 1)] ?? "challenging";
  return { ...result, value: normalizedValue, score, band };
}

function normalizeCompositionMode(value, fallback) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "hybrid") return "balanced";
  return COMPOSITION_MODES.has(normalized) ? normalized : fallback;
}

/**
 * Resolve the Runyth Encounter Crucible generation facade across compatible API 2.x
 * layouts. The public `generation` namespace is preferred, while documented
 * aliases, callable facades, and structurally compatible service layouts remain
 * supported.
 *
 * @param {object | null | undefined} api Runyth Encounter Crucible API object.
 * @returns {object} Resolved generation facade and evidence.
 */
export function resolveGenerationFacade(api) {
  for (const [source, namespace, owner] of generationCandidates(api)) {
    const suggest = bindGenerationMethod(namespace, owner);
    if (!suggest) continue;
    const helperOwner = typeof namespace === "object" ? namespace : owner;
    return {
      available: true,
      source,
      namespace,
      suggest,
      sliderToTarget: bindMethod(helperOwner, ["sliderToTarget"]) ?? bindMethod(api, ["sliderToTarget"]),
      resolveCompositionMode: bindMethod(helperOwner, ["resolveCompositionMode"]) ?? bindMethod(api, ["resolveCompositionMode"]),
      targetProfile: bindMethod(helperOwner, ["targetProfile"]) ?? bindMethod(api, ["targetProfile"])
    };
  }

  const directSuggest = bindMethod(api, ["suggestEncounter", "generateEncounter"]);
  if (directSuggest) {
    return {
      available: true,
      source: "direct",
      namespace: api,
      suggest: directSuggest,
      sliderToTarget: bindMethod(api, ["sliderToTarget"]),
      resolveCompositionMode: bindMethod(api, ["resolveCompositionMode"]),
      targetProfile: bindMethod(api, ["targetProfile"])
    };
  }

  return {
    available: false,
    source: "unavailable",
    namespace: null,
    suggest: null,
    sliderToTarget: null,
    resolveCompositionMode: null,
    targetProfile: null
  };
}

/**
 * Read a capability declaration from object, array, Set, or has()-based APIs.
 * Undefined means that the API did not explicitly declare the capability.
 *
 * @param {object | null | undefined} api Runyth Encounter Crucible API object.
 * @param {string} capability Capability name.
 * @returns {boolean | undefined}
 */
export function declaredCapability(api, capability) {
  const capabilities = api?.capabilities;
  if (!capabilities) return undefined;
  if (Array.isArray(capabilities)) return capabilities.includes(capability);
  if (capabilities instanceof Set) return capabilities.has(capability);
  if (typeof capabilities?.has === "function") {
    const value = capabilities.has(capability);
    return typeof value === "boolean" ? value : undefined;
  }
  if (typeof capabilities === "object" && Object.hasOwn(capabilities, capability)) {
    return capabilities[capability] === true;
  }
  return undefined;
}

/**
 * Determine capability availability from both declarations and callable API
 * structure. Structural evidence prevents false negatives when a compatible
 * core omits or delays an additive capability flag.
 *
 * @param {object | null | undefined} api Runyth Encounter Crucible API object.
 * @param {string} capability Capability name.
 * @returns {boolean}
 */
export function hasCoreCapability(api, capability) {
  const declared = declaredCapability(api, capability);
  if (declared === true) return true;

  switch (capability) {
    case "encounterGeneration":
      return resolveGenerationFacade(api).available;
    case "actorFolderTraversal":
      return typeof api?.actors?.collectFromFolder === "function";
    case "actorNormalization":
      return typeof api?.actors?.normalize === "function";
    case "partyDiscovery":
      return typeof api?.party?.resolve === "function";
    default:
      return false;
  }
}

/**
 * Canonical slider conversion used only when a compatible generation facade
 * does not expose a usable display helper. Encounter generation itself is still
 * delegated to Runyth Encounter Crucible.
 *
 * @param {unknown} value Slider value.
 * @param {string[]} [bands] Difficulty bands supplied by the core when present.
 * @returns {{value: number, score: number, band: string}}
 */
export function fallbackSliderToTarget(value, bands = DEFAULT_DIFFICULTY_BANDS) {
  const numeric = Number(value);
  const normalizedValue = clamp(Number.isFinite(numeric) ? numeric : 50, 0, 100);
  const usableBands = normalizeBands(bands);
  const score = (normalizedValue / 100) * 4;
  return {
    value: normalizedValue,
    score,
    band: usableBands[clamp(Math.round(score), 0, usableBands.length - 1)] ?? "challenging"
  };
}

function fallbackCompositionMode(options = {}) {
  if (options.fixedGroupSize) return "fixed";
  if (options.preferQuantity && options.preferStrength) return "balanced";
  if (options.preferQuantity) return "quantity";
  if (options.preferStrength) return "strength";
  return "neutral";
}

/**
 * Create the small compatibility facade used by Forge. Resolution is performed
 * at call time so a core which populates or replaces API namespaces during its
 * startup lifecycle cannot leave Forge holding a stale unavailable facade.
 * Optional display helpers are isolated: throwing or malformed implementations
 * fall back locally and cannot break ForgeApp._prepareContext.
 *
 * @param {object | null | undefined} api Runyth Encounter Crucible API object.
 * @returns {object} Forge-facing API adapter.
 */
export function createCoreApiAdapter(api) {
  const bands = api?.constants?.difficultyBands;

  return {
    api,
    hasCapability(capability) {
      return hasCoreCapability(api, capability);
    },
    generation: {
      get available() {
        return resolveGenerationFacade(api).available;
      },
      get source() {
        return resolveGenerationFacade(api).source;
      },
      sliderToTarget(value) {
        const fallback = fallbackSliderToTarget(value, bands);
        const sliderToTarget = resolveGenerationFacade(api).sliderToTarget;
        if (!sliderToTarget) return fallback;
        try {
          return normalizeSliderResult(sliderToTarget(value), value, bands) ?? fallback;
        } catch {
          return fallback;
        }
      },
      resolveCompositionMode(options = {}) {
        const fallback = fallbackCompositionMode(options);
        const resolver = resolveGenerationFacade(api).resolveCompositionMode;
        if (!resolver) return fallback;
        try {
          return normalizeCompositionMode(resolver(options), fallback);
        } catch {
          return fallback;
        }
      },
      targetProfile(party, value) {
        const targetProfile = resolveGenerationFacade(api).targetProfile;
        if (!targetProfile) return null;
        try {
          return targetProfile(party, value) ?? null;
        } catch {
          return null;
        }
      },
      async suggest(request) {
        const suggest = resolveGenerationFacade(api).suggest;
        if (!suggest) throw new Error("Runyth Encounter Crucible encounter generation is unavailable.");
        return suggest(request);
      }
    }
  };
}
