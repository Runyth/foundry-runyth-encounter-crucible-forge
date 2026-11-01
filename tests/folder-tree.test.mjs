// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import {
  actorFoldersFromGame,
  buildActorFolderTree,
  selectedActorFolderRow
} from "../scripts/folder-tree.js";

const root = { id: "root", name: "Enemies", sort: 100, type: "Actor", folder: null };
const humans = { id: "humans", name: "Humans", sort: 100, type: "Actor", folder: root };
const guards = { id: "guards", name: "Guards", sort: 100, type: "Actor", folder: humans };
const monsters = { id: "monsters", name: "Monsters", sort: 200, type: "Actor", folder: root };
const standalone = { id: "standalone", name: "Bandits", sort: 50, type: "Actor", folder: null };

const actorFolderCollection = {
  contents: [root, humans, guards, monsters, standalone]
};
const gameLike = {
  actors: {
    folders: actorFolderCollection,
    contents: [
      { id: "a1", folder: humans },
      { id: "a2", folder: guards },
      { id: "a3", folder: guards },
      { id: "a4", folder: monsters }
    ]
  },
  folders: {
    contents: [{ id: "journal", name: "Journal", type: "JournalEntry" }]
  }
};

assert.deepEqual(actorFoldersFromGame(gameLike), actorFolderCollection.contents);

const rows = buildActorFolderTree(
  actorFoldersFromGame(gameLike),
  gameLike.actors.contents,
  "guards"
);

assert.deepEqual(rows.map((row) => row.id), ["standalone", "root", "humans", "guards", "monsters"]);
assert.equal(rows.find((row) => row.id === "root").depth, 0);
assert.equal(rows.find((row) => row.id === "root").ariaLevel, 1);
assert.equal(rows.find((row) => row.id === "guards").depth, 2);
assert.equal(rows.find((row) => row.id === "guards").path, "Enemies / Humans / Guards");
assert.deepEqual(rows.find((row) => row.id === "guards").ancestorIds, ["root", "humans"]);
assert.equal(rows.find((row) => row.id === "humans").directActorCount, 1);
assert.equal(rows.find((row) => row.id === "humans").recursiveActorCount, 3);
assert.equal(rows.find((row) => row.id === "root").recursiveActorCount, 4);
assert.equal(rows.find((row) => row.id === "guards").selected, true);
assert.equal(selectedActorFolderRow(rows, "guards")?.path, "Enemies / Humans / Guards");

// Compatibility fallback: use the world Folder collection when an Actor folder
// accessor is absent, while excluding folders of other document types.
const fallbackGame = {
  actors: {},
  folders: {
    contents: [
      { id: "actors", name: "Actors", type: "Actor" },
      { id: "items", name: "Items", type: "Item" }
    ]
  }
};
assert.deepEqual(actorFoldersFromGame(fallbackGame).map((folder) => folder.id), ["actors"]);

// Broken parent references do not make otherwise valid Actor folders disappear.
const orphan = { id: "orphan", name: "Recovered", type: "Actor", folder: "missing-parent" };
assert.deepEqual(buildActorFolderTree([orphan], [], "").map((row) => row.id), ["orphan"]);

console.log("Forge Actor-folder tree tests passed");
