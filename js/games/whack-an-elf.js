/**
 * Elf Patrol — the elves are hiding in the snowdrifts. Bop the elves, let the
 * Grinches alone, and don't touch the wrapped gifts (those are already done).
 */

import { el, randInt } from '../ui.js';
import { sfx } from '../sfx.js';
import { makeHud, countdown, resultScreen } from './common.js';

const HOLES = 9;
const ROUND = 40;

const CRITTERS = [
  { emoji: '\u{1F9DD}', points: 10, good: true,  weight: 54 }, // elf
  { emoji: '\u{1F385}', points: 30, good: true,  weight: 10 }, // santa bonus
  { emoji: '\u{1F47F}', points: -15, good: false, weight: 22 }, // imp — leave it
  { emoji: '\u{1F381}', points: -10, good: false, weight: 14 }, // already wrapped
];

const TOTAL = CRITTERS.reduce((s, c) => s + c.weight, 0);

function pickCritter() {
  let roll = Math.random() * TOTAL;
  for (const c of CRITTERS) {
    roll -= c.weight;
    if (roll <= 0) return c;
  }
  return CRITTERS[0];
}

export default {
  id: 'whack-an-elf',
  name: 'Elf Patrol',
  emoji: '\u{1F9DD}',
  blurb: 'Elves keep popping out of the snowdrifts to peek at the presents. Bop every elf, spare the imps, and keep your hands off the wrapped gifts.',
  scoreLabel: 'points',

  mount(root, host) {
    let score = 0, hits = 0, misses = 0, finished = false;
    let spawnTimer = null;
    const upTimers = new Map();

    const hud = makeHud([
      { key: 'score', label: 'score', value: 0 },
      { key: 'time', label: 'seconds left', value: ROUND },
      { key: 'hits', label: 'elves bopped', value: 0 },
      { key: 'best', label: 'best', value: host.best },
    ]);

    const grid = el('div', { class: 'elf-grid' });
    const hint = el('p', { class: 'game-hint',
      text: '\u{1F9DD} +10 · \u{1F385} +30 · \u{1F47F} −15 · \u{1F381} −10. They get quicker as the round goes on.' });
    const wrap = el('div', {}, hud.node, grid, hint);
    root.replaceChildren(wrap);

    const holes = Array.from({ length: HOLES }, (_, i) => {
      const critter = el('span', { class: 'hole__critter' });
      const hole = el('button', {
        class: 'hole', type: 'button',
        'aria-label': `Snowdrift ${i + 1}`,
        onclick: () => onBop(hole),
      }, critter);
      hole._critter = critter;
      hole._data = null;
      grid.append(hole);
      return hole;
    });

    function flash(hole, cls) {
      hole.classList.add(cls);
      setTimeout(() => hole.classList.remove(cls), 320);
    }

    function hide(hole) {
      hole.classList.remove('is-up', 'is-bonked');
      hole._data = null;
      const t = upTimers.get(hole);
      if (t) { clearTimeout(t); upTimers.delete(hole); }
    }

    function onBop(hole) {
      if (finished || !hole._data || hole.classList.contains('is-bonked')) return;
      const data = hole._data;

      if (data.good) {
        score += data.points;
        hits += 1;
        hud.set('hits', hits);
        hole.classList.add('is-bonked');
        flash(hole, 'is-hit');
        sfx.bonk();
        setTimeout(() => hide(hole), 180);
      } else {
        score = Math.max(0, score + data.points);
        misses += 1;
        flash(hole, 'is-miss');
        sfx.bad();
        hide(hole);
      }
      hud.set('score', score);
    }

    let elapsed = 0;

    function popOne() {
      const free = holes.filter((h) => !h._data);
      if (free.length) {
        const hole = free[randInt(free.length)];
        const data = pickCritter();
        hole._data = data;
        hole._critter.textContent = data.emoji;
        hole.classList.add('is-up');
        sfx.pop();

        const visible = Math.max(620, 1500 - elapsed * 22);
        upTimers.set(hole, setTimeout(() => hide(hole), visible));
      }

      const gap = Math.max(260, 780 - elapsed * 11);
      spawnTimer = setTimeout(popOne, gap + Math.random() * 180);
    }

    spawnTimer = setTimeout(popOne, 500);

    const clock = countdown(ROUND, (left) => {
      elapsed = ROUND - left;
      hud.set('time', left);
    }, () => finish());

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(spawnTimer);
      upTimers.forEach((t) => clearTimeout(t));
      upTimers.clear();
      holes.forEach((h) => h.classList.remove('is-up'));

      const record = host.submit(score);
      if (record) sfx.win(); else sfx.lose();
      wrap.append(resultScreen({
        score: `${score}`,
        line: `${hits} elves bopped · ${misses} wrong calls`,
        record,
        onReplay: () => host.restart(),
      }));
      hint.remove();
    }

    return () => {
      finished = true;
      clearTimeout(spawnTimer);
      upTimers.forEach((t) => clearTimeout(t));
      upTimers.clear();
      clock.stop();
    };
  },
};
