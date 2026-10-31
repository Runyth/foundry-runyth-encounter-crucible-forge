// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import {
  createCoreApiAdapter,
  declaredCapability,
  fallbackSliderToTarget,
  hasCoreCapability,
  resolveGenerationFacade
} from "../scripts/core-api-adapter.js";

const requests = [];
const standardApi = {
  constants: { difficultyBands: ["trivial", "manageable", "challenging", "dangerous", "extreme"] },
  capabilities: {},
  generation: {
    sliderToTarget(value) {
      return { value, score: 2, band: "challenging" };
    },
    resolveCompositionMode() {
      return "quantity";
    },
    async suggest(request) {
      requests.push(request);
      return { ok: true };
    }
  }
};

assert.equal(resolveGenerationFacade(standardApi).source, "generation");
assert.equal(hasCoreCapability(standardApi, "encounterGeneration"), true);
assert.equal(createCoreApiAdapter(standardApi).generation.sliderToTarget(45).band, "challenging");
assert.equal(createCoreApiAdapter(standardApi).generation.resolveCompositionMode({}), "quantity");
assert.deepEqual(await createCoreApiAdapter(standardApi).generation.suggest({ target: 45 }), { ok: true });
assert.deepEqual(requests, [{ target: 45 }]);

const aliasApi = {
  version: "2.7.1",
  encounterGeneration: {
    async generate(request) {
      return { request };
    }
  }
};
const aliasAdapter = createCoreApiAdapter(aliasApi);
assert.equal(aliasAdapter.generation.available, true);
assert.equal(aliasAdapter.generation.source, "encounterGeneration");
assert.equal(aliasAdapter.generation.sliderToTarget(0).band, "trivial");
assert.equal(aliasAdapter.generation.sliderToTarget(100).band, "extreme");
assert.deepEqual(await aliasAdapter.generation.suggest({ target: 75 }), { request: { target: 75 } });

// Callable generation facades are valid API evidence and retain their owner.
const callableApi = {
  prefix: "callable",
  async generation(request) {
    return { prefix: this.prefix, request };
  },
  sliderToTarget(value) {
    return { value, score: 1, band: "manageable" };
  }
};
const callableAdapter = createCoreApiAdapter(callableApi);
assert.equal(callableAdapter.generation.available, true);
assert.equal(callableAdapter.generation.source, "generation");
assert.equal(callableAdapter.generation.sliderToTarget(25).band, "manageable");
assert.deepEqual(await callableAdapter.generation.suggest({ target: 25 }), {
  prefix: "callable",
  request: { target: 25 }
});

// Service aliases and root-level optional helpers remain compatible.
const serviceApi = {
  sliderToTarget(value) {
    return { value, score: 3, band: "dangerous" };
  },
  services: {
    generator: {
      async generate(request) {
        return { service: true, request };
      }
    }
  }
};
const serviceAdapter = createCoreApiAdapter(serviceApi);
assert.equal(serviceAdapter.generation.source, "services.generator");
assert.equal(serviceAdapter.generation.sliderToTarget(75).band, "dangerous");
assert.deepEqual(await serviceAdapter.generation.suggest({ target: 75 }), {
  service: true,
  request: { target: 75 }
});

const structurallyCompatibleApi = {
  capabilities: { encounterGeneration: false },
  generation: {
    async suggest() {
      return {};
    }
  }
};
assert.equal(declaredCapability(structurallyCompatibleApi, "encounterGeneration"), false);
assert.equal(hasCoreCapability(structurallyCompatibleApi, "encounterGeneration"), true);

assert.equal(declaredCapability({ capabilities: ["encounterGeneration"] }, "encounterGeneration"), true);
assert.equal(declaredCapability({ capabilities: new Set(["encounterGeneration"]) }, "encounterGeneration"), true);
assert.equal(declaredCapability({ capabilities: { has: (value) => value === "encounterGeneration" } }, "encounterGeneration"), true);
assert.equal(hasCoreCapability({}, "encounterGeneration"), false);

assert.deepEqual(fallbackSliderToTarget(-10), { value: 0, score: 0, band: "trivial" });
assert.deepEqual(fallbackSliderToTarget(50), { value: 50, score: 2, band: "challenging" });
assert.deepEqual(fallbackSliderToTarget(200), { value: 100, score: 4, band: "extreme" });
assert.deepEqual(fallbackSliderToTarget(undefined), { value: 50, score: 2, band: "challenging" });

// Optional display helpers cannot break dashboard context preparation.
const throwingSliderApi = {
  generation: {
    sliderToTarget() {
      throw new Error("not ready");
    },
    resolveCompositionMode() {
      throw new Error("not ready");
    },
    async suggest() {
      return {};
    }
  }
};
const throwingAdapter = createCoreApiAdapter(throwingSliderApi);
assert.deepEqual(throwingAdapter.generation.sliderToTarget(0), { value: 0, score: 0, band: "trivial" });
assert.equal(
  throwingAdapter.generation.resolveCompositionMode({ preferQuantity: true, preferStrength: true }),
  "balanced"
);

const malformedSliderApi = {
  generation: {
    sliderToTarget() {
      return { band: "not-a-band", score: Number.NaN };
    },
    resolveCompositionMode() {
      return "unknown-mode";
    },
    async suggest() {
      return {};
    }
  }
};
const malformedAdapter = createCoreApiAdapter(malformedSliderApi);
assert.deepEqual(malformedAdapter.generation.sliderToTarget(100), { band: "extreme", score: 4, value: 100 });
assert.equal(malformedAdapter.generation.resolveCompositionMode({ preferStrength: true }), "strength");

// Facades are resolved at invocation time, allowing late core API population.
const lateApi = {};
const lateAdapter = createCoreApiAdapter(lateApi);
assert.equal(lateAdapter.generation.available, false);
lateApi.generation = {
  async suggest(request) {
    return { late: true, request };
  }
};
assert.equal(lateAdapter.generation.available, true);
assert.deepEqual(await lateAdapter.generation.suggest({ target: 50 }), {
  late: true,
  request: { target: 50 }
});

console.log("Forge core API adapter tests passed");

// Folder traversal only requires the core's collection operation. Folder
// discovery itself is owned by Foundry via game.actors.folders in Forge 1.9.6.
assert.equal(hasCoreCapability({ actors: { collectFromFolder() {} } }, "actorFolderTraversal"), true);
assert.equal(hasCoreCapability({ actors: { listFolders() {} } }, "actorFolderTraversal"), false);
