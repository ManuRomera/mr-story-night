/**
 * Comportamiento común de las ventanas de la mesa:
 *  - no redibujar mientras alguien escribe (se redibuja al salir del campo),
 *  - recuperar el foco y la posición del cursor tras redibujar,
 *  - Intro en un campo en línea pulsa su botón.
 */
export function TableWindow(Base) {
  return class extends Base {
    #pending = false;
    #focus = null;

    #typing() {
      const active = document.activeElement;
      return Boolean(active && this.element?.contains(active) && active.matches("input[type=text], textarea"));
    }

    render(options = {}, ...rest) {
      const force = options === true || options?.force;
      if (this.rendered && !force && this.#typing()) { this.#pending = true; return this; }
      return super.render(options, ...rest);
    }

    requestRender() { if (this.rendered) this.render(); }

    async _preRender(context, options) {
      const active = document.activeElement;
      this.#focus = active && this.element?.contains(active)
        ? { selector: active.dataset.field ? `[data-field="${active.dataset.field}"]` : active.name ? `[name="${active.name}"]` : null, start: active.selectionStart, end: active.selectionEnd }
        : null;
      return super._preRender(context, options);
    }

    _onRender(context, options) {
      super._onRender(context, options);
      if (context?.theme) this.element.dataset.mrTheme = context.theme;
      const target = this.#focus?.selector ? this.element.querySelector(this.#focus.selector) : null;
      if (target && !target.disabled) {
        target.focus({ preventScroll: true });
        try { target.setSelectionRange?.(this.#focus.start, this.#focus.end); } catch { /* sin selección */ }
      }
    }

    _onFirstRender(context, options) {
      super._onFirstRender(context, options);
      this.element.addEventListener("focusout", () => {
        if (!this.#pending) return;
        setTimeout(() => { if (this.#typing() || !this.#pending) return; this.#pending = false; this.render(); }, 0);
      });
      this.element.addEventListener("keydown", event => {
        if (event.key !== "Enter" || event.target.tagName !== "INPUT" || event.target.dataset.field) return;
        const button = event.target.closest(".mr-inline")?.querySelector("button");
        if (button) { event.preventDefault(); button.click(); }
      });
    }
  };
}

export const localize = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
