import { Compat } from "../compat.js";
export const BaseApp = Compat.ApplicationBase;
export const isV2 = Boolean(globalThis.foundry?.applications?.api?.ApplicationV2);

export function attachActions(root, owner) {
  root.querySelectorAll("[data-action]").forEach(element => element.addEventListener("click", event => owner._onAction?.(event, element.dataset.action)));
}
