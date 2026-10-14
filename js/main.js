/** Entry point: boots the scenery, the splash gate, the music dock and the arcade. */

import { CONFIG } from './config.js';
import { music } from './audio.js';
import { startSnow } from './snow.js';
import { startCursorMagic } from './cursor.js';
import { initArcade } from './arcade.js';
import { startCountdown } from './countdown.js';
import { watchReveals, toast, clamp } from './ui.js';

const SOURCE_LABELS = {
  local: 'Playing your own copy',
  youtube: 'Streaming the official upload',
  procedural: 'Stream blocked — playing the house band instead',
};

function bootScenery() {
  const canvas = document.getElementById('snow-canvas');
  const snow = canvas ? startSnow(canvas) : null;
  startCursorMagic();
  watchReveals();

  // When the countdown flips over, let it snow properly.
  addEventListener('christmas', () => snow?.setDensityScale(2.1), { once: true });
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
    toggle.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    // The record on the sleeve turns only while something is actually playing.
    document.body.classList.toggle('is-spinning', playing);
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
    button.textContent = 'Spinning up…';

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
  const node = document.getElementById('year-line');
  if (node) node.textContent = `Pressed ${new Date().getFullYear()}.`;
}

function boot() {
  bootScenery();
  bootDock();
  bootSplash();
  bootArcadeSafely();
  bootYear();
  startCountdown(document.getElementById('countdown'));
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
