// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID, SETTINGS } from "./constants.js";

export const DEFAULT_WINDOW_GEOMETRY = Object.freeze({
  width: 760,
  height: 760
});

const activeApplications = new Set();

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function sanitizeWindowGeometry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const geometry = {};
  for (const key of ["left", "top", "width", "height"]) {
    const number = finiteNumber(value[key]);
    if (number === null) continue;
    if ((key === "width" || key === "height") && number <= 0) continue;
    geometry[key] = Math.round(number);
  }
  return geometry;
}

export function centeredDefaultGeometry(viewport = {}) {
  const viewportWidth = Math.max(320, finiteNumber(viewport.width) ?? globalThis.innerWidth ?? DEFAULT_WINDOW_GEOMETRY.width);
  const viewportHeight = Math.max(320, finiteNumber(viewport.height) ?? globalThis.innerHeight ?? DEFAULT_WINDOW_GEOMETRY.height);
  const width = Math.min(DEFAULT_WINDOW_GEOMETRY.width, Math.max(320, viewportWidth - 80));
  const height = Math.min(DEFAULT_WINDOW_GEOMETRY.height, Math.max(320, viewportHeight - 80));
  return {
    width: Math.round(width),
    height: Math.round(height),
    left: Math.max(0, Math.round((viewportWidth - width) / 2)),
    top: Math.max(0, Math.round((viewportHeight - height) / 2))
  };
}

export function readSavedWindowGeometry() {
  try {
    return sanitizeWindowGeometry(game.settings.get(MODULE_ID, SETTINGS.WINDOW_GEOMETRY));
  } catch (error) {
    console.warn(`[${MODULE_ID}] Could not read saved window geometry`, error);
    return {};
  }
}

export async function saveWindowGeometry(value) {
  const geometry = sanitizeWindowGeometry(value);
  await game.settings.set(MODULE_ID, SETTINGS.WINDOW_GEOMETRY, geometry);
  return geometry;
}

export function registerGeometryApplication(application) {
  activeApplications.add(application);
}

export function unregisterGeometryApplication(application) {
  activeApplications.delete(application);
}

export async function resetSavedWindowGeometry({ applyToOpenWindows = true } = {}) {
  await game.settings.set(MODULE_ID, SETTINGS.WINDOW_GEOMETRY, {});
  if (!applyToOpenWindows) return;
  for (const application of [...activeApplications]) {
    if (!application?.rendered || typeof application.resetWindowGeometry !== "function") continue;
    application.resetWindowGeometry();
  }
}
