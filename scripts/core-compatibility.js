// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { hasCoreCapability, resolveGenerationFacade } from "./core-api-adapter.js";

export const CORE_REQUIREMENTS = Object.freeze({
  coreVersion: "1.8.1",
  helperApiVersion: "2.7.1",
  helperApiMajor: 2,
  capabilities: Object.freeze(["encounterGeneration"])
});

export const COMPATIBILITY_REASON = Object.freeze({
  COMPATIBLE: "compatible",
  CORE_MISSING: "core-missing",
  CORE_INACTIVE: "core-inactive",
  CORE_VERSION_INVALID: "core-version-invalid",
  CORE_VERSION_TOO_OLD: "core-version-too-old",
  API_UNAVAILABLE: "api-unavailable",
  API_VERSION_INVALID: "api-version-invalid",
  API_MAJOR_UNSUPPORTED: "api-major-unsupported",
  API_VERSION_TOO_OLD: "api-version-too-old",
  CAPABILITY_MISSING: "capability-missing",
});

/**
 * Parse a permissive semantic version into a comparable numeric tuple.
 * Pre-release/build suffixes are intentionally ignored for compatibility checks.
 *
 * @param {unknown} value Version-like value.
 * @returns {[number, number, number] | null}
 */
export function parseVersion(value) {
  const match = String(value ?? "").trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+].*)?$/i);
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

/**
 * Compare two semantic versions.
 *
 * @param {unknown} left Left-hand version.
 * @param {unknown} right Right-hand version.
 * @returns {-1 | 0 | 1 | null}
 */
export function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return null;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] > b[index]) return 1;
    if (a[index] < b[index]) return -1;
  }
  return 0;
}

/**
 * Inspect the currently exposed Runyth Encounter Crucible module/API without side effects.
 *
 * @param {object | undefined | null} coreModule Foundry Module instance or test double.
 * @param {object} requirements Compatibility requirements.
 * @returns {object} Structured compatibility result.
 */
export function inspectCoreCompatibility(coreModule, requirements = CORE_REQUIREMENTS) {
  const base = {
    ok: false,
    reason: COMPATIBILITY_REASON.CORE_MISSING,
    coreModule,
    api: coreModule?.api ?? null,
    coreVersion: String(coreModule?.version ?? "unknown"),
    apiVersion: String(coreModule?.api?.version ?? "unavailable"),
    requiredCoreVersion: requirements.coreVersion,
    requiredApiVersion: requirements.helperApiVersion,
    missingCapabilities: []
  };

  if (!coreModule) return base;
  if (coreModule.active === false) return { ...base, reason: COMPATIBILITY_REASON.CORE_INACTIVE };

  const coreComparison = compareVersions(coreModule.version, requirements.coreVersion);
  if (coreComparison === null) return { ...base, reason: COMPATIBILITY_REASON.CORE_VERSION_INVALID };
  if (coreComparison < 0) return { ...base, reason: COMPATIBILITY_REASON.CORE_VERSION_TOO_OLD };

  const api = coreModule.api;
  if (!api) return { ...base, reason: COMPATIBILITY_REASON.API_UNAVAILABLE };

  const apiTuple = parseVersion(api.version);
  const requiredApiTuple = parseVersion(requirements.helperApiVersion);
  if (!apiTuple || !requiredApiTuple) {
    return {
      ...base,
      api,
      apiVersion: String(api?.version ?? "unavailable"),
      reason: COMPATIBILITY_REASON.API_VERSION_INVALID
    };
  }

  if (apiTuple[0] !== requirements.helperApiMajor) {
    return {
      ...base,
      api,
      apiVersion: String(api.version),
      reason: COMPATIBILITY_REASON.API_MAJOR_UNSUPPORTED
    };
  }

  if (compareVersions(api.version, requirements.helperApiVersion) < 0) {
    return {
      ...base,
      api,
      apiVersion: String(api.version),
      reason: COMPATIBILITY_REASON.API_VERSION_TOO_OLD
    };
  }

  const missingCapabilities = requirements.capabilities.filter((capability) => !hasCoreCapability(api, capability));
  if (missingCapabilities.length) {
    return {
      ...base,
      api,
      apiVersion: String(api.version),
      reason: COMPATIBILITY_REASON.CAPABILITY_MISSING,
      missingCapabilities
    };
  }

  return {
    ...base,
    ok: true,
    reason: COMPATIBILITY_REASON.COMPATIBLE,
    api,
    apiVersion: String(api.version),
    generationSource: resolveGenerationFacade(api).source
  };
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Wait briefly for Runyth Encounter Crucible to expose its API. Hard incompatibilities
 * return immediately; only the transient API-unavailable state is retried.
 *
 * @param {object} options Wait options.
 * @param {() => object | undefined | null} options.getCoreModule Module resolver.
 * @param {number} [options.timeoutMs=5000] Maximum wait duration.
 * @param {number} [options.intervalMs=100] Polling interval.
 * @param {object} [options.requirements=CORE_REQUIREMENTS] Compatibility requirements.
 * @returns {Promise<object>} Structured compatibility result.
 */
export async function waitForCompatibleCore({
  getCoreModule,
  timeoutMs = 5000,
  intervalMs = 100,
  requirements = CORE_REQUIREMENTS
}) {
  const startedAt = Date.now();
  let result = inspectCoreCompatibility(getCoreModule(), requirements);

  const retryableReasons = new Set([
    COMPATIBILITY_REASON.API_UNAVAILABLE,
    COMPATIBILITY_REASON.CAPABILITY_MISSING
  ]);

  while (!result.ok && retryableReasons.has(result.reason)) {
    if (Date.now() - startedAt >= timeoutMs) return { ...result, timedOut: true };
    await delay(intervalMs);
    result = inspectCoreCompatibility(getCoreModule(), requirements);
  }

  return result;
}
