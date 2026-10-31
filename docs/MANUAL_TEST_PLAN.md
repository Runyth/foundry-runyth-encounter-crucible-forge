# Manual test plan

1. Install Encounter Crucible 1.8.2 with Helper API 2.7.1 and Forge 1.9.6 in Foundry v13 with D&D5e 5.2+.
2. Open Forge from the Combat Tracker and verify the button remains correctly sized.
3. Verify window position and size restore and reset correctly.
4. Select an Actor folder containing multiple low-CR Actors and at least one CR 10 Actor.
5. With four level-1 characters, generate at slider positions 0, 25, 50, 75, and 100. Verify Forge reports Trivial, Manageable, Challenging, Dangerous, and Extreme when those bands are achievable.
6. Inspect alternatives at every anchor. Verify they remain in the requested band while enough same-band rosters exist.
7. Give the CR 10 Actor an intentionally incorrect low XP field. Generate Trivial and verify a valid low-CR roster is selected instead; diagnostics should report a CR/XP correction.
8. Apply strict Human filtering with both low- and high-CR Human Actors available. Verify Trivial chooses the low band and Extreme may use the high-CR Actor.
9. Restrict the filtered pool to only the CR 10 Human. Verify Trivial returns it only as an explicit Extreme fallback with a band-mismatch warning.
10. Move the slider fully to 0, generate, close Forge, reopen it, and verify the slider remains at 0 rather than returning to 50.
11. Verify diagnostics show requested band, generated band, target/raw XP, adjusted XP, target fit, filtered candidate count, and CR/XP corrections.
12. Verify Boss encounter prefers a distinct primary creature within the nearest achievable band.
13. Save, reload, place, and add the result to combat.


## Regression: Human / Wererat / strategy controls

1. Use four level-1 characters.
2. Ensure the source folder contains plain Human NPCs at several CRs and a `Humanoid (Human, Shapechanger)` Wererat at CR 2.
3. Select Human and strict ancestry, with no archetype selected.
4. Verify the Wererat is excluded and diagnostics report one transformative exclusion.
5. Select Shapechanger explicitly and verify the Wererat becomes eligible.
6. At the same difficulty, compare quantity-only and strength-only: quantity must produce more enemies than strength when the pool permits.
7. Move through all five bands and verify the roster and XP change rather than remaining a single CR 2 creature.
8. Verify the generated title uses the actual assessed band.

## Composition strategy matrix

Using the same party, Actor folder, filters, slider position, preferred size,
and maximum size, generate once for each checkbox state:

1. Neither checkbox: diagnostics show **No composition preference**.
2. Additional only: diagnostics show **Additional enemies** and the result uses
   more enemies than Strength mode when the pool permits it.
3. Stronger only: diagnostics show **Stronger enemies** and the result uses
   fewer, stronger enemies than Quantity mode when the pool permits it.
4. Both: diagnostics show **Hybrid** and its preferred count lies between the
   Quantity and Strength targets.
5. Enable fixed size: diagnostics show **Fixed group size** and the exact
   configured count is used regardless of the two checkbox states.

Confirm that the live explanation below the checkboxes changes immediately for
all five states.
## Compatibility-handshake regression

1. Enable Encounter Crucible 1.8.2 exposing Helper API 2.7.1 and Forge 1.9.6.
2. Reload the world and confirm Forge registers without an incompatibility notification.
3. Confirm the Combat Tracker Forge button appears once.
4. Open Forge and generate an encounter to verify `encounterGeneration` is usable.
5. Reload several times to exercise startup ordering; confirm no duplicate helper registration or duplicate sidebar button appears.
6. Test against a compatible core API that omits every helper-registration surface; confirm Forge opens and generates normally without an error notification.
7. Temporarily disable Encounter Crucible and confirm Forge reports the specific inactive-core reason.
8. Restore Encounter Crucible and confirm normal registration after reload.



## API facade compatibility regression

1. Start Forge with a compatible Helper API 2.7.1 object that exposes `generation.suggest` but no `capabilities.encounterGeneration` property.
2. Confirm Forge registers and opens without an integration error.
3. Repeat with `capabilities.encounterGeneration` set to false while the generation facade remains callable; confirm callable structure wins.
4. Repeat with the generation facade exposed as `encounterGeneration.generate`; confirm Forge registers and can submit a generation request.
5. Remove only `sliderToTarget`; confirm the Forge dashboard and live slider label render without an exception.
6. Remove the generation facade entirely; confirm the bounded handshake eventually reports the missing capability rather than throwing inside `_prepareContext`.

## Forge 1.9.6 resilient-facade regression

1. Expose encounter generation as a callable `api.generation` function and
   verify Forge recognizes and invokes it with the API object as its owner.
2. Expose generation under `api.services.generator.generate` while placing
   `sliderToTarget` at API root; verify the dashboard label and generation work.
3. Construct Forge's adapter before the core adds `api.generation`; add the
   facade later and verify the same adapter becomes available without reload.
4. Make `sliderToTarget` throw, return `null`, and return an unknown band; verify
   `_prepareContext` and the live slider label continue with canonical bands.
5. Make `resolveCompositionMode` throw or return an unknown value; verify Forge
   displays the documented checkbox-derived mode.
6. Remove every callable generation entry point; verify the bounded handshake
   reports generation unavailable without an uncaught dashboard exception.


## Forge 1.9.6 Actor-folder selector regression

1. Create at least three nested world Actor folders, for example `Enemies → Humans → Guards`, plus a separate root folder such as `Bandits`.
2. Put Actors directly in `Humans`, `Guards`, and another descendant folder so direct and recursive counts differ.
3. Open Forge and verify every Actor folder appears even when Encounter Crucible exposes `actors.collectFromFolder()` but no `actors.listFolders()`.
4. Verify the selector displays the hierarchy with indentation and full paths rather than one flat native select menu.
5. Search for the deepest folder name. Confirm the matching folder and all of its ancestors remain visible.
6. Search for a parent-folder name. Confirm its matching descendant paths remain visible.
7. Collapse a branch, clear the search, and confirm descendants are hidden. Use **Expand all** and **Collapse all** and verify both work without rerendering the whole Forge window.
8. Select a folder. Confirm the selected-folder summary updates, the choice persists, and race/archetype vocabulary rerenders from that source.
9. Enable recursive collection and generate an encounter. Confirm Actors in descendant folders are available. Disable recursive collection and confirm only Actors directly in the selected folder are used.
10. Clear the selected folder and verify generation requires a new folder selection rather than retaining a stale hidden id.
11. Delete or move a parent folder while Forge is closed, then reopen Forge. Confirm valid remaining Actor folders still appear rather than the whole list becoming empty.
12. With enough folders to exceed the picker height, confirm only the folder tree scrolls while the rest of Forge remains usable.
