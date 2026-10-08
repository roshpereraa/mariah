/** Short Web Audio blips for the games, sharing the player's AudioContext. */

import { music } from './audio.js';

let ctx = null;
let bus = null;

async function ready() {
  if (bus) return true;
  ctx = await music.ensureContext();
  if (!ctx) return false;
  bus = ctx.createGain();
  bus.gain.value = 0.3;
  bus.connect(ctx.destination);
  return true;
}

function tone({ freq, dur = 0.16, type = 'sine', gain = 0.3, slideTo = null }) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function chime(midis, spacing = 0.07) {
  const t0 = ctx.currentTime;
  midis.forEach((m, i) => {
    const hz = 440 * Math.pow(2, (m - 69) / 12);
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const t = t0 + i * spacing;
    osc.type = 'sine';
    osc.frequency.value = hz;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.26, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(env).connect(bus);
    osc.start(t);
    osc.stop(t + 0.55);
  });
}

function noiseHit(gain = 0.25) {
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * 0.14);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  const bp = ctx.createBiquadFilter();
  const env = ctx.createGain();
  src.buffer = buf;
  bp.type = 'bandpass';
  bp.frequency.value = 4800;
  bp.Q.value = 1.6;
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  src.connect(bp).connect(env).connect(bus);
  src.start(t);
}

/** Every sound is fire-and-forget: a failure must never break a game. */
async function safe(fn) {
  try {
    if (await ready()) fn();
  } catch { /* audio is a nicety, not a feature */ }
}

export const sfx = {
  good:  () => safe(() => chime([72, 76, 79])),
  great: () => safe(() => chime([72, 76, 79, 84], 0.06)),
  bad:   () => safe(() => tone({ freq: 220, slideTo: 90, dur: 0.28, type: 'sawtooth', gain: 0.2 })),
  pop:   () => safe(() => tone({ freq: 880, slideTo: 1500, dur: 0.1, type: 'triangle' })),
  bonk:  () => safe(() => { noiseHit(0.22); tone({ freq: 320, slideTo: 140, dur: 0.14, type: 'square', gain: 0.18 }); }),
  flip:  () => safe(() => tone({ freq: 640, dur: 0.07, type: 'triangle', gain: 0.18 })),
  bell:  () => safe(() => noiseHit(0.16)),
  win:   () => safe(() => chime([67, 72, 76, 79, 84, 88], 0.085)),
  lose:  () => safe(() => chime([64, 61, 57, 52], 0.12)),
};
