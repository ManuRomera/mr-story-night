# Arquitectura

```
scripts/
  engine.js      Motor de reglas puro (sin Foundry). reduce(state, op, args, ctx) → nuevo estado o RuleError.
  view.js        Convierte el estado en el modelo de vista de cada pantalla (puro, testeable).
  store.js       Único punto de escritura. Solo el GM activo (anfitrión) aplica operaciones;
                 el resto las envía por socket. Los cambios llegan a todos por el onChange del ajuste "story".
  app.js         Ventana única (HandlebarsApplicationMixin(ApplicationV2)) con acciones declarativas.
  overlay.js     Pausa compartida y avisos anónimos de comodidad en mesa.
  quests.js      Misiones de ejemplo (data/quests-*.json) + misiones del mundo (ajuste "quests").
  sheets/        Actor opcional (TypeDataModel + ActorSheetV2) para tokens o notas.
templates/       table.hbs + parciales por fase y pestaña.
```

## Principios

- **Las reglas viven en el motor.** La interfaz nunca decide si algo está permitido: lo intenta, y el motor responde con una clave de error traducible. Así los permisos (quién edita qué personaje, quién elige el desafío, quién plantea la escena) se aplican igual vengan de la interfaz, de la API o de un cliente manipulado.
- **Estado atómico.** Una historia es un único objeto JSON en un ajuste del mundo (`story`), con `schema: 2`. Se archiva completo al cerrarse.
- **Piedras secretas.** El motor solo guarda el total de cada color y qué asientos han echado ya piedras, nunca qué puso cada cual. Aviso: el mensaje del socket viaja por el navegador del anfitrión; en mesa de confianza es suficiente.
- **Redibujado seguro.** Si alguien está escribiendo, la ventana espera a que salga del campo antes de redibujarse, y después recupera el foco.

## Operaciones del motor

`start`, `setField`, `setupDone`, `setReady`, `charactersDone`, `setPicker`, `startScenes`, `addConsequence`, `removeConsequence`, `endScene`, `submitStones`, `draw`, `resolveLoss`, `replaceMain`, `nextChallenge`, `finish`.

## API para macros y módulos

`game["mr-story-night"]` expone `open()`, `story`, `dispatch(op, args)` y `outcomes`, y emite el hook `mrStoryNightChanged`.
