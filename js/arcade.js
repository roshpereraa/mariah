/**
 * Side B: the track listing, the modal stage, and the host object each game
 * gets handed (best score, score submission, restart, close).
 */

import { el, toast, watchReveals } from './ui.js';
import { GAMES, byId } from './games/registry.js';
import { getBest, setBest } from './storage.js';

let teardown = null;
let lastFocus = null;

const stage = { root: null, title: null, no: null, body: null };

/** B1, B2, … — the side-B track numbers. */
const trackNo = (game) => `B${GAMES.indexOf(game) + 1}`;

export function initArcade() {
  const list = document.getElementById('arcade');
  stage.root = document.getElementById('stage');
  stage.title = document.getElementById('stage-title');
  stage.no = document.getElementById('stage-no');
  stage.body = document.getElementById('stage-body');

  if (!list || !stage.root) return;

  list.replaceChildren(...GAMES.map(renderTrack));
  // These rows are injected after the page-wide pass, so reveal them here.
  watchReveals(list);

  document.getElementById('stage-close')?.addEventListener('click', close);
  stage.root.addEventListener('click', (e) => { if (e.target === stage.root) close(); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stage.root.classList.contains('is-open')) close();
  });

  // Deep links: /#play=whack-an-elf opens straight into a game.
  const match = /[#&]play=([\w-]+)/.exec(location.hash);
  if (match && byId(match[1])) open(match[1]);
}

function renderTrack(game) {
  const row = el('button', {
    class: 'track reveal', type: 'button',
    onclick: () => open(game.id),
  },
    el('span', { class: 'track__no', text: trackNo(game) }),
    el('span', {},
      el('span', { class: 'track__title', style: { display: 'block' }, text: game.name }),
      el('span', { class: 'track__desc', style: { display: 'block' }, text: game.blurb }),
    ),
    el('span', { class: 'track__meta' }, bestLabel(game.id)),
  );

  row.dataset.gameId = game.id;
  return row;
}

/** The right-hand column: a best score, set like a track duration. */
function bestLabel(id) {
  const best = getBest(id);
  return best > 0
    ? el('span', {}, el('b', { text: String(best) }), 'your best')
    : el('span', { text: 'unplayed' });
}

function refreshTrackBest(id) {
  const cell = document.querySelector(`.track[data-game-id="${id}"] .track__meta`);
  if (cell) cell.replaceChildren(bestLabel(id));
}

export function open(id) {
  const game = byId(id);
  if (!game) return;

  if (teardown) { teardown(); teardown = null; }

  lastFocus = document.activeElement;
  stage.title.textContent = game.name;
  stage.no.textContent = trackNo(game);
  stage.body.replaceChildren();
  stage.root.classList.add('is-open');
  stage.root.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  teardown = game.mount(stage.body, makeHost(game)) || null;
  document.getElementById('stage-close')?.focus();
}

function makeHost(game) {
  return {
    id: game.id,
    get best() { return getBest(game.id); },

    submit(score) {
      const record = setBest(game.id, Math.round(score));
      refreshTrackBest(game.id);
      if (record) toast(`New best on ${game.name}: ${Math.round(score)}`);
      return record;
    },

    restart() { open(game.id); },
    close,
  };
}

export function close() {
  if (teardown) { teardown(); teardown = null; }
  stage.root.classList.remove('is-open');
  stage.root.setAttribute('aria-hidden', 'true');
  stage.body.replaceChildren();
  document.body.style.overflow = '';
  if (lastFocus instanceof HTMLElement) lastFocus.focus();
}
