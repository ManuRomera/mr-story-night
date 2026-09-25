import { Store } from "./store.js";

let lastSignal = undefined;

/** Pantalla de pausa compartida y avisos anónimos. El anfitrión conserva el botón de continuar. */
export function syncSafety({ notify = true } = {}) {
  const safety = Store.safety;
  let overlay = document.getElementById("mr-pause");
  if (safety.paused) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "mr-pause"; overlay.setAttribute("role", "alertdialog"); overlay.setAttribute("aria-live", "assertive");
      document.body.append(overlay);
    }
    overlay.innerHTML = `<div class="mr-pause__box"><i class="fa-solid fa-hand"></i><h2>${game.i18n.localize("MR.Safety.Paused")}</h2><p>${game.i18n.localize("MR.Safety.PausedBody")}</p>${game.user.isGM ? `<button type="button" class="mr-primary" data-mr-resume>${game.i18n.localize("MR.Safety.Resume")}</button>` : `<p class="mr-note">${game.i18n.localize("MR.Safety.PausedWait")}</p>`}</div>`;
    overlay.querySelector("[data-mr-resume]")?.addEventListener("click", () => Store.safetyAction("resume"));
  } else overlay?.remove();

  const signal = safety.lastSignal;
  if (notify && lastSignal !== undefined && signal && signal.id !== lastSignal?.id && signal.type !== "pause") {
    ui.notifications.warn(game.i18n.localize(`MR.Safety.Signal.${signal.type}`), { permanent: false });
  }
  lastSignal = signal ?? null;
}
