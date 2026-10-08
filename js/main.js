/** Entry point: boots the scenery, the splash gate, the music dock and the arcade. */

import { CONFIG } from './config.js';
import { music } from './audio.js';
import { startSnow } from './snow.js';
import { startCursorMagic } from './cursor.js';
import { initArcade } from './arcade.js';
import { watchReveals, toast, clamp } from './ui.js';

const SOURCE_LABELS = {
  local: 'Playing your local copy of the record.',
  youtube: 'Streaming the official upload through YouTube.',
  procedural: 'Streaming was unavailable, so here is a live sleigh-bell mix instead.',
};

function bootScenery() {
  const canvas = document.getElementById('snow-canvas');
  if (canvas) startSnow(canvas);
  startCursorMagic();
  watchReveals();
}

function bootDock() {
  const dock = document.getElementById('dock');
  const toggle = document.getElementById('dock-toggle');
  const icon = document.getElementById('dock-icon');
  const title = document.getElementById('dock-title');
  const sub = document.getElementById('dock-sub');
  const slider = document.getElementById('dock-volume');

  const PLAY = 'M8 5v14l11-7z';
  const PAUSE = 'M6 5h4v14H6zm8 0h4v14h-4z';

  music.addEventListener('sourcechange', (e) => {
    title.textContent = e.detail.title;
    sub.textContent = e.detail.sub;
    dock.classList.add('is-ready');
    toast(SOURCE_LABELS[e.detail.source] ?? '', 4200);
  });

  music.addEventListener('statechange', (e) => {
    const playing = e.detail.playing;
    icon.setAttribute('d', playing ? PAUSE : PLAY);
    dock.classList.toggle('is-paused', !playing);
    toggle.setAttribute('aria-label', playing ? 'Pause the music' : 'Play the music');
  });

  toggle.addEventListener('click', () => music.toggle());

  slider.value = String(Math.round(CONFIG.defaultVolume * 100));
  slider.addEventListener('input', () => {
    music.setVolume(clamp(Number(slider.value) / 100, 0, 1));
  });

  // Space toggles playback, unless the user is typing or inside a game.
  addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (document.getElementById('stage')?.classList.contains('is-open')) return;
    e.preventDefault();
    music.toggle();
  });
}

function bootSplash() {
  const splash = document.getElementById('splash');
  const button = document.getElementById('splash-btn');
  if (!splash || !button) return;

  let entering = false;

  function enter() {
    if (entering) return;
    entering = true;
    button.disabled = true;

    // The click is the gesture browsers require before audio may play. Kick the
    // source chain off, but don't hold the page behind it — walking the chain
    // can take a few seconds, and the dock announces whatever wins.
    music.start().catch((err) => console.error('Music failed to start', err));

    splash.classList.add('is-hidden');
    setTimeout(() => splash.remove(), 900);
  }

  button.addEventListener('click', enter);
}

function bootYear() {
  const node = document.getElementById('year');
  if (node) node.textContent = String(new Date().getFullYear());
}

/** Countdown to the next 25 December, because of course. */
function bootCountdown() {
  const node = document.getElementById('days-to-go');
  if (!node) return;

  const now = new Date();
  const year = now.getMonth() === 11 && now.getDate() > 25
    ? now.getFullYear() + 1
    : now.getFullYear();
  const xmas = new Date(year, 11, 25);
  const days = Math.ceil((xmas - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);

  node.textContent = days === 0 ? 'Today' : String(days);
  const label = document.getElementById('days-to-go-label');
  if (label && days === 0) label.textContent = 'Merry Christmas';
}

function boot() {
  bootScenery();
  bootDock();
  bootSplash();
  bootArcadeSafely();
  bootYear();
  bootCountdown();
}

/** A broken game must never take the rest of the page down with it. */
function bootArcadeSafely() {
  try { initArcade(); }
  catch (err) {
    console.error('Arcade failed to start', err);
    toast('The arcade could not start. Everything else still works.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
