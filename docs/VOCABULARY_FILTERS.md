# Race and archetype vocabulary controls

Forge builds its race/creature-kind and class/type/archetype/theme lists from Actor metadata normalized by Encounter Crucible. D&D5e metadata is not always presentation-ready: an Actor may expose `Human, Shapechanger`, `Humanoid (Shapechanger)`, full-width punctuation, HTML-encoded commas, or nested type/subtype objects.

All whitelist and blacklist controls are GM-only world settings under:

```text
Configure Settings
→ Module Settings
→ Encounter Crucible: Forge
```

## Mandatory canonical normalization

Forge v1.4.1 always converts compound metadata into independent canonical choices before filters, matching, or theme derivation. This behaviour is intentionally not optional. Preserving compound values caused selectors to contain entries such as `Human, Shapechanger`, prevented `Human` from being selected independently, and made strict matching inconsistent.

| Source value | Canonical Forge choices |
|---|---|
| `Human, Shapechanger` | `Human`; `Shapechanger` |
| `Devil, Shapechanger` | `Devil`; `Shapechanger` |
| `Humanoid (Shapechanger)` | `Humanoid`; `Shapechanger` |
| `Fiend / Devil` | `Fiend`; `Devil` |
| `Human， Shapechanger` | `Human`; `Shapechanger` |
| `Human&#44; Shapechanger` | `Human`; `Shapechanger` |

Normalization handles:

- commas and semicolons;
- full-width and common Unicode punctuation;
- slash and pipe separators;
- parenthetical subtypes;
- common HTML-encoded separator entities;
- nested `value`, `custom`, `subtype`, `name`, and `label` metadata.

An upgraded world that previously disabled compound splitting is migrated automatically. Persisted selections such as `Human, Shapechanger` are reconciled to `Human` and `Shapechanger` when both remain available.

## Whitelists and blacklists

Forge provides independent fields for:

- Race / creature-kind whitelist
- Race / creature-kind blacklist
- Class / type / archetype whitelist
- Class / type / archetype blacklist

Each field accepts values separated by commas, semicolons, or line breaks. Matching is case-insensitive. `*` matches any number of characters and `?` matches one character.

An empty whitelist allows every extracted value. A non-empty whitelist allows only matching values. The blacklist is applied afterward and always wins.

### Keep Shapechanger as a separate choice

Leave the race blacklist empty. Both lines remain independently selectable:

```text
Human
Shapechanger
```

### Hide Shapechanger only

Set the race blacklist to:

```text
Shapechanger
```

The Actor remains available. Only its `Shapechanger` metadata tag is removed from Forge's preference list and automatic theme vocabulary.

### Hide related variants

Set the race blacklist to:

```text
Shape*
```

This also hides labels such as `Shapeshifter` while retaining the Actors themselves.

### Show only campaign races

Example race whitelist:

```text
Human; Elf*; Dwarf; Duergar; Halfling; Kender; Goliath; Gnome; Svirfneblin; Orc; Hobgoblin; Goblin; Reborn; Tiefling; Aasimar
```

Add creature kinds that should remain selectable for enemy generation, such as `Undead`, `Fiend`, `Construct`, or `Beast`.

## What the filters do not do

Vocabulary filters do **not** remove an Actor from the selected Actor folder or encounter candidate pool. They control the canonical metadata Forge exposes for:

- race and archetype multi-select lists;
- strict preference matching;
- soft preference scoring;
- automatic theme-folder derivation.

To exclude an Actor completely, move it outside the configured source folder or use a dedicated source folder for eligible encounter Actors.
