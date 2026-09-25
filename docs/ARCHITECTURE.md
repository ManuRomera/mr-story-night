# Arquitectura

```
scripts/
  engine.js       Motor de reglas puro (sin Foundry): reduce(state, op, args, ctx) → estado nuevo o RuleError.
  generators.js   Generadores de inspiración puros sobre data/tables-*.json + la misión.
  view.js         Modelos de vista puros: hoja común, ficha personal y vestíbulo.
  store.js        Escritura: solo el anfitrión (GM activo) aplica operaciones y crea actores;
                  el resto de clientes le envía peticiones por socket.
  chat.js         Tarjetas de chat de los momentos clave.
  models.js       TypeDataModels: character (lo que escribe el jugador) y fellowship (estado de la partida).
  sheets/         FellowshipSheet y CharacterSheet (ActorSheetV2) + comportamiento común.
  lobby.js        Vestíbulo (ApplicationV2): nueva partida, misiones, compañías.
  overlay.js      Pausa compartida y avisos anónimos.
data/             quests-{es,en}.json (12 misiones) y tables-{es,en}.json (generadores por género).
templates/        fellowship.hbs, character.hbs, lobby.hbs y parciales.
```

## Dónde vive cada dato

| Dato | Dónde | Quién lo escribe |
|---|---|---|
| Nombre, concepto, deseo, lo que necesita, detalle, notas | Actor `character` (propiedad del jugador) | El jugador, directamente |
| Rol, estado, destino, asiento, deseo hacia la izquierda sí/no | `system.state.characters` de la compañía | El anfitrión, validado por el motor |
| Misión, preparación, desafíos, escenas, piedras, epílogos, crónica | `system.state` del Actor `fellowship` | El anfitrión, validado por el motor |
| Compañía activa, comodidad en mesa, misiones propias | Ajustes del mundo | El anfitrión |

Un personaje cuenta como «sin nombre» mientras conserve el nombre provisional (se guarda en `flags.mr-story-night.placeholder`).

## Principios

- **Las reglas viven en el motor.** La interfaz lo intenta y el motor responde con una clave de error traducible. Los permisos (quién elige el desafío, quién plantea la escena, quién echa qué piedras) se aplican igual vengan de donde vengan.
- **Piedras secretas.** El motor solo guarda el total de cada color y qué asientos han echado ya sus piedras.
- **Redibujado seguro.** Si alguien está escribiendo, la ventana espera a que salga del campo y después recupera el foco.
- **Deshacer.** El anfitrión puede deshacer pasos estructurales (no la escritura de textos) durante la sesión.

## API

`game["mr-story-night"]`: `open()`, `lobby()`, `fellowship`, `story`, `dispatch(op, args)`, `generate(kind, opts)`, `quests()`, `outcomes`. Hook: `mrStoryNightChanged(state, actor)`.
