// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { CORE_ID, MODULE_ID, SETTINGS } from "./constants.js";
import { createCoreApiAdapter } from "./core-api-adapter.js";
import { expandVocabulary, prepareParticipantVocabulary, reconcileVocabularySelection } from "./vocabulary.js";
import { loadedEncounterDiagnostics, prepareLoadedEncounter } from "./saved-encounter.js";
import { actorFoldersFromGame, buildActorFolderTree, selectedActorFolderRow } from "./folder-tree.js";
import {
  centeredDefaultGeometry,
  readSavedWindowGeometry,
  registerGeometryApplication,
  sanitizeWindowGeometry,
  saveWindowGeometry,
  unregisterGeometryApplication
} from "./window-geometry.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const DEFAULT_OPTIONS = Object.freeze({
  preferQuantity: true,
  preferStrength: true,
  fixedGroupSize: false,
  desiredGroupSize: 4,
  maxEnemies: 10,
  allowDuplicates: true,
  preferSameCr: false,
  preferDiversity: true,
  includeBoss: false,
  bossEncounter: false,
  includeMinions: false,
  preferredRaces: [],
  strictRaces: false,
  preferredArchetypes: [],
  strictArchetypes: false
});

function formValues(element) {
  const data = new FormData(element);
  const value = (name, fallback = "") => data.get(name) ?? fallback;
  const checked = (name) => data.has(name);
  const values = (name) => data.getAll(name).map(String).filter(Boolean);
  return {
    savedEncounterId: String(value("savedEncounterId")),
    useCurrentParty: checked("useCurrentParty"),
    folderId: String(value("folderId")),
    recursive: checked("recursive"),
    partySource: String(value("partySource", "combat")),
    target: Number(value("target", 50)),
    options: {
      preferQuantity: checked("preferQuantity"),
      preferStrength: checked("preferStrength"),
      fixedGroupSize: checked("fixedGroupSize"),
      desiredGroupSize: Number(value("desiredGroupSize", 4)),
      maxEnemies: Number(value("maxEnemies", 10)),
      allowDuplicates: checked("allowDuplicates"),
      preferSameCr: checked("preferSameCr"),
      preferDiversity: checked("preferDiversity"),
      includeBoss: checked("includeBoss"),
      bossEncounter: checked("bossEncounter"),
      includeMinions: checked("includeMinions"),
      preferredRaces: expandVocabulary(values("preferredRaces")),
      strictRaces: checked("strictRaces"),
      preferredArchetypes: expandVocabulary(values("preferredArchetypes")),
      strictArchetypes: checked("strictArchetypes")
    }
  };
}

function vocabularyConfiguration() {
  return {
    splitCompounds: true,
    raceWhitelist: game.settings.get(MODULE_ID, SETTINGS.RACE_WHITELIST),
    raceBlacklist: game.settings.get(MODULE_ID, SETTINGS.RACE_BLACKLIST),
    archetypeWhitelist: game.settings.get(MODULE_ID, SETTINGS.ARCHETYPE_WHITELIST),
    archetypeBlacklist: game.settings.get(MODULE_ID, SETTINGS.ARCHETYPE_BLACKLIST)
  };
}

function prepareCandidates(actors, api) {
  const configuration = vocabularyConfiguration();
  return actors
    .map((actor) => api.actors.normalize(actor, { side: "enemy" }))
    .filter(Boolean)
    .map((participant) => prepareParticipantVocabulary(participant, configuration));
}

function selectedValues(values, availableValues) {
  return reconcileVocabularySelection(values, availableValues);
}

function resolveStrategyMode(api, options = {}) {
  return createCoreApiAdapter(api).generation.resolveCompositionMode(options);
}

function strategyPresentation(api, options = {}) {
  const mode = resolveStrategyMode(api, options);
  return {
    mode,
    label: game.i18n.localize(`ECCF.Strategy.Mode.${mode}`),
    hint: game.i18n.localize(`ECCF.Strategy.ModeHint.${mode}`)
  };
}

function countValues(participants, selector) {
  const counts = new Map();
  for (const participant of participants) {
    for (const value of selector(participant)) counts.set(value, (counts.get(value) ?? 0) + Number(participant.quantity ?? 1));
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value]) => value);
}

