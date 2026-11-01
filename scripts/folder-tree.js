// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
function collectionValues(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (Array.isArray(collection.contents)) return collection.contents;
  if (typeof collection.values === "function") return [...collection.values()];
  if (typeof collection[Symbol.iterator] === "function") return [...collection];
  return [];
}

function folderId(folder) {
  return String(folder?.id ?? folder?._id ?? "");
}

function folderName(folder) {
  return String(folder?.name ?? "").trim() || "Unnamed Folder";
}

function parentFolderId(folder) {
  const parent = folder?.folder;
  if (typeof parent === "string") return parent;
  if (parent?.id) return String(parent.id);
  if (parent?._id) return String(parent._id);

  // Some test doubles and compatibility layers expose the parent Folder here.
  const parentModel = folder?.parent;
  if (parentModel?.documentName === "Folder" || parentModel?.constructor?.documentName === "Folder") {
    return String(parentModel.id ?? parentModel._id ?? "");
  }
  return "";
}

function actorFolderId(actor) {
  const folder = actor?.folder;
  if (typeof folder === "string") return folder;
  return String(folder?.id ?? folder?._id ?? "");
}

function compareNodes(left, right) {
  const leftSort = Number(left.sort ?? 0);
  const rightSort = Number(right.sort ?? 0);
  if (leftSort !== rightSort) return leftSort - rightSort;
  return left.name.localeCompare(right.name, undefined, { sensitivity: "base", numeric: true });
}

/**
 * Return the authoritative world Actor folders exposed by Foundry. Encounter
 * Crucible is intentionally not involved in folder enumeration; its helper API
 * remains responsible for recursively collecting Actors after selection.
 *
 * @param {object} gameLike Foundry game object or test double.
 * @returns {object[]} Actor Folder documents.
 */
export function actorFoldersFromGame(gameLike) {
  const actorFolders = collectionValues(gameLike?.actors?.folders).filter(Boolean);
  if (actorFolders.length) return actorFolders;

  // Compatibility fallback for minimal test harnesses and unusual collection
  // wrappers. Foundry v13 normally exposes Actor folders via game.actors.folders.
  return collectionValues(gameLike?.folders).filter((folder) => String(folder?.type ?? "") === "Actor");
}

/**
 * Build a stable, flattened hierarchical representation suitable for a large,
 * searchable, scrollable tree selector.
 *
 * @param {object[]} folders Actor Folder documents.
 * @param {object[]} actors World Actor documents.
 * @param {string} selectedId Currently selected Folder id.
 * @returns {object[]} Flattened preorder rows.
 */
export function buildActorFolderTree(folders, actors = [], selectedId = "") {
  const nodes = new Map();
  for (const folder of collectionValues(folders)) {
    const id = folderId(folder);
    if (!id || nodes.has(id)) continue;
    nodes.set(id, {
      id,
      name: folderName(folder),
      sort: Number(folder?.sort ?? 0),
      parentId: parentFolderId(folder),
      source: folder,
      children: [],
      directActorCount: 0
    });
  }

  for (const actor of collectionValues(actors)) {
    const id = actorFolderId(actor);
    if (id && nodes.has(id)) nodes.get(id).directActorCount += 1;
  }

  const roots = [];
  for (const node of nodes.values()) {
    const parent = node.parentId && node.parentId !== node.id ? nodes.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const recursiveCountMemo = new Map();
  const recursiveCount = (node, visiting = new Set()) => {
    if (recursiveCountMemo.has(node.id)) return recursiveCountMemo.get(node.id);
    if (visiting.has(node.id)) return node.directActorCount;
    const nextVisiting = new Set(visiting).add(node.id);
    const count = node.directActorCount + node.children.reduce((sum, child) => sum + recursiveCount(child, nextVisiting), 0);
    recursiveCountMemo.set(node.id, count);
    return count;
  };

  const rows = [];
  const visited = new Set();
  const append = (node, depth, ancestors, parentPath) => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    node.children.sort(compareNodes);
    const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
    const recursiveActorCount = recursiveCount(node);
    rows.push({
      id: node.id,
      name: node.name,
      path,
      parentId: node.parentId,
      depth,
      ariaLevel: depth + 1,
      ancestorIds: [...ancestors],
      ancestorIdsValue: ancestors.join(","),
      hasChildren: node.children.length > 0,
      directActorCount: node.directActorCount,
      recursiveActorCount,
      selected: node.id === String(selectedId ?? ""),
      searchValue: `${node.name} ${path}`.toLocaleLowerCase()
    });
    for (const child of node.children) append(child, depth + 1, [...ancestors, node.id], path);
  };

  roots.sort(compareNodes);
  for (const root of roots) append(root, 0, [], "");

  // Defensive recovery for malformed/cyclic imported folder relationships.
  for (const node of [...nodes.values()].sort(compareNodes)) {
    if (!visited.has(node.id)) append(node, 0, [], "");
  }

  return rows;
}

/**
 * Find the selected row without leaking Foundry document internals into the UI.
 *
 * @param {object[]} rows Prepared folder rows.
 * @param {string} selectedId Selected folder id.
 * @returns {object | null}
 */
export function selectedActorFolderRow(rows, selectedId) {
  return rows.find((row) => row.id === String(selectedId ?? "")) ?? null;
}
