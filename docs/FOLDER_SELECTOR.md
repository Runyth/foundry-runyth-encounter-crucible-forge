# Actor-folder selector

Encounter Crucible: Forge 1.9.6 uses Foundry's world Actor-folder collection as the source of truth for folder discovery.

## Why folder discovery is local to Forge

Encounter Crucible owns Actor normalization and recursive Actor collection through its helper API. Folder enumeration is a Foundry UI/data concern and does not need to be duplicated by the core API. Earlier Forge releases called the optional `api.actors.listFolders()` helper; compatible core releases that omitted that convenience method could therefore leave the Enemy Actor folder list empty even though `collectFromFolder()` worked correctly.

Forge now separates the responsibilities:

1. **Foundry** supplies world Actor folders through `game.actors.folders`.
2. **Forge** presents those folders in a scalable hierarchical selector and stores the selected Folder id.
3. **Encounter Crucible** receives that id and performs the actual direct or recursive Actor collection, normalization, generation, and assessment.

A compatibility fallback can read Actor-type folders from `game.folders` when a minimal runtime or test wrapper does not provide the Actor collection accessor.

## Selector behavior

The Enemy Actor folder control provides:

- preserved parent/child hierarchy;
- indentation by folder depth;
- selected-folder summary and full path;
- direct Actor count and recursive subtree Actor count;
- bounded scrolling for large folder trees;
- search across folder names and full paths;
- branch expand/collapse controls;
- Expand all and Collapse all actions;
- a clear-selection action.

The count pill uses this format:

```text
3 / 17
```

The first number is the number of Actors directly inside that folder. The second includes all Actors in descendant folders. The **Include Actor folders below the selected folder** checkbox determines which count is relevant to generation.

## Search semantics

Search is case-insensitive and matches the folder's name and complete path. Ancestors of a matching nested folder remain visible so the result is never shown without context. While a search is active, collapsed-state filtering is temporarily ignored; clearing the search restores the previous collapsed branches.

## Persistence

Only the selected Folder id is stored as a world setting, matching previous Forge behavior. Search text and expanded/collapsed presentation state are client-session UI state and do not alter world data.

## Failure handling

Malformed imported folder relationships are treated defensively. A valid Actor folder whose recorded parent no longer exists is recovered as a root entry rather than silently disappearing.

If no world Actor folders exist, Forge shows an explicit empty-state message instead of an empty native dropdown.

## Foundry v13 references

- Actor world collection and `game.actors.folders`: https://foundryvtt.com/api/v13/classes/foundry.documents.collections.Actors.html
- Folder hierarchy, `children`, `ancestors`, `contents`, and `getSubfolders`: https://foundryvtt.com/api/v13/classes/foundry.documents.Folder.html
