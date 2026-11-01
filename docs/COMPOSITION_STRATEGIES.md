# Composition strategies

Forge has two independent-looking checkboxes, but the pair resolves to one
explicit composition mode. The live summary below the checkboxes shows the
mode that Runyth Encounter Crucible will actually use.

| Additional enemies | Stronger enemies | Effective mode | Meaning |
|---|---|---|---|
| Off | Off | Neutral | Match difficulty without preferring count or individual strength. |
| On | Off | Quantity | Prefer more individually weaker enemies. |
| Off | On | Strength | Prefer fewer individually stronger enemies. |
| On | On | Hybrid | Let difficulty rise through both count and individual strength. |

## Hybrid mode

Both checkboxes do not multiply or cancel each other. They select one hybrid
strategy. For the same party, slider position, and Actor pool, its preferred
enemy count is calculated between the quantity-only and strength-only targets.

Example for a four-character level-1 party with preferred size 4 and maximum
size 8:

| Slider band | Quantity target | Hybrid target | Strength target |
|---|---:|---:|---:|
| Trivial | 1 | 1 | 1 |
| Manageable | 4 | 3 | 1 |
| Challenging | 4 | 3 | 1 |
| Dangerous | 6 | 4 | 2 |
| Extreme | 8 | 6 | 3 |

These are preferred counts, not fabricated difficulty. Runyth Encounter Crucible
still selects the nearest achievable difficulty band first. If the Actor pool
cannot form the requested band at the preferred count, the result may use a
different count and Forge reports the actual count in diagnostics.

## Fixed group size

**Keep encounter group size fixed** has the highest precedence. It overrides
both scaling checkboxes and requires exactly the configured preferred/fixed
size. The generator then changes difficulty by selecting stronger or weaker
Actors within that fixed count.

## Other constraints

Strict ancestry and archetype filters are applied before composition strategy.
The strategy cannot add an Actor excluded by a strict filter.

Soft preferences, boss/minion choices, same-CR preference, diversity, and
composition are scored together after the requested difficulty band. None of
these preferences may justify an arbitrarily poor XP or action-economy fit.

## Important limits

- **Maximum group size** is a hard cap unless fixed size sets a smaller cap.
- **Allow duplicates** must be enabled when the folder lacks enough distinct
  suitable Actors to reach a quantity target.
- Strength mode may still use more than one creature when no single Actor can
  form the requested difficulty band.
- Quantity mode may use fewer creatures when the filtered Actor pool cannot
  supply enough suitable weak Actors.
