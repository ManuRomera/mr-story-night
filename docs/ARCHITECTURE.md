# Architecture

MR · Story Night keeps game data, Foundry integration, and presentation separate. `generator.js` is deterministic and consumes expandable JSON banks. `store.js` is the single writer for the active world story, persists it as a hidden world setting, records reversible changes, emits a public hook, and broadcasts authoritative GM updates. `compat.js` isolates version-sensitive Foundry calls.

The interface is made of small applications under `scripts/apps`, document sheets under `scripts/sheets`, Handlebars templates, and a namespaced CSS design system. Per-user visual and accessibility preferences never alter world data. The public API is deliberately narrow and exposed as `game["mr-story-night"]`.

## Data model

One active story contains premise metadata, current tension/state, scene records, relationship records, an event history, and generation history. Actors hold protagonists. This hybrid keeps Foundry permissions and familiar actor ownership while making the shared story atomic and easy to export. Future migrations must copy before changing a stored story and increment a schema field.

## Compatibility

The manifest targets Foundry 13–14. Avoid direct imports from Foundry internals. New compatibility branches belong only in `compat.js`. ApplicationV2 is preferred when available; document sheets retain the stable ActorSheet registration path shared by both generations.

## Extension points

Modules can read `game["mr-story-night"].story`, request inspirations or updates, and listen for `mrStoryNightStoryChanged`. Content additions should extend JSON banks without changing generator code. All visible copy belongs in both locale files.
