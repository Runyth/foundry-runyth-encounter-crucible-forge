# Forge window layout

Forge remembers its last window position and size separately for each browser client.

## Saved data

The layout is stored as the hidden client setting:

```text
runyth-encounter-crucible-forge.windowGeometry
```

Only these resolved pixel values are retained:

- left
- top
- width
- height

The setting is client-scoped. Moving or resizing Forge does not change another GM's layout and does not add world-level configuration data.

## Behaviour

- Moving or resizing Forge schedules a debounced save.
- Closing Forge flushes any pending geometry immediately.
- Reopening Forge restores the saved dimensions and position.
- Foundry remains responsible for applying valid on-screen positioning when the viewport changes.

## Reset

Open:

```text
Game Settings
→ Configure Settings
→ Module Settings
→ Runyth Encounter Crucible: Forge
→ Reset Forge window layout
```

The reset clears the current client's saved geometry. If Forge is open, it immediately returns to its default dimensions and is centred in the current viewport. The next movement or resize starts saving a new layout.
