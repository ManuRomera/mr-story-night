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
  presence.js     Quién está escribiendo en qué campo (socket, sin guardar nada); desempate por quién entró antes.
  access.js       Panel de lectura cómoda; los ajustes son de cliente y se aplican con clases en <html>.
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
- **Piedras secretas hasta que están todas.** Como en el libro, cada cual elige en secreto y se muestran a la vez: el motor guarda la elección de cada asiento (`choices`) y la vista solo la enseña cuando han elegido todos.
- **Ayuda por fase.** `guideKey(state)` indica la sección del tutorial que toca ahora; los textos viven en `lang/*.json` (`MR.Guide.*`) y el número de pasos de cada sección, en `GUIDE` de `view.js`.
- **Edición simultánea.** Los campos compartidos se guardan mientras se escribe (con 0,7 s de pausa). Las ventanas se redibujan al momento y `_replaceHTML` conserva el texto sin guardar, el foco y el cursor del campo activo, así que nadie pierde lo que está escribiendo. Un campo con dueño queda en solo lectura para los demás; el bloqueo se renueva cada 15 s y caduca a los 90 s si nadie lo renueva.
- **Deshacer.** El anfitrión puede deshacer pasos estructurales (no la escritura de textos) durante la sesión.

## API

`game["mr-story-night"]`: `open()`, `lobby()`, `fellowship`, `story`, `dispatch(op, args)`, `generate(kind, opts)`, `quests()`, `outcomes`. Hook: `mrStoryNightChanged(state, actor)`.
