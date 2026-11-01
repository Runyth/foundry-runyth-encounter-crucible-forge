// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { CORE_ID, MODULE_ID, SETTINGS } from "./constants.js";
import { ForgeApp } from "./forge-app.js";
import { registerSettings } from "./settings.js";
import { HelperRegistration } from "./helper-registration.js";
import {
  COMPATIBILITY_REASON,
  CORE_REQUIREMENTS,
  inspectCoreCompatibility,
  waitForCompatibleCore
} from "./core-compatibility.js";

const helperRegistration = new HelperRegistration();
let readyReached = false;

function openForge() {
  return new ForgeApp().render({ force: true });
}

function helperDescriptor() {
  return {
    id: MODULE_ID,
    title: game.i18n.localize("ECCF.Title"),
    version: game.modules.get(MODULE_ID)?.version ?? "unknown",
    apiVersion: CORE_REQUIREMENTS.helperApiVersion,
    capabilities: [
      "actor-folder-source",
      "difficulty-slider",
      "composition-strategies",
      "trait-vocabulary-filters",
      "themed-journal-storage",
      "scene-placement",
      "saved-encounter-loading",
      "continuous-generation-targets",
      "uncapped-extreme-generation",
      "filtered-pool-fallback",
      "band-aware-generation",
      "canonical-cr-xp",
      "structured-ancestry",
      "constraint-first-generation",
      "composition-strategy-targets"
    ],
    open: openForge
  };
}

function registerWithCore(api) {
  const descriptor = helperDescriptor();
  const result = helperRegistration.register(api, descriptor);
  if (!result.changed) return true;

  ui.combat?.render?.({ force: true });
  if (result.registered) {
    console.info(`[${MODULE_ID}] Registered with Runyth Encounter Crucible API ${api.version} through ${result.source}.`);
  } else {
    // Helper-directory registration is optional. Forge remains reachable from
    // its own Combat Tracker button and Module Settings menu. Emit a best-effort
    // hook for cores that discover helpers through lifecycle hooks instead.
    Hooks.callAll(`${CORE_ID}.registerHelper`, descriptor);
    if (result.error) {
      console.warn(`[${MODULE_ID}] Optional Runyth Encounter Crucible helper registration through ${result.source} failed; Forge integration remains active.`, result.error);
    } else {
      console.info(`[${MODULE_ID}] Runyth Encounter Crucible API ${api.version} has no recognized helper registry; Forge integration remains active without directory registration.`);
    }
  }
  return true;
}

function compatibilityFailureMessage(result) {
  const reasonKey = `ECCF.Errors.CompatibilityReason.${result.reason}`;
  const translatedReason = game.i18n.localize(reasonKey);
  const localizedReason = translatedReason === reasonKey ? result.reason : translatedReason;

  return game.i18n.format("ECCF.Errors.ApiUnavailableDetailed", {
    reason: localizedReason,
    coreVersion: result.coreVersion,
    apiVersion: result.apiVersion,
    requiredCoreVersion: result.requiredCoreVersion,
    requiredApiVersion: result.requiredApiVersion,
    missingCapabilities: result.missingCapabilities?.join(", ") || "—"
  });
}

async function establishCoreIntegration({ notifyOnFailure = true } = {}) {
  const result = await waitForCompatibleCore({
    getCoreModule: () => game.modules.get(CORE_ID),
    timeoutMs: 5000,
    intervalMs: 100
  });

  if (result.ok) return registerWithCore(result.api);

  const message = compatibilityFailureMessage(result);
  if (notifyOnFailure) ui.notifications.error(message);
  console.error(`[${MODULE_ID}] Runyth Encounter Crucible compatibility check failed`, result);
  return false;
}

function handleCoreApiReady(api) {
  const coreModule = game.modules.get(CORE_ID);
  const result = inspectCoreCompatibility(coreModule ? {
    active: coreModule.active,
    version: coreModule.version,
    api
  } : null);
  if (!result.ok) {
    // The ready hook performs the bounded retry and user-facing diagnostic.
    if (readyReached && result.reason !== COMPATIBILITY_REASON.API_UNAVAILABLE) {
      ui.notifications.error(compatibilityFailureMessage(result));
    }
    return;
  }
  registerWithCore(result.api);
}

function addCombatTrackerButton(app, html) {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector("[data-runyth-encounter-crucible-forge]")) return;
  const header = root.querySelector(".window-header, header, .combat-tracker-header, .directory-header");
  if (!header) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.encounterCrucibleForge = "true";
  button.className = "eccf-sidebar-button";
  button.title = game.i18n.localize("ECCF.Sidebar.ButtonHint");
  button.setAttribute("aria-label", button.title);
  button.innerHTML = `<i class="fa-solid fa-hammer"></i><span>${game.i18n.localize("ECCF.Sidebar.ButtonLabel")}</span>`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    openForge();
  });
  header.append(button);
}

Hooks.once("init", () => registerSettings());
Hooks.on(`${CORE_ID}.apiReady`, handleCoreApiReady);
Hooks.on("renderCombatTracker", addCombatTrackerButton);

Hooks.once("ready", async () => {
  readyReached = true;

  // v1.4.1 migration: compound normalization is mandatory. Reset the
  // deprecated world toggle so old worlds cannot retain unsplit values.
  if (game.user.isGM && !game.settings.get(MODULE_ID, SETTINGS.SPLIT_COMPOUND_TRAITS)) {
    await game.settings.set(MODULE_ID, SETTINGS.SPLIT_COMPOUND_TRAITS, true);
  }

  await establishCoreIntegration({ notifyOnFailure: true });
});
