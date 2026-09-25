const { StringField, HTMLField, ObjectField } = foundry.data.fields;

/** Personaje: lo que el jugador escribe en su ficha. Las reglas (rol, estado) viven en la compañía. */
export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      concept: new StringField({ initial: "" }), pronouns: new StringField({ initial: "" }),
      desire: new StringField({ initial: "" }), want: new StringField({ initial: "" }), detail: new StringField({ initial: "" }),
      notes: new HTMLField({ initial: "" }), fellowship: new StringField({ initial: "" })
    };
  }
}

/** La compañía: la hoja común con todo el estado de la partida. */
export class FellowshipData extends foundry.abstract.TypeDataModel {
  static defineSchema() { return { state: new ObjectField({ nullable: true, initial: null }) }; }
}
