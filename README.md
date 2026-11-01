# Runyth Encounter Crucible: Forge

Forge is an optional helper module for Runyth Encounter Crucible 1.8.1 or newer with Helper API 2.7.1 or a compatible later 2.x release.

It recursively reads NPC Actors from a configured Actor folder, extracts their CR and structured combat profile through Runyth Encounter Crucible's public API, resolves the current party, and searches for an encounter composition near a Trivial-to-Extreme slider target.

## Core startup compatibility

Forge connects through Runyth Encounter Crucible's public API-ready hook and also performs a bounded startup retry. Compatible core patch releases such as Runyth Encounter Crucible 1.8.4 with Helper API 2.7.2 are accepted. Version checks use semantic comparison rather than exact strings. Helper-directory registration is attempted when the core exposes it, but it is optional because Forge has its own Combat Tracker and Module Settings launch surfaces.

Forge 1.9.6 centralizes integration through a compatibility adapter. A callable generation facade is authoritative even when an additive capability flag is absent or temporarily stale. The adapter prefers `api.generation`, accepts compatible API 2.x aliases, and provides a display-only slider-label fallback when the optional `sliderToTarget` helper is unavailable. Encounter generation itself always remains delegated to Runyth Encounter Crucible.

## Use

1. Enable **Runyth Encounter Crucible** and **Runyth Encounter Crucible: Forge**.
2. Open Forge from the hammer button in the Combat Tracker sidebar, or through **Game Settings → Configure Settings → Module Settings → Open Encounter Forge**.
3. Select an Actor folder with the searchable hierarchical folder tree and choose the party source.
4. Adjust the difficulty slider and composition controls.
5. Generate a suggestion.
6. Place it on the current Scene, open it in Runyth Encounter Crucible, or save it.
7. Reopen saved Journal encounters from the **Saved encounters** section at any later time.

No Actor is modified. Generated encounters contain references and calculation snapshots only.

## Actor-folder selector

Forge 1.9.6 reads the authoritative world Actor-folder collection directly from Foundry instead of relying on an optional Runyth Encounter Crucible folder-list helper. The source selector is a scalable tree rather than a flat dropdown. It preserves nested folder structure, provides a bounded scroll area, supports folder-name/full-path search, expand/collapse controls, and shows `direct / recursive` Actor counts for every folder.

Selecting a parent folder and enabling **Include Actor folders below the selected folder** still delegates the actual recursive Actor collection to Runyth Encounter Crucible. Folder discovery and encounter analysis therefore have separate responsibilities and cannot accidentally disable each other.

See `docs/FOLDER_SELECTOR.md` for behavior, accessibility notes, and troubleshooting.

## Quantity and strength modes

Forge shows the currently effective composition mode directly below the two
scaling checkboxes:

- **Neither checked:** no composition preference; choose the closest difficulty.
- **Additional only:** prefer more individually weaker enemies.
- **Stronger only:** prefer fewer individually stronger enemies.
- **Both checked:** hybrid mode; both count and individual strength may rise.
- **Fixed group size:** overrides both checkboxes and enforces the exact count.

The checkboxes influence composition inside the nearest achievable difficulty
band. They do not override strict race/archetype filters, and they do not force
an impossible roster when the selected Actor folder lacks suitable creatures.

## Window position and size

Forge remembers its last position and dimensions separately for each browser client. Reopening it restores that layout. To return to the default centred size, use **Game Settings → Configure Settings → Module Settings → Runyth Encounter Crucible: Forge → Reset Forge window layout**.

See `docs/WINDOW_LAYOUT.md` for storage and reset details.

## Creature preferences and global vocabulary filters

Forge derives selectable race/creature-kind and class/type/archetype/theme values from the configured Actor folder. Preferences influence generation scoring; enabling the corresponding strict option excludes nonmatching Actors from that generated roster.

Forge first converts structured, compound, Unicode-punctuated, and HTML-encoded metadata into canonical single values. Global world settings then control which canonical values are presented:

- Compound values are always normalized: `Human, Shapechanger` becomes separate `Human` and `Shapechanger` choices. This cannot be disabled because compound labels break filtering and strict matching.
- Race and archetype **whitelists** limit which metadata values appear.
- Race and archetype **blacklists** remove unwanted values after whitelist processing.
- Matching is case-insensitive and supports `*` and `?` wildcards.

These settings filter metadata, not Actors. Blacklisting `Shapechanger` keeps the Actor available and preserves its other values, such as `Human`.

See `docs/VOCABULARY_FILTERS.md` for exact semantics and campaign examples.

## Saving and organization

**Save encounter** creates a normal Journal Entry under **Journal Directory → Runyth Encounter Crucible**. The page is readable, while its module flags retain the complete encounter definition.

The save panel accepts a custom name. Runyth Encounter Crucible applies Forge's configured name format, creates the configured theme subfolder, and appends `(2)`, `(3)`, and so on when a final name already exists.

The default format is:

```text
[P{partySize}-L{averageLevel}-{difficulty}] {name}
```

Configure the final Journal name and theme derivation under **Configure Settings → Module Settings → Runyth Encounter Crucible: Forge**.

## Scene placement

**Place on current scene** creates individual tokens from the suggested Actors' Prototype Tokens in a compact formation around the current viewport centre. Enable **Add placed enemies to combat** to add them to the Scene's active Combat or create one automatically.

## Core interaction

Forge is a reference helper built on Runyth Encounter Crucible's public Helper API. It delegates Actor normalization, encounter generation, assessment, Journal persistence, and token placement to the core module instead of duplicating those responsibilities.

See `docs/CORE_INTEGRATION.md` for the complete boundary and API rationale.


## Reusing saved encounters

The top of Forge lists every Runyth Encounter Crucible Journal. Load one exactly as saved, or leave **Recalculate for the current party** enabled to preserve its enemies while replacing the old party snapshot. See `docs/SAVED_ENCOUNTERS.md`.

## Band-aware difficulty and unrestricted Extreme generation

Forge first matches the requested named difficulty band, then optimizes continuous XP and action-economy targets within that band. Extreme remains unrestricted. Strict filtered pools fall back to the nearest possible band only when the requested band cannot be formed, and Forge explains the mismatch. Canonical CR-based XP prevents malformed imported Actor XP metadata from distorting selection. See `docs/BOSS_SAFETY.md`.

See `docs/COMPOSITION_STRATEGIES.md` for the full checkbox truth table,
hybrid-mode behavior, fixed-size precedence, and examples.

## Licence
Copyright © 2026  [Daniel Braniewski](https://brani.dev/)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
