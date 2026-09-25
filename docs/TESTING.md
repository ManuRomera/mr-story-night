# Testing checklist

Automated checks validate JSON, JavaScript syntax, template block balance, i18n parity, manifest references, deterministic randomization, genre-bank shape, and combination counts.

Manual release acceptance in both Foundry 13 and 14 must cover: installation, world creation, GM/player permissions, reconnect, two simultaneous clients, every wizard step, character editing, scene creation, narrative actions, theme/accessibility settings, 1920×1080 and narrow layouts, browser console errors, and upgrade from the previous release. Results should be recorded per Foundry build; an unexecuted checklist is not a passed test.

## Recorded runs

- **Foundry v13.351, macOS, Chromium 132 — passed 2026-09-25:** system discovery, isolated world creation, world launch, Spanish five-step wizard, Spanish premise generation, dashboard rendering, relationship board, archive/import controls, content editor, safety controls, generative audio controls, and final credits. Server completed world loading and migrations without system runtime errors.
- **Foundry v14 — not executed:** no v14 runtime is installed on the development machine. Static compatibility and manifest validation pass; real certification remains intentionally unclaimed.
