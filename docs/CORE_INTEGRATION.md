# Runyth Encounter Crucible integration

Forge is a user-interface and source-selection helper. Runyth Encounter Crucible remains authoritative for Actor normalization, party discovery, encounter generation, assessment, persistence, dashboard hand-off, and scene placement.

## Required API

Forge 1.9.5 requires Runyth Encounter Crucible 1.8.1 or newer with Helper API 2.7.1 or a compatible later 2.x release.

Registered helper capabilities include Actor-folder sourcing, difficulty targets, composition strategies, structured ancestry filters, vocabulary filters, Journal loading/saving, scene placement, and canonical CR-based XP handling.

## Constraint-first generation

Forge sends the current form state to the callable Runyth Encounter Crucible generation facade without maintaining a second difficulty algorithm. The documented `api.generation.suggest` namespace is preferred. Forge 1.9.5 also accepts a compatible API 2.x `api.encounterGeneration.generate` alias when exposed by the detected core.

Runyth Encounter Crucible applies the request in this order:

1. Normalize CR, XP, ancestry, creature type, and subtype qualifiers.
2. Remove pseudo-values such as `Any Race` and `Any Class`.
3. Apply strict ancestry/archetype constraints.
4. Search the nearest achievable requested difficulty band.
5. Respect the selected composition mode: quantity, strength, balanced, fixed-size, or neutral.
6. Optimize raw 2024 XP, adjusted 2014 XP, action economy, preferences, diversity, boss shape, and minions inside that contract.
7. Assess the final roster through the complete Runyth Encounter Crucible engine.

The two scaling checkboxes are therefore not cosmetic tie-breakers. Their exact
precedence is:

| Additional | Stronger | Effective mode |
|---|---|---|
| Off | Off | Neutral: closest difficulty without a composition preference |
| On | Off | Quantity: more individually weaker enemies |
| Off | On | Strength: fewer individually stronger enemies |
| On | On | Hybrid: both count and individual strength may rise |

Hybrid is one explicit mode rather than two conflicting rules. Its preferred
enemy count stays between the quantity-only and strength-only targets at the
same slider position.

**Keep encounter group size fixed** takes precedence over both checkboxes. It
requires exactly the configured preferred/fixed group size; difficulty then
changes by selecting the available creature strength and composition within
that fixed count.

Forge obtains the effective mode from the detected core generation facade. If
the optional resolver is not exposed, Forge uses the same public checkbox truth
table for display only; the generation request still goes to Runyth Encounter Crucible.

## Ancestry and qualifiers

The core adapter exposes:

```js
participant.traits.primaryRaces;
participant.traits.raceQualifiers;
participant.traits.creatureTypes;
participant.traits.archetypes;
```

For `Humanoid (Human, Shapechanger)`, the normalized values are:

```text
primaryRaces: Human
raceQualifiers: Shapechanger
creatureTypes: Humanoid
```

A strict Human selection does not silently treat the Shapechanger as a plain Human. Selecting the Shapechanger archetype explicitly permits it.

## Assessment, persistence, and placement

The core assessment engine owns the displayed difficulty. Forge calls `api.storage.save` and `api.placement.placeEncounter`; it does not create a parallel storage format or duplicate token-placement logic.
## Startup handshake

Forge does not assume that module script evaluation order is identical to API availability order. It listens for `runyth-encounter-crucible.apiReady` and performs a bounded retry during Foundry `ready`. Optional helper-directory registration is idempotent, so observing the same API through both paths cannot create duplicate helper descriptors. Forge does not require a helper registry to use the core generation API.

Compatibility is accepted when all of the following are true:

- Runyth Encounter Crucible is active and version 1.8.1 or newer.
- Helper API major version is 2 and its semantic version is 2.7.1 or newer.
- A callable encounter-generation facade is present. A true
  `capabilities.encounterGeneration` declaration is accepted, but the callable
  API structure is authoritative when the additive flag is missing, delayed, or stale.

The adapter checks these compatible generation layouts in order:

1. `api.generation.suggest`
2. `api.generation.generate`
3. `api.encounterGeneration.suggest`
4. `api.encounterGeneration.generate`
5. Compatible generation facades under `api.services`

The dashboard never calls `sliderToTarget` directly. When that optional helper
is absent, Forge derives only the localized slider-band label from the public
five-band scale. This fallback does not calculate encounter difficulty and does
not replace core generation or assessment.

The bounded startup wait retries an unavailable API or a temporarily missing
generation facade. It does not block on helper-directory registration. The check
accepts Runyth Encounter Crucible 1.8.4 with Helper API 2.7.2, later compatible core
patch releases, and later 2.x Helper API minors. Unsupported major API versions
remain explicit failures.

## Optional helper-directory registration

Forge attempts helper discoverability through these compatible layouts:

1. `api.helpers.register` or `api.helpers.add`
2. `api.helperModules.register` or `api.helperModules.add`
3. `api.extensions.helpers.register` or `.add`
4. `api.registry.helpers.register` or `.add`
5. `api.registerHelper` or `api.registerHelperModule`

When none is available, Forge emits a best-effort
`runyth-encounter-crucible.registerHelper` hook and continues normally. Its Combat
Tracker button and Module Settings menu remain authoritative launch surfaces.
Missing helper registration cannot disable encounter generation, assessment,
Journal storage, saved-encounter loading, scene placement, or dashboard hand-off.


## Adapter hardening in Forge 1.9.5

The generation facade is resolved at invocation time rather than captured once
during application construction. This supports compatible cores that populate,
replace, or proxy their generation namespace during startup. Supported evidence
now includes object and callable forms of `generation`, `encounterGeneration`,
`generator`, service-level aliases, and direct `suggestEncounter` or
`generateEncounter` methods.

Optional presentation helpers are isolated from application rendering:

- `sliderToTarget` may be absent, located at API root, throw during startup, or
  return malformed data; Forge uses the canonical five-band display fallback.
- `resolveCompositionMode` may be absent, throw, return `hybrid`, or return an
  unknown value; Forge normalizes it to the documented mode table.
- `targetProfile` is optional and returns `null` when unavailable or temporarily
  unusable.

These fallbacks affect labels and optional diagnostics only. The selected
encounter is still generated and assessed by Runyth Encounter Crucible.
