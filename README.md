# MR · Story Night para Foundry VTT

> **WIP / Work in Progress.** El sistema ya permite crear y conducir historias, pero continúa en desarrollo activo. Las funciones, textos narrativos y compatibilidad pueden cambiar entre versiones.

**Zero Prep. One Night. Any Story.** Un sistema narrativo original para reunir al grupo, crear una premisa en minutos y jugar una historia autoconclusiva sin preparación previa.

## Instalación directa

En Foundry VTT ve a **Configuración → Sistemas de juego → Instalar sistema** y pega esta URL en **URL del Manifiesto**:

```text
https://raw.githubusercontent.com/ManuRomera/mr-story-night/main/system.json
```

Foundry descargará el sistema desde la última release y avisará cuando haya actualizaciones.

## Qué incluye

- Asistente visual de creación en cinco pasos.
- 16 géneros originales y más de 800 combinaciones básicas de premisa por género.
- Generación reproducible mediante semillas.
- Tablero compartido con premisa, objetivo, amenaza, presión, protagonistas y escena actual.
- Protagonistas narrativos sin estadísticas tradicionales.
- Escenas con herramientas para complicar, cambiar el foco y aumentar la tensión.
- Historial de acontecimientos y deshacer.
- Sincronización multiusuario mediante sockets de Foundry.
- Exportación e importación mediante API.
- Interfaz en castellano e inglés.
- 16 temas visuales, diseño responsive y ajustes de accesibilidad.

## Compatibilidad

| Versión del sistema | Foundry VTT mínimo | Foundry VTT verificado |
|---|---|---|
| 0.1.0 WIP | v13 | Pendiente de prueba real |

El código incluye una capa de compatibilidad para las diferencias conocidas entre v13 y v14. Esta primera publicación ha pasado validaciones automatizadas, pero todavía no se certifica mediante una regresión completa dentro de instalaciones reales de ambas versiones. Consulta [la lista de pruebas](docs/TESTING.md).

## Desarrollo y validación

Requiere Node 20 o posterior:

```text
npm test
npm run validate
npm run release
```

Las pruebas comprueban la generación determinista, los 16 bancos de género, amplitud combinatoria, JSON, sintaxis JavaScript, plantillas, traducciones y referencias del manifiesto.

## API para módulos

La API se publica como `game["mr-story-night"]`. Permite abrir el tablero, iniciar una historia, generar inspiración, actualizar el estado compartido e importar o exportar Story Packs. Los cambios emiten el hook `mrStoryNightStoryChanged`.

## Autoría y comunidad

Sistema desarrollado por **Manu Romera** con asistencia de OpenAI.

El concepto, las mecánicas concretas y los bancos narrativos de MR · Story Night son originales. El proyecto no reproduce textos ni procedimientos de juegos comerciales.

## Repositorio y releases

- Repositorio: https://github.com/ManuRomera/mr-story-night
- Releases: https://github.com/ManuRomera/mr-story-night/releases
- Manifest: https://raw.githubusercontent.com/ManuRomera/mr-story-night/main/system.json

## Informar de un problema

Si encuentras un fallo, especialmente al usar Foundry VTT v13 o v14, [abre una incidencia en GitHub](https://github.com/ManuRomera/mr-story-night/issues/new/choose) e indica las versiones exactas, los pasos para reproducirlo y cualquier error de consola.

## Licencia

El código se publica con licencia MIT. Consulta [LICENSE](LICENSE).
