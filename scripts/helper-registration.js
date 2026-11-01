// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
function bindRegistrar(owner, names, source) {
  if (!owner) return null;
  for (const name of names) {
    if (typeof owner[name] === "function") {
      return {
        source: `${source}.${name}`,
        owner,
        register: owner[name].bind(owner)
      };
    }
  }
  return null;
}

/**
 * Resolve optional helper-directory registration across compatible Helper API
 * 2.x layouts. Helper registration improves discoverability but is not needed
 * for Forge's generation, assessment, storage, placement, or own sidebar entry.
 *
 * @param {object | null | undefined} api Runyth Encounter Crucible API object.
 * @returns {{available: boolean, source: string, register: Function | null}}
 */
export function resolveHelperRegistrar(api) {
  const candidates = [
    bindRegistrar(api?.helpers, ["register", "add"], "helpers"),
    bindRegistrar(api?.helperModules, ["register", "add"], "helperModules"),
    bindRegistrar(api?.extensions?.helpers, ["register", "add"], "extensions.helpers"),
    bindRegistrar(api?.registry?.helpers, ["register", "add"], "registry.helpers"),
    bindRegistrar(api, ["registerHelper", "registerHelperModule"], "api")
  ].filter(Boolean);

  const registrar = candidates[0];
  return registrar
    ? { available: true, ...registrar }
    : { available: false, source: "unavailable", register: null };
}

function normalizeCleanup(result, descriptor, registrar) {
  if (typeof result === "function") return result;
  if (result && typeof result.unregister === "function") return result.unregister.bind(result);
  if (result && typeof result.dispose === "function") return result.dispose.bind(result);
  if (result && typeof result.destroy === "function") return result.destroy.bind(result);

  const owner = registrar?.owner;
  const remove = owner && ["unregister", "remove", "delete"].find((name) => typeof owner[name] === "function");
  if (remove) return () => owner[remove](descriptor.id);
  return null;
}

/**
 * Idempotently bind one helper descriptor to an optional core helper registry.
 * A missing registry is a supported state: Forge remains fully operational and
 * exposes its own Combat Tracker and Module Settings launch surfaces.
 */
export class HelperRegistration {
  #api = null;
  #descriptorId = null;
  #unregister = null;
  #source = "unavailable";
  #registered = false;

  get api() {
    return this.#api;
  }

  get registered() {
    return this.#registered;
  }

  get source() {
    return this.#source;
  }

  register(api, descriptor) {
    if (this.#api === api && this.#descriptorId === descriptor?.id) {
      return Object.freeze({
        changed: false,
        api,
        registered: this.#registered,
        source: this.#source
      });
    }

    this.clear();
    const registrar = resolveHelperRegistrar(api);
    this.#api = api;
    this.#descriptorId = descriptor?.id ?? null;
    this.#source = registrar.source;

    if (!registrar.available) {
      return Object.freeze({
        changed: true,
        api,
        registered: false,
        source: registrar.source
      });
    }

    try {
      const result = registrar.register(descriptor);
      this.#unregister = normalizeCleanup(result, descriptor, registrar);
      this.#registered = true;
      return Object.freeze({
        changed: true,
        api,
        registered: true,
        source: registrar.source,
        error: null
      });
    } catch (error) {
      // Registration is optional discoverability. Preserve the usable core API
      // binding even when an advertised registry has an incompatible signature.
      this.#registered = false;
      this.#unregister = null;
      return Object.freeze({
        changed: true,
        api,
        registered: false,
        source: registrar.source,
        error
      });
    }
  }

  clear() {
    const hadState = Boolean(this.#api || this.#registered || this.#unregister);
    const unregister = this.#unregister;

    this.#api = null;
    this.#descriptorId = null;
    this.#unregister = null;
    this.#source = "unavailable";
    this.#registered = false;

    if (unregister) unregister();
    return hadState;
  }
}
