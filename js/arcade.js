/**
 * The arcade: launcher cards, the modal stage, and the host object each game
 * gets handed (best score, score submission, restart, close).
 */

import { el, toast, watchReveals } from './ui.js';
import { GAMES, byId } from './games/registry.js';
import { getBest, setBest } from './storage.js';

let teardown = null;
let lastFocus = null;

const stage = {
  root: null,
  title: null,
  body: null,
};

export function initArcade() {
  const grid = document.getElementById('arcade');
  stage.root = document.getElementById('stage');
  stage.title = document.getElementById('stage-title');
  stage.body = document.getElementById('stage-body');

  if (!grid || !stage.root) return;

  grid.replaceChildren(...GAMES.map(renderCard));
  // The cards are injected after the page-wide pass, so reveal them here.
  watchReveals(grid);

  document.getElementById('stage-close')?.addEventListener('click', close);
  stage.root.addEventListener('click', (e) => { if (e.target === stage.root) close(); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stage.root.classList.contains('is-open')) close();
  });

  // Deep links: /#play=whack-an-elf opens straight into a game.
  const match = /[#&]play=([\w-]+)/.exec(location.hash);
  if (match && byId(match[1])) open(match[1]);
}

function renderCard(game) {
  const best = getBest(game.id);
  const bestNode = el('span', {
    class: 'game-card__best',
    text: best > 0 ? `Best · ${best}` : 'Not played yet',
  });

  const card = el('button', {
    class: 'game-card reveal', type: 'button',
    onclick: () => open(game.id),
  },
    el('span', { class: 'game-card__emoji', 'aria-hidden': 'true', text: game.emoji }),
    el('h3', { class: 'game-card__name', text: game.name }),
    el('p', { class: 'game-card__blurb', text: game.blurb }),
    el('span', { class: 'game-card__foot' },
      bestNode,
      el('span', { class: 'game-card__play', text: 'Play →' }),
    ),
  );

  card.dataset.gameId = game.id;
  return card;
}

/** Refresh the "Best · n" line on a card after a round. */
function refreshCardBest(id) {
  const card = document.querySelector(`.game-card[data-game-id="${id}"] .game-card__best`);
  if (!card) return;
  const best = getBest(id);
  card.textContent = best > 0 ? `Best · ${best}` : 'Not played yet';
}

export function open(id) {
  const game = byId(id);
  if (!game) return;

  if (teardown) { teardown(); teardown = null; }

  lastFocus = document.activeElement;
  stage.title.textContent = game.name;
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
      refreshCardBest(game.id);
      if (record) toast(`❄ New best in ${game.name}: ${Math.round(score)}`);
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
