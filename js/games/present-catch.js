/**
 * Present Catch — steer the sleigh, gather the gifts, dodge the coal.
 * Canvas game; pointer, touch and arrow keys all drive the sleigh.
 */

import { el, clamp } from '../ui.js';
import { sfx } from '../sfx.js';
import { makeHud, countdown, resultScreen, pointerX } from './common.js';

const W = 800, H = 600;
const ROUND = 55;              // seconds
const GROUND = H - 92;
const SLEIGH_W = 112, SLEIGH_H = 54;
const SLEIGH_OVERHANG = 22;   // the runner curl drawn past the hit box

const GIFTS = [
  { emoji: '\u{1F381}', points: 10, weight: 40 },  // gift
  { emoji: '\u{1F36C}', points: 15, weight: 22 },  // candy
  { emoji: '\u{2B50}',  points: 25, weight: 12 },  // star
  { emoji: '\u{1F514}', points: 20, weight: 14 },  // bell
  { emoji: '\u{1FAA8}', points: -20, weight: 12, bad: true }, // coal (rock)
];

const TOTAL_WEIGHT = GIFTS.reduce((s, g) => s + g.weight, 0);

function pickGift() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const g of GIFTS) {
    roll -= g.weight;
    if (roll <= 0) return g;
  }
  return GIFTS[0];
}

