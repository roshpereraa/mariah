/**
 * Hit The Note — hold the pad and ride the pitch into the golden band.
 * A tribute to the whistle register, measured in milliseconds of accuracy.
 *
 * Holding raises the pitch, releasing lets it fall. The target band keeps
 * moving. Time spent inside the band scores; the round ends at 30 seconds.
 */

import { el, clamp } from '../ui.js';
import { sfx } from '../sfx.js';
import { makeHud, countdown, resultScreen } from './common.js';

const ROUND = 30;
const RISE = 0.78;          // pitch units gained per second while held
const FALL = 0.62;          // lost per second while released
const BAND = 0.13;          // half-height of the target band, in pitch units
const MOVE_EVERY = 3200;    // ms between target jumps

export default {
  id: 'whistle-note',
  name: 'The Whistle Note',
  emoji: '\u{1F3A4}',
  blurb: 'Hold to climb, let go to fall, keep the needle in the gold. The gold keeps moving.',
  scoreLabel: 'points',

  mount(root, host) {
    let pitch = 0.15;            // 0 = bottom of the meter, 1 = top
    let target = 0.6;
    let holding = false;
    let inBandMs = 0;
    let longest = 0, currentRun = 0;
    let score = 0;
    let finished = false;
    let raf = null, mover = null;

    const hud = makeHud([
      { key: 'score', label: 'score', value: 0 },
      { key: 'time', label: 'seconds left', value: ROUND },
      { key: 'hold', label: 'longest hold', value: '0.0s' },
      { key: 'best', label: 'best', value: host.best },
    ]);

    const band = el('div', { class: 'whistle__target' });
    const needle = el('div', { class: 'whistle__needle' });
    const meter = el('div', { class: 'whistle__meter', 'aria-hidden': 'true' }, band, needle);
    const fill = el('div', { class: 'whistle__fill' });
    const pad = el('div', {
      class: 'whistle__pad', role: 'button', tabindex: '0',
      'aria-label': 'Hold to raise the note',
    }, el('strong', { text: 'Hold to sing' }), el('span', { text: 'mouse, touch or the space bar' }));

    const hint = el('p', { class: 'game-hint', text: 'Dead centre pays more than the edges.' });
    const wrap = el('div', { class: 'whistle' }, hud.node, meter, el('div', { class: 'whistle__bar' }, fill), pad, hint);
    root.replaceChildren(wrap);

    // ---------------------------------------------------------------- input
    const press = (e) => {
      if (finished) return;
      e?.preventDefault?.();
      holding = true;
      pad.classList.add('is-active');
    };
    const release = () => {
      holding = false;
      pad.classList.remove('is-active');
    };
    const onKeyDown = (e) => {
      if (e.code === 'Space' || e.key === ' ') press(e);
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space' || e.key === ' ') release();
    };

    pad.addEventListener('pointerdown', press);
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);
    pad.addEventListener('keydown', onKeyDown);
    addEventListener('keyup', onKeyUp);

    // ------------------------------------------------------------- movement
    function moveTarget() {
      // Always jump somewhere meaningfully different from where we are.
      let next = target;
      while (Math.abs(next - target) < 0.22) next = 0.18 + Math.random() * 0.68;
      target = next;
      band.style.top = `${(1 - target) * 100}%`;
      band.style.transform = 'translateY(-50%)';
      sfx.bell();
    }
    moveTarget();
    mover = setInterval(moveTarget, MOVE_EVERY);

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      pitch = clamp(pitch + (holding ? RISE : -FALL) * dt, 0, 1);
      needle.style.top = `${(1 - pitch) * 100}%`;

      const inBand = Math.abs(pitch - target) <= BAND;
      if (inBand) {
        inBandMs += dt * 1000;
        currentRun += dt;
        longest = Math.max(longest, currentRun);
        // Dead-centre accuracy pays more.
        const accuracy = 1 - Math.abs(pitch - target) / BAND;
        score += Math.round((38 + accuracy * 52) * dt);
        needle.style.background = '#ffdf9a';
        needle.style.boxShadow = '0 0 22px 6px rgba(255,223,154,.85)';
      } else {
        currentRun = 0;
        needle.style.background = '#f7fbff';
        needle.style.boxShadow = '0 0 18px 4px rgba(247,251,255,.6)';
      }

      hud.set('score', score);
      hud.set('hold', `${longest.toFixed(1)}s`);
      fill.style.width = `${Math.min(100, (inBandMs / (ROUND * 1000)) * 100)}%`;

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    const clock = countdown(ROUND, (left) => hud.set('time', left), () => finish());

    function finish() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      clearInterval(mover);
      clock.stop();
      release();

      const record = host.submit(score);
      if (record) sfx.win(); else sfx.lose();
      wrap.append(resultScreen({
        score: `${score}`,
        line: `${(inBandMs / 1000).toFixed(1)}s on pitch · longest hold ${longest.toFixed(1)}s`,
        record,
        onReplay: () => host.restart(),
      }));
      hint.remove();
    }

    return () => {
      finished = true;
      cancelAnimationFrame(raf);
      clearInterval(mover);
      clock.stop();
      removeEventListener('pointerup', release);
      removeEventListener('pointercancel', release);
      removeEventListener('keyup', onKeyUp);
    };
  },
};
