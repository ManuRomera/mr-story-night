# MR · Story Night — Follow para Foundry VTT

> **Implementación no oficial y para uso privado** del juego **[Follow](https://www.lamemage.com/follow/)**, de **Ben Robbins** (Lame Mage Productions). No está afiliada ni aprobada por su autor. Para jugar necesitas conocer las reglas: la edición gratuita *Follow: A New Fellowship* está en [lamemage.com/follow](https://www.lamemage.com/follow/) y en [itch.io](https://lamemage.itch.io/follow-new-fellowship). Si Follow te gusta, cómpralo.
>
> Este repositorio no incluye textos del libro: todas las pantallas, ayudas y misiones de ejemplo están redactadas desde cero. Las misiones oficiales puedes introducirlas tú en tu mundo desde la pestaña **Misiones**.

**Versión 0.3.0** · Foundry VTT v13 · Español e inglés

## Qué es

Una **mesa compartida sin director**. Todo el grupo ve la misma ventana y cada persona actúa desde su sitio:

1. **Vestíbulo**: se elige la misión y quién se sienta a la mesa, en orden (la siguiente persona es la que tienes a tu izquierda). Se pueden añadir asientos para gente sin cuenta.
2. **La misión**: el grupo ajusta el objetivo, responde las preguntas de la misión y fija dos dificultades.
3. **La compañía**: cada persona crea un protagonista (concepto, nombre, qué significa para él el éxito y qué necesita del protagonista de su izquierda) y un secundario. Cada cual marca "Estoy listo".
4. **Tres desafíos**. En cada uno:
   - una persona que aún no haya elegido escoge el desafío, explica por qué es difícil, elige qué protagonista lo encabeza y fija la escala de tiempo;
   - se juega **una escena por persona**, empezando por quien lleva a ese protagonista y siguiendo el orden de la mesa, con registro de *consecuencias*;
   - cada persona echa **sus piedras en secreto** (rojas según el descontento de su personaje, blanca o roja según si cree que la compañía hizo lo necesario). El cuenco empieza con una blanca y una roja; en el tercer desafío suma además una blanca por cada éxito y una roja por cada fracaso anteriores;
   - se sacan **dos piedras** y la mesa muestra el resultado. Si hay pérdida, el grupo decide qué personaje sale de la historia y cómo. Si cae un protagonista, su secundario asciende; si un asiento se queda sin nadie, adopta un secundario ajeno o presenta a alguien nuevo.
5. **Epílogo** de cada protagonista y **créditos finales**, que se pueden imprimir o guardar en PDF y quedan en el **Archivo**.

Además incluye:

- **Crónica** automática de todo lo ocurrido.
- **Comodidad en mesa**: pausa, rebobinar y fundido a negro anónimos, y líneas y velos visibles para todo el grupo.
- **Editor de misiones**, con importación y exportación en JSON.
- Estética propia para cada misión (fantasía, ciencia ficción, noir, terror, western, cyberpunk o neutra), alto contraste, tamaño de texto y reducción de animaciones.

## Tabla de resultados

La tabla vive en `scripts/engine.js` (`OUTCOMES`) y se puede ajustar si tu edición difiere:

| 1ª piedra | 2ª piedra | Resultado |
|---|---|---|
| Blanca | Blanca | Éxito |
| Roja | Blanca | Éxito, pero se pierde un personaje |
| Blanca | Roja | Fracaso y se pierde un personaje |
| Roja | Roja | Fracaso y traición (o pérdida) |

## Instalación

En Foundry VTT: **Sistemas de juego → Instalar sistema** y pega esta URL de manifiesto:

```text
https://raw.githubusercontent.com/ManuRomera/mr-story-night/main/system.json
```

**Importante:** Foundry necesita un usuario GM conectado para guardar datos del mundo. Aquí ese GM actúa solo como **anfitrión técnico**: es un asiento más de la mesa, no dirige la partida. Si no hay anfitrión conectado, la mesa lo avisa.

La mesa se abre sola al entrar (se puede desactivar en los ajustes), con el botón de la barra lateral de **Ajustes**, con el icono de la capa de **Notas** o con `Mayús + T`.

## Desarrollo

Requiere Node 20 o posterior.

```text
npm test          # motor de reglas y vistas: partida completa simulada, permisos, piedras, traducciones
npm run validate  # JSON, sintaxis, plantillas, paridad de idiomas y referencias del manifiesto
npm run release   # valida, prueba y empaqueta en outputs/
```

La arquitectura está en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) y la lista de pruebas manuales en [docs/TESTING.md](docs/TESTING.md).

## Créditos

- Juego original: **Follow**, © Ben Robbins / Lame Mage Productions. Todos los derechos de sus textos pertenecen a su autor.
- Sistema para Foundry: Manu Romera. El código se publica con licencia MIT (ver [LICENSE](LICENSE)); la licencia no cubre el juego Follow.
- Tipografías incluidas: Cormorant Garamond e Inter, bajo SIL Open Font License (`assets/fonts`).