export default {
  id: 'present-catch',
  name: 'Present Catch',
  emoji: '\u{1F6F7}',
  blurb: 'Mariah has dropped the entire gift list out of the sleigh. Sweep it up before it hits the snow — and leave the coal alone.',
  scoreLabel: 'points',

  mount(root, host) {
    let raf = null, clock = null, finished = false;

    const hud = makeHud([
      { key: 'score', label: 'score', value: 0 },
      { key: 'time', label: 'seconds left', value: ROUND },
      { key: 'streak', label: 'streak', value: 0 },
      { key: 'best', label: 'best', value: host.best },
    ]);

    const canvas = el('canvas', { class: 'game-canvas', width: W, height: H,
      'aria-label': 'Present Catch playfield' });
    const hint = el('p', { class: 'game-hint',
      text: 'Move the pointer or use ← → to steer. Gifts score, coal costs you 20.' });
    const wrap = el('div', {}, hud.node, canvas, hint);

    root.replaceChildren(wrap);

    const ctx = canvas.getContext('2d');
    const state = {
      sleighX: W / 2,
      targetX: W / 2,
      items: [],
      score: 0,
      streak: 0,
      bestStreak: 0,
      caught: 0,
      spawnEvery: 0.62,
      sinceSpawn: 0,
      pops: [],
      keys: new Set(),
      elapsed: 0,
    };

    // ---------------------------------------------------------- input
    const onPointer = (e) => { state.targetX = pointerX(canvas, e); };
    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { state.keys.add(e.key); e.preventDefault(); }
    };
    const onKeyUp = (e) => state.keys.delete(e.key);

    canvas.addEventListener('pointermove', onPointer);
    canvas.addEventListener('pointerdown', onPointer);
    canvas.addEventListener('touchmove', (e) => { onPointer(e); e.preventDefault(); }, { passive: false });
    addEventListener('keydown', onKeyDown);
    addEventListener('keyup', onKeyUp);

    // ---------------------------------------------------------- simulation
    function spawn() {
      const g = pickGift();
      state.items.push({
        ...g,
        x: 40 + Math.random() * (W - 80),
        y: -40,
        vy: 150 + Math.random() * 110 + state.elapsed * 2.2,
        vx: (Math.random() - 0.5) * 50,
        spin: (Math.random() - 0.5) * 2.4,
        rot: 0,
        size: g.points === 25 ? 40 : 36,
      });
    }

    function burst(x, y, text, good) {
      state.pops.push({ x, y, text, good, life: 1 });
    }

    function update(dt) {
      state.elapsed += dt;

      // Keyboard nudges the target; pointer sets it outright.
      if (state.keys.has('ArrowLeft')) state.targetX -= 560 * dt;
      if (state.keys.has('ArrowRight')) state.targetX += 560 * dt;
      const margin = SLEIGH_W / 2 + SLEIGH_OVERHANG;
      state.targetX = clamp(state.targetX, margin, W - margin);
      state.sleighX += (state.targetX - state.sleighX) * Math.min(1, 12 * dt);

      // Difficulty creeps up across the round.
      state.spawnEvery = Math.max(0.26, 0.62 - state.elapsed * 0.006);
      state.sinceSpawn += dt;
      if (state.sinceSpawn >= state.spawnEvery) { state.sinceSpawn = 0; spawn(); }

      const left = state.sleighX - SLEIGH_W / 2;
      const right = state.sleighX + SLEIGH_W / 2;

      for (let i = state.items.length - 1; i >= 0; i--) {
        const it = state.items[i];
        it.y += it.vy * dt;
        it.x += it.vx * dt;
        it.rot += it.spin * dt;
        if (it.x < 24 || it.x > W - 24) it.vx *= -1;

        const inMouth = it.y + it.size * 0.4 >= GROUND - SLEIGH_H
          && it.y - it.size * 0.4 <= GROUND - SLEIGH_H * 0.2
          && it.x > left - 10 && it.x < right + 10;

        if (inMouth) {
          state.items.splice(i, 1);
          if (it.bad) {
            state.score = Math.max(0, state.score + it.points);
            state.streak = 0;
            burst(it.x, it.y, `${it.points}`, false);
            sfx.bad();
          } else {
            state.streak += 1;
            state.bestStreak = Math.max(state.bestStreak, state.streak);
            state.caught += 1;
            const bonus = Math.floor(state.streak / 5) * 5;
            const gained = it.points + bonus;
            state.score += gained;
            burst(it.x, it.y, `+${gained}`, true);
            if (state.streak > 0 && state.streak % 5 === 0) sfx.great(); else sfx.good();
          }
          hud.set('score', state.score);
          hud.set('streak', state.streak);
          continue;
        }

        if (it.y - it.size > GROUND) {
          state.items.splice(i, 1);
          if (!it.bad) { state.streak = 0; hud.set('streak', 0); }
        }
      }

      for (let i = state.pops.length - 1; i >= 0; i--) {
        state.pops[i].life -= dt * 1.4;
        state.pops[i].y -= 42 * dt;
        if (state.pops[i].life <= 0) state.pops.splice(i, 1);
      }
    }

    // ---------------------------------------------------------- rendering
    function drawSleigh() {
      const x = state.sleighX, y = GROUND;
      ctx.save();
      ctx.translate(x, y);

      // Runner, with the upturn at the front.
      ctx.strokeStyle = '#e0b44f';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-SLEIGH_W / 2 - 8, 3);
      ctx.lineTo(SLEIGH_W / 2 + 2, 3);
      ctx.quadraticCurveTo(SLEIGH_W / 2 + 20, 3, SLEIGH_W / 2 + 13, -15);
      ctx.stroke();

      // Struts down to the runner.
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-SLEIGH_W / 2 + 14, -6); ctx.lineTo(-SLEIGH_W / 2 + 14, 3);
      ctx.moveTo(SLEIGH_W / 2 - 20, -6);  ctx.lineTo(SLEIGH_W / 2 - 20, 3);
      ctx.stroke();

      // Body: tall back on the left, curled prow on the right.
      const grad = ctx.createLinearGradient(0, -SLEIGH_H, 0, 0);
      grad.addColorStop(0, '#ef2944');
      grad.addColorStop(1, '#7d0b1d');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-SLEIGH_W / 2 + 2, -SLEIGH_H);
      ctx.quadraticCurveTo(-SLEIGH_W / 2 - 7, -SLEIGH_H * 0.4, -SLEIGH_W / 2 + 12, -6);
      ctx.lineTo(SLEIGH_W / 2 - 16, -6);
      ctx.quadraticCurveTo(SLEIGH_W / 2 + 6, -8, SLEIGH_W / 2 + 1, -SLEIGH_H * 0.66);
      ctx.quadraticCurveTo(SLEIGH_W / 2 - 4, -SLEIGH_H * 0.42, SLEIGH_W / 2 - 18, -SLEIGH_H * 0.52);
      ctx.lineTo(-SLEIGH_W / 2 + 10, -SLEIGH_H * 0.52);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#f0c871';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Gold scroll along the flank.
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-SLEIGH_W / 2 + 16, -SLEIGH_H * 0.26);
      ctx.quadraticCurveTo(0, -SLEIGH_H * 0.42, SLEIGH_W / 2 - 22, -SLEIGH_H * 0.26);
      ctx.stroke();

      ctx.restore();
    }

    function render() {
      ctx.clearRect(0, 0, W, H);

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0b1430');
      sky.addColorStop(0.62, '#20325c');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, GROUND + 10);

      // distant hills
      ctx.fillStyle = '#16284c';
      ctx.beginPath();
      ctx.moveTo(0, GROUND - 40);
      ctx.quadraticCurveTo(W * 0.22, GROUND - 130, W * 0.46, GROUND - 48);
      ctx.quadraticCurveTo(W * 0.72, GROUND - 150, W, GROUND - 56);
      ctx.lineTo(W, GROUND + 12);
      ctx.lineTo(0, GROUND + 12);
      ctx.fill();

      // snow field
      const snow = ctx.createLinearGradient(0, GROUND - 10, 0, H);
      snow.addColorStop(0, '#f7fbff');
      snow.addColorStop(1, '#cfe0f5');
      ctx.fillStyle = snow;
      ctx.beginPath();
      ctx.moveTo(0, GROUND + 6);
      ctx.quadraticCurveTo(W / 2, GROUND - 14, W, GROUND + 6);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.fill();

      drawSleigh();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const it of state.items) {
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(it.rot);
        ctx.font = `${it.size}px serif`;
        ctx.fillText(it.emoji, 0, 0);
        ctx.restore();
      }

      for (const p of state.pops) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.good ? '#ffdf9a' : '#ff8d9b';
        ctx.font = 'bold 26px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(p.text, p.x, p.y);
        ctx.globalAlpha = 1;
      }
    }

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      render();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    clock = countdown(ROUND, (left) => hud.set('time', left), () => finish());

    function finish() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      clock.stop();
      const record = host.submit(state.score);
      if (record) sfx.win(); else sfx.lose();

      wrap.append(resultScreen({
        score: `${state.score}`,
        line: `${state.caught} presents rescued · best streak ${state.bestStreak}`,
        record,
        onReplay: () => host.restart(),
      }));
      hint.remove();
    }

    return () => {
      cancelAnimationFrame(raf);
      clock?.stop();
      canvas.removeEventListener('pointermove', onPointer);
      canvas.removeEventListener('pointerdown', onPointer);
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
    };
  },
};
