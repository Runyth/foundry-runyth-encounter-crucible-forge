// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { HelperRegistration, resolveHelperRegistrar } from "../scripts/helper-registration.js";

function api(name, calls) {
  return {
    name,
    helpers: {
      register(descriptor) {
        calls.push(["register", name, descriptor.id]);
        return () => calls.push(["unregister", name, descriptor.id]);
      }
    }
  };
}

const calls = [];
const registration = new HelperRegistration();
const firstApi = api("first", calls);
const secondApi = api("second", calls);
const descriptor = { id: "runyth-encounter-crucible-forge", title: "Forge" };

assert.equal(resolveHelperRegistrar(firstApi).source, "helpers.register");
assert.equal(registration.registered, false);
assert.equal(registration.register(firstApi, descriptor).changed, true);
assert.equal(registration.registered, true);
assert.equal(registration.source, "helpers.register");
assert.equal(registration.api, firstApi);
assert.equal(registration.register(firstApi, descriptor).changed, false);
assert.deepEqual(calls, [["register", "first", descriptor.id]]);

assert.equal(registration.register(secondApi, descriptor).changed, true);
assert.equal(registration.api, secondApi);
assert.deepEqual(calls, [
  ["register", "first", descriptor.id],
  ["unregister", "first", descriptor.id],
  ["register", "second", descriptor.id]
]);

assert.equal(registration.clear(), true);
assert.equal(registration.clear(), false);
assert.equal(registration.registered, false);
assert.deepEqual(calls.at(-1), ["unregister", "second", descriptor.id]);

// Helper registry is optional: integration remains idempotently bound to the API.
const noRegistryApi = { version: "2.7.2", generation: { async suggest() {} } };
const optional = registration.register(noRegistryApi, descriptor);
assert.equal(optional.changed, true);
assert.equal(optional.registered, false);
assert.equal(optional.source, "unavailable");
assert.equal(registration.api, noRegistryApi);
assert.equal(registration.registered, false);
assert.equal(registration.register(noRegistryApi, descriptor).changed, false);
assert.equal(registration.clear(), true);

// Alternate Helper API 2.x registry layouts remain supported.
const aliases = [
  [{ helperModules: { register() {} } }, "helperModules.register"],
  [{ extensions: { helpers: { add() {} } } }, "extensions.helpers.add"],
  [{ registry: { helpers: { register() {} } } }, "registry.helpers.register"],
  [{ registerHelper() {} }, "api.registerHelper"],
  [{ registerHelperModule() {} }, "api.registerHelperModule"]
];
for (const [candidate, source] of aliases) {
  assert.equal(resolveHelperRegistrar(candidate).source, source);
}

// A present but incompatible optional registrar must not disable core integration.
const throwingApi = {
  version: "2.7.2",
  helpers: {
    register() {
      throw new TypeError("unsupported descriptor shape");
    }
  }
};
const throwingResult = registration.register(throwingApi, descriptor);
assert.equal(throwingResult.changed, true);
assert.equal(throwingResult.registered, false);
assert.equal(throwingResult.source, "helpers.register");
assert.match(throwingResult.error.message, /unsupported descriptor shape/);
assert.equal(registration.api, throwingApi);
assert.equal(registration.clear(), true);

console.log("Forge helper registration tests passed");
