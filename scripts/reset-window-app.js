// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID } from "./constants.js";
import { resetSavedWindowGeometry } from "./window-geometry.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ResetWindowGeometryApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "encounter-crucible-forge-reset-window",
    classes: ["encounter-crucible-forge", "eccf-reset-window"],
    window: {
      title: "ECCF.WindowGeometry.ResetTitle",
      icon: "fa-solid fa-window-restore",
      resizable: false
    },
    position: {
      width: 460,
      height: "auto"
    },
    actions: {
      reset: ResetWindowGeometryApp.#reset,
      cancel: ResetWindowGeometryApp.#cancel
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/reset-window.hbs`
    }
  };

  static async #reset() {
    await resetSavedWindowGeometry({ applyToOpenWindows: true });
    ui.notifications.info(game.i18n.localize("ECCF.WindowGeometry.ResetComplete"));
    await this.close();
  }

  static async #cancel() {
    await this.close();
  }
}
