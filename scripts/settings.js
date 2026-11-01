// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID, SETTINGS } from "./constants.js";
import { ForgeApp } from "./forge-app.js";
import { ResetWindowGeometryApp } from "./reset-window-app.js";

export function registerSettings() {
  game.settings.registerMenu(MODULE_ID, "forge", {
    name: "ECCF.Settings.MenuName",
    label: "ECCF.Settings.MenuLabel",
    hint: "ECCF.Settings.MenuHint",
    icon: "fa-solid fa-hammer",
    type: ForgeApp,
    restricted: true
  });
  game.settings.registerMenu(MODULE_ID, "resetWindowGeometry", {
    name: "ECCF.WindowGeometry.MenuName",
    label: "ECCF.WindowGeometry.MenuLabel",
    hint: "ECCF.WindowGeometry.MenuHint",
    icon: "fa-solid fa-window-restore",
    type: ResetWindowGeometryApp,
    restricted: true
  });
  game.settings.register(MODULE_ID, SETTINGS.WINDOW_GEOMETRY, { scope: "client", config: false, type: Object, default: {} });
  game.settings.register(MODULE_ID, SETTINGS.FOLDER_ID, { scope: "world", config: false, type: String, default: "" });
  game.settings.register(MODULE_ID, SETTINGS.RECURSIVE, { scope: "world", config: false, type: Boolean, default: true });
  game.settings.register(MODULE_ID, SETTINGS.PARTY_SOURCE, { scope: "world", config: false, type: String, default: "combat" });
  game.settings.register(MODULE_ID, SETTINGS.TARGET, { scope: "world", config: false, type: Number, default: 50 });
  game.settings.register(MODULE_ID, SETTINGS.OPTIONS, { scope: "world", config: false, type: Object, default: {} });
  game.settings.register(MODULE_ID, SETTINGS.ORGANIZE_BY_THEME, { name: "ECCF.Settings.OrganizeTheme", hint: "ECCF.Settings.OrganizeThemeHint", scope: "world", config: true, restricted: true, type: Boolean, default: true });
  game.settings.register(MODULE_ID, SETTINGS.THEME_MODE, { name: "ECCF.Settings.ThemeMode", hint: "ECCF.Settings.ThemeModeHint", scope: "world", config: true, restricted: true, type: String, choices: { preferred: "ECCF.Settings.ThemePreferred", dominantRace: "ECCF.Settings.ThemeRace", dominantArchetype: "ECCF.Settings.ThemeArchetype", combined: "ECCF.Settings.ThemeCombined", sourceFolder: "ECCF.Settings.ThemeSourceFolder" }, default: "combined" });
  game.settings.register(MODULE_ID, SETTINGS.NAME_FORMAT, { name: "ECCF.Settings.NameFormat", hint: "ECCF.Settings.NameFormatHint", scope: "world", config: true, restricted: true, type: String, default: "[P{partySize}-L{averageLevel}-{difficulty}] {name}" });
  game.settings.register(MODULE_ID, SETTINGS.FALLBACK_THEME, { name: "ECCF.Settings.FallbackTheme", hint: "ECCF.Settings.FallbackThemeHint", scope: "world", config: true, restricted: true, type: String, default: "Mixed Encounters" });
  game.settings.register(MODULE_ID, SETTINGS.SPLIT_COMPOUND_TRAITS, { scope: "world", config: false, restricted: true, type: Boolean, default: true });
  game.settings.register(MODULE_ID, SETTINGS.RACE_WHITELIST, { name: "ECCF.Settings.RaceWhitelist", hint: "ECCF.Settings.RaceWhitelistHint", scope: "world", config: true, restricted: true, type: String, default: "" });
  game.settings.register(MODULE_ID, SETTINGS.RACE_BLACKLIST, { name: "ECCF.Settings.RaceBlacklist", hint: "ECCF.Settings.RaceBlacklistHint", scope: "world", config: true, restricted: true, type: String, default: "" });
  game.settings.register(MODULE_ID, SETTINGS.ARCHETYPE_WHITELIST, { name: "ECCF.Settings.ArchetypeWhitelist", hint: "ECCF.Settings.ArchetypeWhitelistHint", scope: "world", config: true, restricted: true, type: String, default: "" });
  game.settings.register(MODULE_ID, SETTINGS.ARCHETYPE_BLACKLIST, { name: "ECCF.Settings.ArchetypeBlacklist", hint: "ECCF.Settings.ArchetypeBlacklistHint", scope: "world", config: true, restricted: true, type: String, default: "" });
}
