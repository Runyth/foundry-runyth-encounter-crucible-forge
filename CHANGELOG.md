# Changelog

## 1.10.1 - 2026-11-01

### Fixed

- Attributed the source licence headers to the same holder the README Licence chapter names so every module surface carries the same copyright holder.

## 1.10.0

### Changed

- Adopted the Runyth brand across the whole published identity: the Foundry module id is now `runyth-encounter-crucible-forge`, the displayed title is `Runyth Encounter Crucible: Forge`, and the required core id in the manifest relationship is `runyth-encounter-crucible`.
- Installation folders for existing worlds must be renamed to `runyth-encounter-crucible-forge/`.

### Fixed

- No functional change; this release publishes the Runyth rebrand only.

## 1.9.6
## 1.9.6

- Fixed the Enemy Actor folder source appearing empty when the compatible Encounter Crucible API did not expose `actors.listFolders()`.
- Discover world Actor folders directly from Foundry's authoritative `game.actors.folders` collection, with a defensive `game.folders` fallback for compatible test/runtime wrappers.
- Keep Encounter Crucible responsible for recursively collecting and normalizing Actors after a folder is selected; Forge no longer requires the core to enumerate folders.
- Reduced the `actorFolderTraversal` capability requirement to the actual runtime dependency: `actors.collectFromFolder()`.
- Replaced the flat native folder dropdown with a scalable hierarchical Actor-folder tree.
- Added full-path display, nesting indentation, direct/recursive Actor counts, a bounded scroll region, search, expand-all, collapse-all, branch toggles, selected-folder summary, and a clear-selection action.
- Folder search preserves hierarchy by retaining ancestors of matching folders and ignores collapsed branches while a search is active.
- Added defensive recovery for malformed or orphaned folder-parent relationships so valid Actor folders do not silently disappear.
- Added English and German localization plus dedicated regression coverage for hierarchy, sorting, counts, selection, fallback discovery, orphan recovery, and the removal of the obsolete flat selector.

## 1.9.5

- Hardened Helper API 2.x generation detection beyond capability flags by accepting object, callable, direct, and service-facade generation layouts.
- Resolve the generation facade at call time so late API mutation or namespace replacement cannot leave Forge bound to a stale unavailable facade.
- Prevent `ForgeApp._prepareContext` and live slider updates from failing when `sliderToTarget` is absent, throws, or returns malformed data.
- Added root-level slider, composition-mode, and target-profile helper fallbacks for compatible cores that expose generation and display helpers in different namespaces.
- Validate composition-mode helper output and fall back to Forge's documented neutral, quantity, strength, balanced, or fixed semantics when necessary.
- Added capability support for Set-like and `has()`-based declarations without making declarations authoritative over callable API evidence.
- Added regression coverage for callable generation facades, late API mutation, root-level helpers, throwing and malformed slider helpers, throwing composition helpers, and alias generation services.

## 1.9.4

- Fixed Forge rejecting Encounter Crucible 1.8.4 / Helper API 2.7.2 when the core generation API was usable but no recognized helper-directory registration surface was exposed.
- Reclassified helper registration as an optional discoverability integration rather than a runtime requirement.
- Forge generation, assessment, saving, loading, scene placement, dashboard hand-off, Combat Tracker access, and Module Settings access now remain active without a helper registry.
- Added compatibility resolution for `helpers.register`, `helperModules.register`, `extensions.helpers.add/register`, `registry.helpers.add/register`, `registerHelper`, and `registerHelperModule` layouts.
- Added a best-effort `encounter-crucible.registerHelper` lifecycle hook when no callable registry is exposed.
- Kept helper registration idempotent across API-ready and Foundry-ready startup paths, including absent and present-but-throwing registry fallbacks.
- Added regression coverage for the exact Encounter Crucible 1.8.4 / Helper API 2.7.2 no-registry runtime shape and alternate registry aliases.

## 1.9.3

- Fixed Encounter Crucible integration failing when Helper API 2.7.1 exposes a callable generation facade but omits, delays, or explicitly misreports the additive `capabilities.encounterGeneration` flag.
- Added a centralized Forge-facing core API adapter that supports the documented `generation` namespace, compatible `encounterGeneration` aliases, and structurally equivalent API 2.x facades.
- Fixed repeated `ForgeApp._prepareContext` failures when `sliderToTarget` is unavailable by using safe optional invocation and a canonical display-only slider fallback.
- Route encounter generation, composition-mode resolution, slider labels, and availability checks through the same adapter so startup validation and dashboard behavior cannot disagree.
- Retry temporarily missing generation and helper-registration surfaces during the bounded startup handshake instead of failing immediately on a partially initialized API.
- Added regression coverage for flagless and false-flag APIs, alias generation namespaces, delayed generation exposure, missing `sliderToTarget`, fallback slider endpoints, and dashboard source-contract safety.

## 1.9.2

- Fixed a false incompatibility error when Encounter Crucible 1.8.2 or another compatible later core release had initialized successfully with Helper API 2.7.1.
- Replaced the one-shot startup check with an idempotent integration handshake that accepts the core API-ready hook and a bounded delayed retry.
- Added semantic comparison for core and Helper API versions, accepting compatible patch and minor releases while rejecting unsupported API major versions.
- Validated the required encounter-generation capability and helper registry independently from version numbers.
- Prevent duplicate helper registration when both the API-ready hook and Foundry `ready` lifecycle observe the same core API.
- Added reason-specific English and German diagnostics that report detected core/API versions and missing capabilities.
- Added automated compatibility tests for Encounter Crucible 1.8.2, later 1.x/2.x core versions, Helper API 2.7.1–2.x, delayed API exposure, timeouts, unsupported majors, and missing capabilities.

