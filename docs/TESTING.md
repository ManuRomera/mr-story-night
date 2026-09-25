# Pruebas

## Automáticas (`npm test`, `npm run validate`)

- Generadores: cada género tiene tablas amplias; cada misión genera de todo, en ambos idiomas; hay terror, cósmico, gótico y folk.
- Motor: partida completa de tres desafíos, suma de piedras, arrastre de resultados al tercer desafío, orden de escenas, electores sin repetición, permisos por asiento, pérdidas, ascensos, adopciones y reemplazo de historias.
- Vistas: cada momento de una partida simulada, en las cinco pestañas, como anfitrión y como jugador, en ambos idiomas y sin claves de traducción ausentes.
- Validación estática: JSON, sintaxis, equilibrio de bloques Handlebars, paridad de idiomas y referencias del manifiesto.

## Manuales en Foundry (pendientes de ejecutar en v13)

Una lista sin ejecutar no es una prueba superada. Registrad aquí cada ejecución con la versión exacta.

1. Instalar desde el manifiesto, crear un mundo y comprobar que carga sin errores de consola.
2. Anfitrión y dos jugadores en navegadores distintos: el vestíbulo se abre al anfitrión; tras empezar, la compañía se abre para todos.
3. Vestíbulo: filtrar por género, misión al azar, reordenar asientos, añadir un asiento sin cuenta y empezar. Comprobar la carpeta de Actores y la propiedad de cada ficha.
4. Preparación: dos personas editan campos a la vez sin perder lo que escriben; dado de dificultad.
5. Compañía: al pasar de fase, cada jugador ve su ficha; dados por campo y «Completar lo que falta»; un jugador no puede abrir en edición la ficha de otro; «Estoy listo» desde la ficha y desde la hoja común.
6. Desafío: solo quien elige puede rellenar los campos; las escenas empiezan por el asiento del protagonista.
7. Piedras: cada jugador ve solo su formulario; "Sacar dos piedras" se activa cuando todos han echado las suyas.
8. Resultado con pérdida: ascenso del secundario; asiento sin personajes → adoptar o presentar.
9. Tercer desafío: el texto del cuenco indica los éxitos y fracasos arrastrados.
10. Epílogo, cerrar, créditos, imprimir o guardar en PDF, y aparición en el Archivo.
11. Comodidad: pausa desde un jugador → pantalla para todos → el anfitrión continúa sin avisos repetidos.
12. Misiones: crear, duplicar, exportar e importar.
13. Recargar a mitad de desafío: el estado se conserva.
14. Ventana estrecha (unos 700 px) y alto contraste.

## Ejecuciones registradas

- Ninguna todavía en Foundry. Las vistas se han revisado renderizando las plantillas y el CSS reales en Chromium, y la integración con una simulación de la API de Foundry (actores, carpetas, hooks, ajustes, socket, acciones de las fichas y chat).
