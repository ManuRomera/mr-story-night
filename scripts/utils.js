export const uid = () => globalThis.foundry?.utils?.randomID?.() ?? crypto.randomUUID().replace(/-/g, "").slice(0, 16);
export const clone = value => structuredClone(value);
export const randomUnit = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
export const slug = value => String(value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "historia";
export function download(filename, data) {
  const blob = new Blob([typeof data === "string" ? data : JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export const lines = value => String(value ?? "").split("\n").map(x => x.trim()).filter(Boolean);
