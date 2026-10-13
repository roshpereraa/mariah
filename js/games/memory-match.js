/** Ornament Memory — flip the baubles two at a time and pair them up. */

import { el, shuffle } from '../ui.js';
import { sfx } from '../sfx.js';
import { makeHud, resultScreen } from './common.js';

const FACES = ['\u{1F384}', '\u{1F385}', '❄️', '\u{1F36C}', '\u{1F514}', '\u{1F98C}', '\u{1F381}', '⭐'];
const FLIP_BACK_MS = 760;

export default {
  id: 'memory-match',
  name: 'Ornament Memory',
  emoji: '\u{1F384}',
  blurb: 'Sixteen baubles, eight pairs. Twelve moves is a clean sweep. Everything after that costs you.',
  scoreLabel: 'points',

  mount(root, host) {
    const deck = shuffle([...FACES, ...FACES]);
    let flipped = [];       // currently face-up, unmatched
    let matches = 0;
    let moves = 0;
    let locked = false;
    let finished = false;
    let timers = [];

    const hud = makeHud([
      { key: 'pairs', label: 'of 8 pairs', value: 0 },
      { key: 'moves', label: 'moves', value: 0 },
      { key: 'best', label: 'best score', value: host.best },
    ]);

    const grid = el('div', { class: 'memory-grid' });
    const hint = el('p', { class: 'game-hint', text: 'Two flips a turn.' });
    const wrap = el('div', {}, hud.node, grid, hint);
    root.replaceChildren(wrap);

    deck.forEach((face, index) => {
      const front = el('span', { class: 'mcard__face mcard__front', text: face });
      const back = el('span', { class: 'mcard__face mcard__back', text: '❄' });
      const card = el('button', {
        class: 'mcard',
        type: 'button',
        'aria-label': `Bauble ${index + 1}, face down`,
        onclick: () => onFlip(card),
      }, el('span', { class: 'mcard__inner' }, back, front));
      card.dataset.face = face;
      grid.append(card);
    });

    function onFlip(card) {
      if (locked || finished) return;
      if (card.classList.contains('is-flipped') || card.classList.contains('is-matched')) return;

      card.classList.add('is-flipped');
      card.setAttribute('aria-label', `Bauble showing ${card.dataset.face}`);
      sfx.flip();
      flipped.push(card);
      if (flipped.length < 2) return;

      moves += 1;
      hud.set('moves', moves);
      const [a, b] = flipped;

      if (a.dataset.face === b.dataset.face) {
        flipped = [];
        a.classList.add('is-matched');
        b.classList.add('is-matched');
        matches += 1;
        hud.set('pairs', matches);
        sfx.good();
        if (matches === FACES.length) finish();
        return;
      }

      locked = true;
      timers.push(setTimeout(() => {
        a.classList.remove('is-flipped');
        b.classList.remove('is-flipped');
        [a, b].forEach((c) => c.setAttribute('aria-label', 'Bauble face down'));
        flipped = [];
        locked = false;
      }, FLIP_BACK_MS));
    }

    function finish() {
      finished = true;
      // 12 moves is near-perfect play; every extra move costs 40.
      const score = Math.max(100, 1200 - (moves - FACES.length) * 40);
      const record = host.submit(score);
      sfx.win();
      wrap.append(resultScreen({
        score: `${score}`,
        line: `Tree fully trimmed in ${moves} moves`,
        record,
        onReplay: () => host.restart(),
      }));
      hint.remove();
    }

    return () => { timers.forEach(clearTimeout); timers = []; };
  },
};
