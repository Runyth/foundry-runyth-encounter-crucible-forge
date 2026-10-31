// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import {
  COMPATIBILITY_REASON,
  compareVersions,
  inspectCoreCompatibility,
  parseVersion,
  waitForCompatibleCore
} from "../scripts/core-compatibility.js";

function compatibleApi(version = "2.7.1") {
  return {
    version,
    capabilities: { encounterGeneration: true },
    generation: {
      sliderToTarget(value) {
        return { value, score: 2, band: "challenging" };
      },
      async suggest() {
        return {};
      }
    },
    helpers: { register() {} }
  };
}

function core(version = "1.8.2", api = compatibleApi()) {
  return { active: true, version, api };
}

assert.deepEqual(parseVersion("1.8.2"), [1, 8, 2]);
assert.deepEqual(parseVersion("v2.7.1+build.4"), [2, 7, 1]);
assert.deepEqual(parseVersion("2.8.0-beta.1"), [2, 8, 0]);
assert.equal(parseVersion("invalid"), null);
assert.equal(compareVersions("1.8.2", "1.8.1"), 1);
assert.equal(compareVersions("1.8.1", "1.8.1"), 0);
assert.equal(compareVersions("1.8.0", "1.8.1"), -1);

for (const coreVersion of ["1.8.1", "1.8.2", "1.8.10", "1.9.0", "2.0.0"]) {
  const result = inspectCoreCompatibility(core(coreVersion));
  assert.equal(result.ok, true, `Expected core ${coreVersion} to be accepted`);
}

for (const apiVersion of ["2.7.1", "2.7.2", "2.8.0", "2.99.0"]) {
  const result = inspectCoreCompatibility(core("1.8.2", compatibleApi(apiVersion)));
  assert.equal(result.ok, true, `Expected Helper API ${apiVersion} to be accepted`);
}

assert.equal(
  inspectCoreCompatibility(core("1.8.0")).reason,
  COMPATIBILITY_REASON.CORE_VERSION_TOO_OLD
);
assert.equal(
  inspectCoreCompatibility(core("1.8.2", compatibleApi("2.7.0"))).reason,
  COMPATIBILITY_REASON.API_VERSION_TOO_OLD
);
assert.equal(
  inspectCoreCompatibility(core("1.8.2", compatibleApi("3.0.0"))).reason,
  COMPATIBILITY_REASON.API_MAJOR_UNSUPPORTED
);
assert.equal(
  inspectCoreCompatibility({ active: true, version: "1.8.2", api: null }).reason,
  COMPATIBILITY_REASON.API_UNAVAILABLE
);
assert.equal(
  inspectCoreCompatibility({ active: false, version: "1.8.2", api: compatibleApi() }).reason,
  COMPATIBILITY_REASON.CORE_INACTIVE
);

// Capability flags are advisory when the documented generation facade is callable.
const flaglessApi = compatibleApi();
delete flaglessApi.capabilities.encounterGeneration;
const flaglessResult = inspectCoreCompatibility(core("1.8.2", flaglessApi));
assert.equal(flaglessResult.ok, true);
assert.equal(flaglessResult.generationSource, "generation");

const falseFlagApi = compatibleApi();
falseFlagApi.capabilities.encounterGeneration = false;
assert.equal(inspectCoreCompatibility(core("1.8.2", falseFlagApi)).ok, true);

const aliasApi = compatibleApi();
delete aliasApi.generation;
delete aliasApi.capabilities.encounterGeneration;
aliasApi.encounterGeneration = {
  async generate() {
    return {};
  }
};
const aliasResult = inspectCoreCompatibility(core("1.8.2", aliasApi));
assert.equal(aliasResult.ok, true);
assert.equal(aliasResult.generationSource, "encounterGeneration");

const missingGenerationApi = compatibleApi();
delete missingGenerationApi.generation;
missingGenerationApi.capabilities.encounterGeneration = false;
const missingCapability = inspectCoreCompatibility(core("1.8.2", missingGenerationApi));
assert.equal(missingCapability.reason, COMPATIBILITY_REASON.CAPABILITY_MISSING);
assert.deepEqual(missingCapability.missingCapabilities, ["encounterGeneration"]);

const noRegistryApi = compatibleApi("2.7.2");
delete noRegistryApi.helpers;
const noRegistryResult = inspectCoreCompatibility(core("1.8.4", noRegistryApi));
assert.equal(noRegistryResult.ok, true);
assert.equal(noRegistryResult.apiVersion, "2.7.2");

let delayedApi = null;
setTimeout(() => {
  delayedApi = compatibleApi("2.7.1");
}, 20);
const delayedResult = await waitForCompatibleCore({
  getCoreModule: () => ({ active: true, version: "1.8.2", api: delayedApi }),
  timeoutMs: 250,
  intervalMs: 5
});
assert.equal(delayedResult.ok, true);
assert.equal(delayedResult.apiVersion, "2.7.1");

// A partially initialized API can expose version/registry before generation.
let partialApi = {
  version: "2.7.1",
  capabilities: {},
  helpers: { register() {} }
};
setTimeout(() => {
  partialApi = compatibleApi("2.7.1");
}, 20);
const partialResult = await waitForCompatibleCore({
  getCoreModule: () => ({ active: true, version: "1.8.2", api: partialApi }),
  timeoutMs: 250,
  intervalMs: 5
});
assert.equal(partialResult.ok, true);

const timeoutResult = await waitForCompatibleCore({
  getCoreModule: () => ({ active: true, version: "1.8.2", api: null }),
  timeoutMs: 15,
  intervalMs: 5
});
assert.equal(timeoutResult.ok, false);
assert.equal(timeoutResult.reason, COMPATIBILITY_REASON.API_UNAVAILABLE);
assert.equal(timeoutResult.timedOut, true);

console.log("Forge core compatibility tests passed");
