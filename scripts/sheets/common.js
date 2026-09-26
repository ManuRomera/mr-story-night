import { Presence } from "../presence.js";
import { AccessPanel } from "../access.js";

const EDITABLE = "input[type=text], textarea";
const LIVE_DELAY = 700;
const fieldKey = el => el.dataset.field || el.name || "";
const selectorFor = el => el.dataset.field ? `:is(input, textarea)[data-field="${el.dataset.field}"]` : el.name ? `:is(input, textarea)[name="${el.name}"]` : null;

export const localize = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

/** Todas las ventanas del sistema abiertas ahora mismo. */
export const tableWindows = () => [...foundry.applications.instances.values()].filter(app => app.isTableWindow);

/**
 * Comportamiento común de las ventanas de la mesa:
 *  - se redibujan en cuanto alguien cambia algo, sin perder lo que estás escribiendo ni el cursor;
 *  - lo que escribes en un campo compartido se guarda mientras escribes, para que el resto lo vea;
 *  - un campo que otra persona está editando queda bloqueado con su nombre;
 *  - botón de lectura cómoda en la cabecera, junto al de cerrar;
 *  - Intro en un campo en línea pulsa su botón.
 */
export function TableWindow(Base) {
  return class extends Base {
    static DEFAULT_OPTIONS = { actions: { mrAccess: function () { AccessPanel.open(); } } };

    #timers = new Map();
    get isTableWindow() { return true; }

    /** Documento al que pertenece un campo compartido; null si el campo es solo local. */
    _presenceDoc(_el) { return null; }
    /** Guarda el valor de un campo mientras se escribe. */
    async _commitLive(_el) {}

    requestRender() { if (this.rendered) this.render(); }

    async _renderFrame(options) {
      const frame = await super._renderFrame(options);
      const close = frame.querySelector(".window-header [data-action=close]");
      if (close && !frame.querySelector("[data-action=mrAccess]")) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "header-control icon fa-solid fa-universal-access";
        button.dataset.action = "mrAccess";
        button.dataset.tooltip = localize("MR.Access.Title");
        button.setAttribute("aria-label", localize("MR.Access.Title"));
        close.before(button);
      }
      return frame;
    }

    /** El cambio de HTML es síncrono: aquí no se puede perder ninguna pulsación. */
    _replaceHTML(result, content, options) {
      const active = document.activeElement;
      const keep = active && content.contains(active) && active.matches(EDITABLE)
        ? { selector: selectorFor(active), value: active.value, start: active.selectionStart, end: active.selectionEnd }
        : null;
      super._replaceHTML(result, content, options);
      const el = keep?.selector ? content.querySelector(keep.selector) : null;
      if (el && !el.disabled) {
        if (el.value !== keep.value) el.value = keep.value;
        el.focus({ preventScroll: true });
        try { el.setSelectionRange(keep.start, keep.end); } catch { /* sin selección */ }
      }
      this.decorateLocks();
    }

    _onRender(context, options) {
      super._onRender(context, options);
      if (context?.theme) this.element.dataset.mrTheme = context.theme;
    }

    /** Marca los campos que otra persona está editando. */
    decorateLocks() {
      if (!this.element) return;
      for (const el of this.element.querySelectorAll(EDITABLE)) {
        const doc = this._presenceDoc(el);
        const holder = doc ? Presence.holder(doc, fieldKey(el)) : null;
        const box = el.closest(".mr-field, .mr-with-die, .mr-epilogue-card") ?? el.parentElement;
        if (holder) {
          el.readOnly = true; el.dataset.mrLocked = "1";
          box.dataset.lock = localize("MR.Presence.Editing", { name: holder.name });
          box.style.setProperty("--mr-lock-color", holder.color?.css ?? "var(--mr-accent)");
        } else if (el.dataset.mrLocked) {
          el.readOnly = false; delete el.dataset.mrLocked; delete box.dataset.lock;
        }
      }
    }

    _onFirstRender(context, options) {
      super._onFirstRender(context, options);
      const shared = el => el?.matches?.(EDITABLE) && !el.disabled ? this._presenceDoc(el) : null;
      this.element.addEventListener("focusin", event => {
        const el = event.target, doc = shared(el);
        if (!doc) return;
        const holder = Presence.holder(doc, fieldKey(el));
        if (!holder) return Presence.claim(doc, fieldKey(el));
        el.blur();
        ui.notifications.info(localize("MR.Presence.Busy", { name: holder.name }));
      });
      this.element.addEventListener("input", event => {
        const el = event.target, doc = shared(el);
        if (!doc || el.readOnly) return;
        Presence.claim(doc, fieldKey(el));
        clearTimeout(this.#timers.get(el));
        this.#timers.set(el, setTimeout(() => { this.#timers.delete(el); this._commitLive(el); }, LIVE_DELAY));
      });
      this.element.addEventListener("focusout", event => {
        const el = event.target, doc = shared(el);
        if (!doc || el.readOnly) return;
        clearTimeout(this.#timers.get(el)); this.#timers.delete(el);
        Presence.release(doc, fieldKey(el));
      });
      this.element.addEventListener("keydown", event => {
        if (event.key !== "Enter" || event.target.tagName !== "INPUT" || event.target.dataset.field) return;
        const button = event.target.closest(".mr-inline")?.querySelector("button");
        if (button) { event.preventDefault(); button.click(); }
      });
    }
  };
}
