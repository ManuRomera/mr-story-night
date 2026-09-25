# Changelog

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
