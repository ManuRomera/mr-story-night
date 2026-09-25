# MR · Story Night para Foundry VTT

> **Versión 0.2.0.** Sistema jugable de principio a fin. La compatibilidad v13 está probada en Foundry 13.351; v14 conserva soporte implementado y validación estática, pendiente únicamente de ejecutarse en una instalación v14 disponible.

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
- Tablero gráfico de relaciones con posiciones persistentes.
- Archivo de historias, Story Packs y editor de contenido ampliable.
- Herramientas anónimas de comodidad en mesa y pausa compartida.
- Ambientes sonoros generativos originales y créditos finales exportables.
- Arte de portada original integrado.

## Compatibilidad

| Versión del sistema | Foundry VTT mínimo | Foundry VTT verificado |
|---|---|---|
| 0.2.0 | v13 | v13.351 |

El flujo completo se ha probado en Foundry v13.351: detección, creación de mundo, carga, asistente en castellano, generación, tablero y herramientas avanzadas. La máquina de desarrollo no dispone de una instalación v14; no se declara una prueba real de esa versión hasta poder ejecutarla. Consulta [la lista de pruebas](docs/TESTING.md).

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
