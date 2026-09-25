import { SYSTEM_ID } from "./constants.js";
export class AmbientAudio {
  static context; static nodes = []; static current = null;
  static presets = { neutral:[55,82.4],noir:[46.2,69.3],horror:[36.7,55],cosmic:[41.2,61.7],fantasy:[65.4,98],"dark-fantasy":[43.7,65.4],"sci-fi":[73.4,110],cyberpunk:[82.4,123.5],"post-apocalyptic":[38.9,58.3],western:[49,73.4],"1920s":[55,82.4],contemporary:[65.4,87.3],pulp:[73.4,98],mystery:[51.9,77.8],gothic:[43.7,58.3],"space-survival":[34.6,51.9] };
  static async play(theme="neutral") {
    if (!game.settings.get(SYSTEM_ID,"audioEnabled")) return;
    this.stop(); const AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext; if(!AudioContextClass) return;
    this.context ??= new AudioContextClass(); await this.context.resume(); const master=this.context.createGain(); master.gain.value=game.settings.get(SYSTEM_ID,"audioVolume")*.08; master.connect(this.context.destination);
    const frequencies=this.presets[theme]??this.presets.neutral;
    frequencies.forEach((frequency,index)=>{const oscillator=this.context.createOscillator(),gain=this.context.createGain(),filter=this.context.createBiquadFilter();oscillator.type=index?"sine":"triangle";oscillator.frequency.value=frequency;oscillator.detune.value=index?7:-5;filter.type="lowpass";filter.frequency.value=420;gain.gain.value=index?.35:.5;oscillator.connect(filter).connect(gain).connect(master);oscillator.start();this.nodes.push(oscillator,gain,filter)});
    this.nodes.push(master); this.current=theme;
  }
  static stop(){for(const node of this.nodes){try{node.stop?.();node.disconnect?.()}catch{}}this.nodes=[];this.current=null}
}
