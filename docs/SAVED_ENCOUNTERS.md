# Reusing saved encounters

Forge v1.6 can load Runyth Encounter Crucible Journal Entries back into the generator window.

## Workflow

1. Open Forge from the Combat Tracker.
2. Open **Saved encounters** at the top of the window.
3. Select an Runyth Encounter Crucible Journal Entry.
4. Choose whether to enable **Recalculate for the current party**.
5. Click **Load saved encounter into Forge**.

The loaded enemy roster appears in the normal result panel. It can then be:

- opened in Runyth Encounter Crucible;
- placed on the current Scene;
- added to Combat;
- renamed and saved again;
- reassessed for the active party.

## Current party versus original party

With **Recalculate for the current party** enabled, Forge replaces only the saved `party` participants. Enemy, ally, neutral, generation, Journal, and theme metadata remain intact. This is the normal reuse mode later in a campaign.

When disabled, Forge restores the encounter exactly as it was saved, including the original party snapshot.

## Update behaviour

A loaded definition retains its `journalId` and `journalUuid`. Saving it again updates the same Journal Entry. The ordinary collision-safe numbering applies only when a new Journal is created.

## Storage discovery

Forge uses Helper API 2.4:

```javascript
const saved = api.storage.list();
const encounter = api.storage.get(journalIdOrEncounterId);
```

Forge never parses Journal HTML. The readable page is for the GM; the authoritative definition comes from `flags.runyth-encounter-crucible.encounter` through the core API.
