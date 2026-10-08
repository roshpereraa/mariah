/** Shared furniture for the mini-games: HUD chips, countdowns, result screens. */

import { el } from '../ui.js';

/** A row of live-updating stat chips. Returns { node, set(key, value) }. */
export function makeHud(chips) {
  const refs = {};
  const node = el('div', { class: 'hud' },
    chips.map(({ key, label, value }) => {
      const b = el('b', { text: String(value) });
      refs[key] = b;
      return el('span', { class: 'hud__chip' }, b, el('em', { text: label, style: { fontStyle: 'normal', opacity: .75 } }));
    }),
  );
  return {
    node,
    set(key, value) { if (refs[key]) refs[key].textContent = String(value); },
  };
}

/**
 * A once-per-second countdown that stops itself.
 * @returns {{stop: () => void}}
 */
export function countdown(seconds, onTick, onDone) {
  let left = seconds;
  onTick(left);
  const timer = setInterval(() => {
    left -= 1;
    onTick(Math.max(0, left));
    if (left <= 0) { clearInterval(timer); onDone(); }
  }, 1000);
  return { stop: () => clearInterval(timer) };
}

/**
 * The end-of-round panel.
 * @param {object} opts
 * @param {string} opts.score    Big headline number/text
 * @param {string} opts.line     Supporting line
 * @param {boolean} opts.record  Show the new-best flourish
 * @param {() => void} opts.onReplay
 */
export function resultScreen({ score, line, record, onReplay }) {
  return el('div', { class: 'result' },
    record ? el('span', { class: 'pill', text: 'New personal best' }) : null,
    el('div', { class: 'result__score gold-text', text: score }),
    el('p', { class: 'result__line', text: line }),
    el('div', { class: 'game-actions' },
      el('button', { class: 'btn btn--gold', onclick: onReplay }, 'Play again'),
    ),
  );
}

/** Pointer position in canvas CSS pixels, for mouse and touch alike. */
export function pointerX(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.touches ? event.touches[0].clientX : event.clientX) - rect.left;
  return (x / rect.width) * canvas.width;
}
