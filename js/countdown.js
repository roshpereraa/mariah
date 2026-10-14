/**
 * The countdown to Christmas Day, and the moment it arrives.
 *
 * Counts down in the viewer's own local time to 25 December, 00:00. The whole
 * of the 25th counts as arrived, so the band reads "It's tiiiime." all day
 * rather than for one second at midnight. On the 26th it rebuilds itself and
 * starts counting to next year.
 */

import { el } from './ui.js';
import { sfx } from './sfx.js';

const UNITS = [
  { key: 'days', label: 'days', pad: 0 },
  { key: 'hours', label: 'hours', pad: 2 },
  { key: 'minutes', label: 'minutes', pad: 2 },
  { key: 'seconds', label: 'seconds', pad: 2 },
];

/** Midnight at the start of the next 25 December, local time. */
function nextChristmas(now) {
  const year = now.getMonth() === 11 && now.getDate() > 25
    ? now.getFullYear() + 1
    : now.getFullYear();
  return new Date(year, 11, 25, 0, 0, 0, 0);
}

/** True for the whole of 25 December, local time. */
const isChristmasDay = (now) => now.getMonth() === 11 && now.getDate() === 25;

function split(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor(total / 3600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
  };
}

export function startCountdown(root) {
  if (!root) return () => {};

  const band = el('div', { class: 'counter', role: 'timer' });
  const live = el('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  root.replaceChildren(band, live);

  const sideCaption = document.getElementById('days-line');
  let cells = null;          // digit nodes, while counting
  let caption = null;
  let mode = null;           // 'counting' | 'arrived'
  let announcedDay = null;
  let timer = null;

  // ---------------------------------------------------------------- chrome

  function buildCounting(target) {
    cells = {};
    caption = el('p', { class: 'counter__caption' });

    band.classList.remove('counter--now');
    document.body.classList.remove('is-christmas');
    band.replaceChildren(
      el('p', { class: 'counter__head' },
        'Counting down to ',
        el('b', {
          text: target.toLocaleDateString(undefined, {
            day: 'numeric', month: 'long', year: 'numeric',
          }),
        }),
      ),
      el('div', { class: 'counter__cells' },
        UNITS.map(({ key, label }) => {
          const value = el('b', { class: 'counter__value', text: '––' });
          cells[key] = value;
          return el('div', { class: 'counter__cell' }, value, el('em', { text: label }));
        }),
      ),
      caption,
    );
    mode = 'counting';
    announcedDay = null;
  }

  function buildArrived() {
    cells = null;
    caption = null;
    band.classList.add('counter--now');
    document.body.classList.add('is-christmas');
    band.replaceChildren(
      el('p', { class: 'counter__now' }, 'It’s tiiiime.'),
      el('p', { class: 'counter__nowsub', text: 'Merry Christmas.' }),
    );
    live.textContent = 'It is Christmas Day.';
    if (sideCaption) sideCaption.textContent = 'Five tracks · it is Christmas Day';
    mode = 'arrived';
    // Lets the scenery mark the occasion without this module knowing about snow.
    dispatchEvent(new CustomEvent('christmas'));
  }

  /** The toast, for the moment it actually flips over while someone is here. */
  function announce() {
    const toastEl = document.getElementById('toast');
    if (!toastEl) return;
    toastEl.textContent = 'It’s tiiiime.';
    toastEl.classList.add('is-up');
    setTimeout(() => toastEl.classList.remove('is-up'), 6000);
  }

  // ----------------------------------------------------------------- tick

  function render() {
    const now = new Date();
    const christmas = isChristmasDay(now);

    if (christmas && mode !== 'arrived') {
      const live_transition = mode === 'counting';   // not the first paint
      buildArrived();
      if (live_transition) { announce(); sfx.win(); }
      return;
    }

    if (christmas) return;                 // already celebrating, nothing to tick

    // Boxing Day: rebuild against next year rather than reloading the page.
    if (mode !== 'counting') buildCounting(nextChristmas(now));

    const target = nextChristmas(now);
    const t = split(target - now);

    cells.days.textContent = String(t.days);
    cells.hours.textContent = String(t.hours).padStart(2, '0');
    cells.minutes.textContent = String(t.minutes).padStart(2, '0');
    cells.seconds.textContent = String(t.seconds).padStart(2, '0');

    caption.textContent = t.days === 0
      ? 'Not long now.'
      : `${t.days} sleep${t.days === 1 ? '' : 's'} to go.`;

    if (sideCaption) {
      // days === 0 can only mean it is still the 24th, so: tomorrow.
      sideCaption.textContent = t.days === 0
        ? 'Five tracks · Christmas is tomorrow'
        : `Five tracks · ${t.days} day${t.days === 1 ? '' : 's'} to Christmas`;
    }

    // Screen readers get a day count once a day, not a ticking clock.
    if (announcedDay !== t.days) {
      announcedDay = t.days;
      live.textContent = `${t.days} days until Christmas.`;
    }
  }

  render();
  timer = setInterval(render, 1000);
  // Backgrounded tabs throttle the interval, so resync on return.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

  return () => { clearInterval(timer); timer = null; };
}
