/** Tarjetas de chat para los momentos clave: así toda la mesa ve qué pasa sin abrir la hoja común. */
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const t = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const ROMAN = ["I", "II", "III"];
const stone = color => `<i class="mr-stone mr-stone--${color} mr-stone--sm" aria-label="${esc(t(`MR.Stone.${color}`))}"></i>`;

const BUILDERS = {
  start: d => ({ icon: "fa-solid fa-flag", eyebrow: t("MR.Chat.NewStory"), title: d.title, body: `<p>${esc(d.quest.goal)}</p><p class="mr-chat-card__meta">${esc(d.seats.map(s => s.name).join(" · "))}</p>` }),
  challenge: d => ({ icon: "fa-solid fa-mountain", eyebrow: `${t("MR.Step.challenge")} ${ROMAN[d.n - 1]}`, title: d.title, body: `${d.why ? `<p><em>${esc(d.why)}</em></p>` : ""}<p class="mr-chat-card__meta">${esc(t("MR.Challenge.LeadIs", { name: d.lead }))} · ${esc(t("MR.Challenge.PickedBy", { name: d.picker }))}</p>` }),
  scene: d => ({ icon: "fa-solid fa-clapperboard", eyebrow: t("MR.Scene.Of", { n: d.n, total: d.of }), title: t("MR.Scene.Establishes", { name: d.seat }), body: d.character ? `<p class="mr-chat-card__meta">${esc(d.character)}</p>` : "" }),
  stones: d => ({ icon: "fa-solid fa-hand-holding", eyebrow: `${t("MR.Step.challenge")} ${ROMAN[d.n - 1]}`, title: t("MR.Chat.StonesTime"), body: `<p>${esc(t("MR.Stones.Help"))}</p>` }),
  draw: d => ({ icon: "fa-solid fa-circle-half-stroke", eyebrow: `${t("MR.Step.challenge")} ${ROMAN[d.n - 1]}`, title: t(`MR.Outcome.${d.key}.Title`), body: `<p class="mr-chat-card__stones">${d.draw.map(stone).join("")}</p><p>${esc(t(`MR.Outcome.${d.key}.Text`))}</p>`, tone: d.key.endsWith("white") ? "good" : "bad" }),
  loss: d => ({ icon: "fa-solid fa-user-slash", eyebrow: t(`MR.Fate.${d.fate}`), title: d.name, body: `${d.note ? `<p>${esc(d.note)}</p>` : ""}${d.promoted ? `<p class="mr-chat-card__meta">${esc(t("MR.Loss.Promoted", { name: d.promoted }))}</p>` : ""}`, tone: "bad" }),
  questEnd: d => ({ icon: "fa-solid fa-flag-checkered", eyebrow: t("MR.Step.epilogue"), title: t(d.success ? "MR.Credits.Success" : "MR.Credits.Failure"), body: `<p>${esc(d.goal)}</p><p class="mr-chat-card__meta">${esc(t("MR.Epilogue.Help"))}</p>`, tone: d.success ? "good" : "bad" }),
  finish: d => ({ icon: "fa-solid fa-book", eyebrow: "MR · STORY NIGHT", title: d.title, body: `<p>${esc(t("MR.Credits.Thanks"))}</p>` })
};

export function cardHTML(kind, data) {
  const c = BUILDERS[kind](data);
  return `<article class="mr-chat-card ${c.tone ? `is-${c.tone}` : ""}"><header><i class="${c.icon}"></i><span>${esc(c.eyebrow)}</span></header><h3>${esc(c.title)}</h3>${c.body}</article>`;
}

export async function postCard(kind, data) {
  try { await ChatMessage.create({ content: cardHTML(kind, data), speaker: { alias: game.i18n.localize("MR.Chat.Speaker") } }); }
  catch (error) { console.warn("MR · Story Night | chat", error); }
}
