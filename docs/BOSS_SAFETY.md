# Difficulty, bosses, and overmatch

Forge delegates encounter assessment and generation to Runyth Encounter Crucible Helper API 2.7.

## Band-aware generation

The selected named band is primary. Forge first finds the nearest achievable Trivial, Manageable, Challenging, Dangerous, or Extreme roster. It then optimizes exact XP targets, action economy, and composition preferences inside that band.

This means a Trivial request cannot be displaced by an Extreme roster while any Trivial roster exists in the filtered Actor pool. Alternatives follow the same ordering.

## Extreme remains unrestricted

There is no artificial maximum CR or XP. Extreme can deliberately include overwhelmingly deadly creatures. A lower target may still return an Extreme fallback when strict filters leave no lower-band composition, but Forge reports that the requested band was impossible.

## CR and XP consistency

Standard D&D XP is derived from CR. If an imported Actor says CR 10 but contains a low or otherwise incorrect XP value, Runyth Encounter Crucible uses the canonical CR 10 XP for calculations without modifying the Actor. Forge reports the number of corrected candidates in diagnostics.

## Boss options

- **Include a boss-like creature** softly prefers a distinct primary creature.
- **Boss encounter** strongly prioritizes that composition.
- **Include supporting minions** prefers at least two weaker supporters.

Boss preferences do not override the requested band unless no boss-shaped roster can satisfy it.