function deriveTheme(encounter, options, folderId) {
  const mode = game.settings.get(MODULE_ID, SETTINGS.THEME_MODE);
  const fallback = game.settings.get(MODULE_ID, SETTINGS.FALLBACK_THEME) || "Mixed Encounters";
  const enemies = encounter?.participants?.filter((participant) => participant.side === "enemy") ?? [];
  const races = countValues(enemies, (participant) => participant.traits?.primaryRaces ?? participant.traits?.races ?? []);
  const archetypes = countValues(enemies, (participant) => participant.traits?.archetypes ?? []);
  const preferredRace = options.preferredRaces?.[0];
  const preferredArchetype = options.preferredArchetypes?.[0];
  if (mode === "sourceFolder") return game.folders.get(folderId)?.name || fallback;
  if (mode === "preferred") return [preferredRace, preferredArchetype].filter(Boolean).join(" + ") || fallback;
  if (mode === "dominantRace") return races[0] || fallback;
  if (mode === "dominantArchetype") return archetypes[0] || fallback;
  return [preferredRace || races[0], preferredArchetype || archetypes[0]].filter(Boolean).join(" + ") || fallback;
}

export class ForgeApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "runyth-encounter-crucible-forge",
    classes: ["runyth-encounter-crucible-forge"],
    tag: "form",
    window: { title: "ECCF.Title", icon: "fa-solid fa-hammer", resizable: true },
    position: { width: 760, height: 760 },
    actions: {
      generate: ForgeApp.#generate,
      loadSavedEncounter: ForgeApp.#loadSavedEncounter,
      openInCrucible: ForgeApp.#openInCrucible,
      saveEncounter: ForgeApp.#saveEncounter,
      placeOnScene: ForgeApp.#placeOnScene,
      chooseAlternative: ForgeApp.#chooseAlternative
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/forge.hbs`, scrollable: [".eccf-scroll"] }
  };

  constructor(options = {}) {
    const savedGeometry = readSavedWindowGeometry();
    const applicationOptions = {
      ...options,
      position: {
        ...savedGeometry,
        ...(options.position ?? {})
      }
    };
    super(applicationOptions);
    this.result = null;
    this.selectedAlternative = -1;
    this.busy = false;
    this._geometrySaveTimer = null;
    this._pendingGeometry = null;
    this._persistGeometry = true;
    this._folderSearchQuery = "";
    this._collapsedFolderIds = new Set();
    registerGeometryApplication(this);
  }

  _onPosition(position) {
    super._onPosition(position);
    if (!this._persistGeometry || !this.rendered) return;
    const geometry = sanitizeWindowGeometry(this.position);
    if (!Object.keys(geometry).length) return;
    this._pendingGeometry = geometry;
    clearTimeout(this._geometrySaveTimer);
    this._geometrySaveTimer = setTimeout(() => {
      this.#flushWindowGeometry().catch((error) => {
        console.warn(`[${MODULE_ID}] Could not save Forge window geometry`, error);
      });
    }, 250);
  }

  async _preClose(options) {
    await this.#flushWindowGeometry();
    await super._preClose(options);
  }

  _onClose(options) {
    clearTimeout(this._geometrySaveTimer);
    unregisterGeometryApplication(this);
    super._onClose(options);
  }

  resetWindowGeometry() {
    clearTimeout(this._geometrySaveTimer);
    this._geometrySaveTimer = null;
    this._pendingGeometry = null;
    this._persistGeometry = false;
    try {
      this.setPosition(centeredDefaultGeometry());
    } finally {
      this._persistGeometry = true;
    }
  }

  async #flushWindowGeometry() {
    clearTimeout(this._geometrySaveTimer);
    this._geometrySaveTimer = null;
    if (!this._pendingGeometry) return;
    const geometry = this._pendingGeometry;
    this._pendingGeometry = null;
    await saveWindowGeometry(geometry);
  }

  async _prepareContext() {
    const api = game.modules.get(CORE_ID)?.api;
    const core = createCoreApiAdapter(api);
    const selectedFolder = game.settings.get(MODULE_ID, SETTINGS.FOLDER_ID);
    const options = { ...DEFAULT_OPTIONS, ...(game.settings.get(MODULE_ID, SETTINGS.OPTIONS) ?? {}) };
    const storedTarget = Number(game.settings.get(MODULE_ID, SETTINGS.TARGET));
    const target = Number.isFinite(storedTarget) ? Math.max(0, Math.min(100, storedTarget)) : 50;
    const targetInfo = core.generation.sliderToTarget(target);
    const recursiveFolders = game.settings.get(MODULE_ID, SETTINGS.RECURSIVE);
    const folderRows = buildActorFolderTree(actorFoldersFromGame(game), game.actors?.contents ?? [], selectedFolder);
    const selectedFolderRow = selectedActorFolderRow(folderRows, selectedFolder);
    const actors = selectedFolder && typeof api?.actors?.collectFromFolder === "function"
      ? api.actors.collectFromFolder(selectedFolder, { recursive: recursiveFolders })
      : [];
    const normalized = api ? prepareCandidates(actors, api) : [];
    const raceValues = [...new Set(normalized.flatMap((actor) => actor.traits?.primaryRaces ?? actor.traits?.races ?? []))].sort((a, b) => a.localeCompare(b));
    const archetypeValues = [...new Set(normalized.flatMap((actor) => actor.traits?.archetypes ?? []))].sort((a, b) => a.localeCompare(b));
    options.preferredRaces = selectedValues(options.preferredRaces, raceValues);
    options.preferredArchetypes = selectedValues(options.preferredArchetypes, archetypeValues);
    const strategy = strategyPresentation(api, options);
    const encounter = this.#currentEncounter();
    const assessment = this.#currentAssessment();
    const themePreview = encounter ? deriveTheme(encounter, options, selectedFolder) : "";
    const nameFormat = game.settings.get(MODULE_ID, SETTINGS.NAME_FORMAT);
    const namePreview = encounter && assessment && api?.storage?.previewName
      ? api.storage.previewName(encounter, {
          name: encounter.displayName ?? encounter.name,
          difficulty: assessment.overall,
          theme: themePreview,
          nameFormat
        }).name
      : "";

    return {
      apiAvailable: core.generation.available,
      folders: folderRows,
      folderCount: folderRows.length,
      hasFolders: folderRows.length > 0,
      selectedFolder,
      selectedFolderExists: Boolean(selectedFolderRow),
      selectedFolderLabel: selectedFolderRow?.path ?? game.i18n.localize("ECCF.Source.NoFolderSelected"),
      selectedFolderActorCount: selectedFolderRow?.recursiveActorCount ?? 0,
      folderSearchQuery: this._folderSearchQuery,
      recursive: recursiveFolders,
      partySource: game.settings.get(MODULE_ID, SETTINGS.PARTY_SOURCE),
      partySources: {
        combat: game.settings.get(MODULE_ID, SETTINGS.PARTY_SOURCE) === "combat",
        selection: game.settings.get(MODULE_ID, SETTINGS.PARTY_SOURCE) === "selection",
        players: game.settings.get(MODULE_ID, SETTINGS.PARTY_SOURCE) === "players"
      },
      target,
      targetBand: game.i18n.localize(`ECCF.Difficulty.${targetInfo.band}`),
      options,
      strategy,
      raceOptions: raceValues.map((value) => ({ value, selected: options.preferredRaces?.includes(value) })),
      archetypeOptions: archetypeValues.map((value) => ({ value, selected: options.preferredArchetypes?.includes(value) })),
      storage: api?.storage?.describe?.(),
      savedEncounters: (api?.storage?.list?.() ?? []).map((saved) => ({
        id: saved.journalId ?? saved.id,
        name: saved.name,
        displayName: saved.displayName ?? saved.name,
        folder: saved.storage?.folderPath?.slice(1).join(" → ") || saved.storageMetadata?.theme || "Runyth Encounter Crucible"
      })),
      hasSavedEncounters: Boolean(api?.storage?.list?.()?.length),
      busy: this.busy,
      hasResult: Boolean(encounter && assessment),
      encounter: encounter ? {
        ...encounter,
        enemies: encounter.participants.filter((participant) => participant.side === "enemy"),
        party: encounter.participants.filter((participant) => participant.side === "party")
      } : null,
      assessment: assessment ? {
        ...assessment,
        overallLabel: game.i18n.localize(`ECCF.Difficulty.${assessment.overall}`),
        scoreDisplay: assessment.score.toFixed(2)
      } : null,
      alternatives: (this.result?.alternatives ?? []).map((alternative, index) => ({
        index,
        selected: index === this.selectedAlternative,
        label: game.i18n.localize(`ECCF.Difficulty.${alternative.assessment.overall}`),
        count: alternative.encounter.participants.filter((participant) => participant.side === "enemy").reduce((sum, participant) => sum + participant.quantity, 0)
      })),
      diagnostics: (() => {
        const diagnostics = this.#currentDiagnostics();
        if (!diagnostics) return null;
        return {
          ...diagnostics,
          targetRawXpDisplay: Math.round(Number(diagnostics.targetRawXp ?? 0)),
          rawEnemyXpDisplay: Math.round(Number(diagnostics.rawEnemyXp ?? 0)),
          targetAdjustedXp2014Display: Math.round(Number(diagnostics.targetAdjustedXp2014 ?? 0)),
          adjustedXp2014Display: Math.round(Number(diagnostics.adjustedXp2014 ?? 0)),
          targetRatioDisplay: `${Math.round(Number(diagnostics.targetRatio ?? 0) * 100)}%`,
          fitStatusLabel: game.i18n.localize(`ECCF.Result.Fit.${diagnostics.fitStatus ?? "close"}`),
          targetBandLabel: game.i18n.localize(`ECCF.Difficulty.${diagnostics.targetBand ?? "challenging"}`),
          actualBandLabel: game.i18n.localize(`ECCF.Difficulty.${diagnostics.actualBand ?? assessment?.overall ?? "challenging"}`),
          correctedXpCount: Number(diagnostics.correctedXpCount ?? 0),
          strategyModeLabel: game.i18n.localize(`ECCF.Strategy.Mode.${diagnostics.strategyMode ?? diagnostics.composition?.mode ?? "neutral"}`),
          targetEnemyCount: diagnostics.targetEnemyCount ?? diagnostics.composition?.targetCount ?? "—",
          plainPreferredRaceCandidateCount: Number(diagnostics.plainPreferredRaceCandidateCount ?? 0),
          qualifiedPreferredRaceCandidateCount: Number(diagnostics.qualifiedPreferredRaceCandidateCount ?? 0),
          qualifiedRaceExcludedCount: Number(diagnostics.qualifiedRaceExcludedCount ?? 0),
          hasWarnings: Boolean(diagnostics.warnings?.length)
        };
      })(),
      saveName: encounter?.displayName ?? encounter?.name ?? "",
      themePreview,
      namePreview,
      nameFormat
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    registerGeometryApplication(this);
    const slider = this.element.querySelector("[name='target']");
    const output = this.element.querySelector("[data-target-label]");
    const folderInput = this.element.querySelector("[name='folderId']");
    const folderSearch = this.element.querySelector("[data-folder-search]");
    const folderRows = [...this.element.querySelectorAll("[data-folder-row]")];
    const folderToggles = [...this.element.querySelectorAll("[data-folder-toggle]")];
    const folderSelectors = [...this.element.querySelectorAll("[data-folder-select]")];
    const folderClear = this.element.querySelector("[data-folder-clear]");
    const folderExpandAll = this.element.querySelector("[data-folder-expand-all]");
    const folderCollapseAll = this.element.querySelector("[data-folder-collapse-all]");
    const quantity = this.element.querySelector("[name='preferQuantity']");
    const strength = this.element.querySelector("[name='preferStrength']");
    const fixed = this.element.querySelector("[name='fixedGroupSize']");
    const strategyLabel = this.element.querySelector("[data-strategy-mode-label]");
    const strategyHint = this.element.querySelector("[data-strategy-mode-hint]");
    const updateFolderTreeVisibility = () => {
      const rawQuery = String(folderSearch?.value ?? "").trim();
      const query = rawQuery.toLocaleLowerCase();
      this._folderSearchQuery = rawQuery;
      const directMatches = new Set();
      const visibleForSearch = new Set();

      if (query) {
        for (const row of folderRows) {
          if (String(row.dataset.folderSearchValue ?? "").includes(query)) directMatches.add(row.dataset.folderId);
        }
        for (const row of folderRows) {
          if (!directMatches.has(row.dataset.folderId)) continue;
          visibleForSearch.add(row.dataset.folderId);
          for (const ancestorId of String(row.dataset.folderAncestorIds ?? "").split(",").filter(Boolean)) visibleForSearch.add(ancestorId);
        }
      }

      for (const row of folderRows) {
        const ancestors = String(row.dataset.folderAncestorIds ?? "").split(",").filter(Boolean);
        const hiddenByCollapse = !query && ancestors.some((id) => this._collapsedFolderIds.has(id));
        const hiddenBySearch = Boolean(query) && !visibleForSearch.has(row.dataset.folderId);
        row.hidden = hiddenByCollapse || hiddenBySearch;
        row.classList.toggle("eccf-folder-search-match", Boolean(query) && directMatches.has(row.dataset.folderId));
      }

      for (const toggle of folderToggles) {
        const id = toggle.dataset.folderToggle;
        const collapsed = this._collapsedFolderIds.has(id);
        toggle.setAttribute("aria-expanded", String(!collapsed));
        const icon = toggle.querySelector("i");
        icon?.classList.toggle("fa-chevron-right", collapsed);
        icon?.classList.toggle("fa-chevron-down", !collapsed);
      }
    };

    folderSearch?.addEventListener("input", updateFolderTreeVisibility);
    for (const toggle of folderToggles) {
      toggle.addEventListener("click", () => {
        const id = toggle.dataset.folderToggle;
        if (this._collapsedFolderIds.has(id)) this._collapsedFolderIds.delete(id);
        else this._collapsedFolderIds.add(id);
        updateFolderTreeVisibility();
      });
    }
    for (const selector of folderSelectors) {
      selector.addEventListener("click", async () => {
        const id = selector.dataset.folderSelect;
        if (!id || id === folderInput?.value) return;
        if (folderInput) folderInput.value = id;
        await game.settings.set(MODULE_ID, SETTINGS.FOLDER_ID, id);
        this.render({ force: true });
      });
    }
    folderClear?.addEventListener("click", async () => {
      if (folderInput) folderInput.value = "";
      await game.settings.set(MODULE_ID, SETTINGS.FOLDER_ID, "");
      this.render({ force: true });
    });
    folderExpandAll?.addEventListener("click", () => {
      this._collapsedFolderIds.clear();
      updateFolderTreeVisibility();
    });
    folderCollapseAll?.addEventListener("click", () => {
      for (const toggle of folderToggles) this._collapsedFolderIds.add(toggle.dataset.folderToggle);
      updateFolderTreeVisibility();
    });
    updateFolderTreeVisibility();

    slider?.addEventListener("input", () => {
      const api = game.modules.get(CORE_ID)?.api;
      const target = createCoreApiAdapter(api).generation.sliderToTarget(Number(slider.value));
      if (output && target) output.textContent = game.i18n.localize(`ECCF.Difficulty.${target.band}`);
    });

    const refreshStrategy = () => {
      const api = game.modules.get(CORE_ID)?.api;
      const strategy = strategyPresentation(api, {
        preferQuantity: Boolean(quantity?.checked),
        preferStrength: Boolean(strength?.checked),
        fixedGroupSize: Boolean(fixed?.checked)
      });
      if (strategyLabel) strategyLabel.textContent = strategy.label;
      if (strategyHint) strategyHint.textContent = strategy.hint;
      this.element.classList.toggle("eccf-fixed-strategy", strategy.mode === "fixed");
    };
    quantity?.addEventListener("change", refreshStrategy);
    strength?.addEventListener("change", refreshStrategy);
    fixed?.addEventListener("change", refreshStrategy);
    refreshStrategy();
  }


  static async #loadSavedEncounter() {
    const api = game.modules.get(CORE_ID)?.api;
    if (!api?.storage?.get) return ui.notifications.error(game.i18n.localize("ECCF.Errors.ApiUnavailable"));
    const values = formValues(this.element);
    if (!values.savedEncounterId) return ui.notifications.warn(game.i18n.localize("ECCF.Errors.NoSavedEncounter"));
    const saved = api.storage.get(values.savedEncounterId);
    if (!saved) return ui.notifications.error(game.i18n.localize("ECCF.Errors.SavedEncounterMissing"));

    try {
      const currentParty = values.useCurrentParty ? api.party.resolve(values.partySource) : [];
      if (values.useCurrentParty && !currentParty.length) throw new Error(game.i18n.localize("ECCF.Errors.NoParty"));
      const encounter = prepareLoadedEncounter(saved, currentParty, values.useCurrentParty);
      const { assessment } = await api.analyseDefinition(encounter);
      const diagnostics = loadedEncounterDiagnostics(encounter, assessment);
      this.result = { encounter, assessment, diagnostics, alternatives: [], loadedFromJournal: true };
      this.selectedAlternative = -1;
      const target = Math.round(Math.max(0, Math.min(4, Number(assessment.score ?? 0))) * 25);
      await game.settings.set(MODULE_ID, SETTINGS.TARGET, target);
      ui.notifications.info(game.i18n.format("ECCF.Messages.Loaded", { name: saved.name }));
      this.render({ force: true });
    } catch (error) {
      console.error(`[${MODULE_ID}] Saved encounter loading failed`, error);
      ui.notifications.error(error.message);
    }
  }

  static async #generate() {
    const api = game.modules.get(CORE_ID)?.api;
    const core = createCoreApiAdapter(api);
    if (!core.generation.available) return ui.notifications.error(game.i18n.localize("ECCF.Errors.ApiUnavailable"));
    const values = formValues(this.element);
    if (!values.folderId) return ui.notifications.warn(game.i18n.localize("ECCF.Errors.NoFolder"));

    this.busy = true;
    this.render({ force: true });
    try {
      await Promise.all([
        game.settings.set(MODULE_ID, SETTINGS.FOLDER_ID, values.folderId),
        game.settings.set(MODULE_ID, SETTINGS.RECURSIVE, values.recursive),
        game.settings.set(MODULE_ID, SETTINGS.PARTY_SOURCE, values.partySource),
        game.settings.set(MODULE_ID, SETTINGS.TARGET, values.target),
        game.settings.set(MODULE_ID, SETTINGS.OPTIONS, values.options)
      ]);

      const party = api.party.resolve(values.partySource);
      if (!party.length) throw new Error(game.i18n.localize("ECCF.Errors.NoParty"));
      const actors = api.actors.collectFromFolder(values.folderId, { recursive: values.recursive });
      const candidates = prepareCandidates(actors, api);
      if (!candidates.length) throw new Error(game.i18n.localize("ECCF.Errors.NoActors"));

      this.result = await core.generation.suggest({
        party,
        candidates,
        target: values.target,
        options: values.options
      });
      this.selectedAlternative = -1;
    } catch (error) {
      console.error(`[${MODULE_ID}] Encounter generation failed`, error);
      ui.notifications.error(error.message);
    } finally {
      this.busy = false;
      this.render({ force: true });
    }
  }

  static async #openInCrucible() {
    const encounter = this.#currentEncounter();
    if (!encounter) return;
    await game.modules.get(CORE_ID).api.openDashboard({ definition: encounter });
  }

  static async #saveEncounter() {
    const encounter = this.#currentEncounter();
    if (!encounter) return;
    const api = game.modules.get(CORE_ID).api;
    const customName = this.element.querySelector("[name='saveName']")?.value?.trim() || encounter.name;
    const options = { ...DEFAULT_OPTIONS, ...(game.settings.get(MODULE_ID, SETTINGS.OPTIONS) ?? {}) };
    const theme = deriveTheme(encounter, options, game.settings.get(MODULE_ID, SETTINGS.FOLDER_ID));
    const assessment = this.#currentAssessment();
    const saved = await api.storage.save({ ...encounter, name: customName }, {
      name: customName,
      difficulty: assessment?.overall ?? "unrated",
      theme,
      organizeByTheme: game.settings.get(MODULE_ID, SETTINGS.ORGANIZE_BY_THEME),
      nameFormat: game.settings.get(MODULE_ID, SETTINGS.NAME_FORMAT)
    });
    ui.notifications.info(game.i18n.format("ECCF.Messages.Saved", { name: saved.name, folder: saved.storage.folderPathLabel, type: saved.storage.type }));
  }

  static async #placeOnScene() {
    const encounter = this.#currentEncounter();
    if (!encounter) return;
    const addToCombat = Boolean(this.element.querySelector("[name='addToCombat']")?.checked);
    try {
      const result = await game.modules.get(CORE_ID).api.placement.placeEncounter(encounter, { addToCombat });
      ui.notifications.info(game.i18n.format("ECCF.Messages.Placed", { count: result.createdCount, scene: result.sceneName }));
      if (result.missing.length) ui.notifications.warn(game.i18n.format("ECCF.Messages.MissingActors", { count: result.missing.length }));
    } catch (error) {
      console.error(`[${MODULE_ID}] Token placement failed`, error);
      ui.notifications.error(error.message);
    }
  }

  static async #chooseAlternative(event, target) {
    this.selectedAlternative = Number(target.dataset.index);
    this.render({ force: true });
  }

  #currentAlternative() {
    return this.selectedAlternative >= 0 ? this.result?.alternatives?.[this.selectedAlternative] : null;
  }

  #currentEncounter() {
    return this.#currentAlternative()?.encounter ?? this.result?.encounter ?? null;
  }

  #currentAssessment() {
    return this.#currentAlternative()?.assessment ?? this.result?.assessment ?? null;
  }

  #currentDiagnostics() {
    return this.#currentAlternative()?.diagnostics ?? this.result?.diagnostics ?? null;
  }
}
