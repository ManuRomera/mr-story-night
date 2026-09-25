import { TEMPLATES } from "../constants.js";

const { StringField, HTMLField } = foundry.data.fields;

/** Actor opcional para quien quiera fichas o fichas de token; la partida vive en la mesa. */
export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { concept: new StringField({ initial: "" }), notes: new HTMLField({ initial: "" }) };
  }
}

const { HandlebarsApplicationMixin } = foundry.applications.api;
export class CharacterSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["mr-app", "mr-character-sheet"],
    position: { width: 520, height: 480 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: { mrEditImage: CharacterSheet.#onEditImage }
  };
  static PARTS = { sheet: { template: `${TEMPLATES}/character-sheet.hbs` } };

  static #onEditImage() {
    if (!this.isEditable) return;
    const Picker = foundry.applications.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    new Picker({ type: "image", current: this.document.img, callback: path => this.document.update({ img: path }) }).render(true);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return { ...context, actor: this.document, system: this.document.system, editable: this.isEditable };
  }
}