## 1.9.1

- Added a live composition-mode explanation below the quantity and strength checkboxes.
- Clarified the behavior of all four checkbox combinations and fixed-size precedence in English and German.
- Uses Encounter Crucible's public strategy resolver so the displayed mode cannot diverge from generation.
- Updated integration documentation with a complete strategy truth table.

## 1.9.0

- Adopted Encounter Crucible Helper API 2.7 constraint-first generation.
- Use normalized primary ancestry values for the race selector and theme derivation.
- Suppress pseudo-values such as `Any Race` and `Any Class` from selectors and persisted requests.
- Distinguish plain ancestry matches from transformative variants such as Human Shapechangers.
- Make quantity-only and strength-only checkboxes produce materially different roster shapes.
- Display composition mode, preferred enemy count, plain ancestry candidates, transformative candidates, and strict exclusions.
- Require Encounter Crucible 1.8.0 or newer.

## 1.8.0

- Adopted Encounter Crucible Helper API 2.6 band-aware generation.
- Fixed the persisted slider value `0` being restored as `50`.
- Display the requested and generated difficulty bands separately in diagnostics.
- Display the number of CR/XP metadata corrections applied by the core.
- Keep alternatives in the nearest achievable difficulty band before showing more distant fallbacks.
- Require Encounter Crucible 1.7.0 or newer.

## 1.7.0

- Adopted Encounter Crucible Helper API 2.5 continuous generation targets.
- Removed hard safety-ceiling diagnostics and candidate rejection.
- Extreme now permits genuinely deadly and overwhelming compositions.
- Moderate and lower targets penalize excessive overmatch without banning those Actors globally.
- Strict filtered pools return the closest achievable roster with clear warnings.
- Added raw-XP, adjusted-XP, target-fit, and filtered-candidate diagnostics.
- Updated boss generation to degrade gracefully when a distinct boss composition is unavailable.

## 1.6.0

- Added a Saved Encounters selector backed by Encounter Crucible Journal flags.
- Added exact restore and current-party recalculation modes.
- Preserve Journal identity so re-saving a loaded encounter updates the original entry.
- Added party-safe boss generation through Encounter Crucible Helper API 2.4.
- Display generation safety ceilings and excluded unsafe Actor counts.
- Warn explicitly when a loaded or manually assembled encounter is an overwhelming mismatch.
- Enlarged and corrected the Combat Tracker Forge button so its full label remains visible.
- Added saved-encounter, boss-safety, and regression documentation and tests.


## 1.5.0

- Persist the Forge window position and dimensions per browser client.
- Restore saved geometry whenever Forge is reopened.
- Debounce geometry writes and flush pending changes when the window closes.
- Add a Module Settings menu action that clears saved geometry.
- Immediately resize and centre an open Forge window when its layout is reset.
- Add English and German reset UI, documentation, and geometry tests.

## 1.4.1

- Make high-confidence compound race and archetype normalization mandatory.
- Hide the obsolete world toggle that could preserve unsplit values in upgraded worlds.
- Migrate a persisted disabled toggle back to canonical normalization.
- Normalize ordinary, Unicode, full-width, and HTML-encoded separators.
- Flatten nested D&D-style trait metadata before vocabulary extraction.
- Migrate persisted compound selections such as `Human, Shapechanger` to canonical selected entries.
- Guarantee that compound comma labels cannot remain in Forge race or archetype selectors.

## 1.4.0

- Split compound race and archetype values into independent choices by default.
- Add global race/creature-kind whitelist and blacklist settings.
- Add global class/type/archetype whitelist and blacklist settings.
- Add case-insensitive `*` and `?` wildcard matching.
- Apply vocabulary filters to preference lists, strict matching metadata, and automatic theme derivation without removing Actors.
- Add vocabulary documentation and automated tests.
- Fix compatibility detection for Encounter Crucible Helper API 2.3.x.

## 1.3.0

- Replaced difficulty-only prefix settings with one documented encounter-name format string.
- Added absolute party size and weighted average level to the default Journal name.
- Added final-name preview in Forge.
- Added placeholders for exact mixed-level distribution and enemy CR context.
- Requires Encounter Crucible 1.4.0 / Helper API 2.3.0.

## 1.2.0

- Added a persistent GM Forge button to the default Combat Tracker sidebar.
- Added custom save names and explicit theme-folder preview.
- Added configurable theme derivation, difficulty prefixes, and fallback folders.
- Documented all core/helper interaction boundaries.

## 1.1.0

- Added one-click placement of suggested enemies on the current Scene.
- Optionally add placed enemies to Combat.
- Explained exactly where and how encounters are saved.
- Added boss-encounter generation mode.
- Added multi-select race/creature-kind preferences with optional strict filtering.
- Added multi-select class/type/archetype/theme preferences with optional strict filtering.

## 1.0.0

- Added recursive Actor-folder sourcing.
- Added active-combat, selected-token, and player-character party sources.
- Added Trivial-to-Extreme difficulty slider.
- Added quantity, strength, fixed-size, duplicate, same-CR, diversity, boss, and minion strategies.
- Added alternatives, diagnostics, core-dashboard hand-off, and encounter persistence.
