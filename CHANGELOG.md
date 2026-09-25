# Changelog

## 0.6.0 — 2026-09-25

- **12 misiones originales nuevas** (24 en total), en castellano e inglés: fantasía, ciencia ficción, cyberpunk, western, noir, terror, folk horror, postapocalipsis, golpe y gótico.
- **Editor de misiones con ayuda**: cada campo explica qué tipo de contenido lleva y qué aporta, y las listas muestran un contador con el mínimo que exige el juego y lo recomendado. Al guardar avisa de las listas cortas.
- Nuevo campo de misión **«Lo que quiero de ti»**: sus entradas tienen prioridad en el dado de la ficha.
- Corregido: los botones de la cabecera de las ventanas (cerrar, menú, token) perdían el icono por un estilo demasiado general.

## 0.5.1 — 2026-09-25

- El manifiesto pasa a leerse de la última release (`releases/latest/download/system.json`) en lugar de la rama `main`. Así «Buscar actualizaciones» solo ve una versión cuando su zip ya está publicado y no depende de la caché de 5 minutos de GitHub.

## 0.5.0 — 2026-09-25

- **Tutorial «Cómo se juega»** en el vestíbulo y en la hoja común: cada fase con qué hacéis, para qué sirve y los pasos.
- **Tarjeta de fase**: al principio de cada fase, «Ahora» y «Para qué», con enlace a su sección del tutorial. Se puede ocultar (ajuste de cliente).
- **Reglas revisadas con el libro**:
  - quien elige el reto no puede escoger a su propio personaje para abrirlo;
  - las piedras se eligen en secreto pero se muestran a la vez cuando están todas, para explicar las rojas;
  - cada jugador crea también su secundario (nombre y concepto) antes de estar listo.
- **Escenas más simples**: un solo campo «¿Quién está, dónde y qué está pasando?».
- **Términos de la edición en castellano**: reto, personaje principal y secundario, *Lo que quiero de la misión*, *Lo que quiero de ti*, consecuencias y ritmo. Las piedras sacadas indican qué significa cada una (la compañía, el reto).
- La ficha principal enlaza con la del secundario.
- Corregido: las pestañas del vestíbulo y de la hoja común fallaban porque usaban la acción `tab`, reservada por Foundry.

## 0.4.0 — 2026-09-25

- **Hoja común y fichas propias.** La partida vive en un Actor «Compañía» que ve todo el grupo; cada jugador tiene su ficha de personaje (Actor propio, edición directa). Se crean en una carpeta al empezar.
- **Vestíbulo** con filtro por género, misión al azar, editor de misiones y archivo de compañías.
- **Indicador de turno** en ambas fichas y **tarjetas de chat** para desafíos, escenas, piedras y pérdidas.
- **Generadores**: unas 1.300 entradas por idioma en 10 géneros, con dados en cada campo de la ficha y de la escena, y «Completar lo que falta».
- **12 misiones originales**, entre ellas terror, slasher, dos de horror cósmico, horror gótico y folk horror.
- **Rediseño compacto**: cabecera fina, barra lateral estrecha, piedras secretas en la propia ficha y temas nuevos (terror, cósmico, gótico, folk, postapocalipsis).

## 0.3.0 — 2026-09-25

- El sistema pasa a ser una mesa para jugar a **Follow** (Ben Robbins), en una implementación no oficial para uso privado.
- Nuevo motor de reglas puro y probado: misión, compañía, tres desafíos, escenas por turno, bolsa de piedras secreta, pérdidas, ascensos, adopciones y epílogo.
- Ventana única compartida (ApplicationV2) con vestíbulo, crónica, misiones, comodidad en mesa y archivo.
- Los jugadores envían sus acciones al anfitrión por socket, con los permisos validados en el motor. Se añade `socket: true` al manifiesto: sin él, la sincronización de la versión anterior no funcionaba.
- Pausa compartida con botón de continuar para el anfitrión y avisos anónimos sin duplicados.
- Dos misiones de ejemplo originales (es/en) y editor de misiones con importación y exportación.
- Tipografías incluidas, temas por misión, portada en WebP (de 2,1 MB a 147 KB) y diseño adaptable al tamaño de la ventana.
- Corregido el flujo de publicación: ahora sube `mr-story-night.zip`.
- Eliminados el generador de premisas, el tablero anterior, los ambientes sonoros y el mapa de relaciones.

## 0.2.0 — 2026-09-25

- Tablero de relaciones, archivo, Story Packs, editor de contenido, seguridad, ambientes y créditos.

## 0.1.0 — 2026-09-25

- Primera versión pública en desarrollo.
