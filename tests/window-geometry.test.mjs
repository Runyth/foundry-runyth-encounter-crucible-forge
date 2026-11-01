// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { centeredDefaultGeometry, sanitizeWindowGeometry } from "../scripts/window-geometry.js";

assert.deepEqual(
  sanitizeWindowGeometry({ left: 101.4, top: 52.8, width: 812.2, height: 703.7, scale: 2 }),
  { left: 101, top: 53, width: 812, height: 704 }
);

assert.deepEqual(sanitizeWindowGeometry(null), {});
assert.deepEqual(sanitizeWindowGeometry({ width: -1, height: 0, left: "bad", top: 4 }), { top: 4 });

assert.deepEqual(centeredDefaultGeometry({ width: 1920, height: 1080 }), {
  width: 760,
  height: 760,
  left: 580,
  top: 160
});

assert.deepEqual(centeredDefaultGeometry({ width: 600, height: 500 }), {
  width: 520,
  height: 420,
  left: 40,
  top: 40
});

console.log("Window geometry tests passed");
