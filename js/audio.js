/**
 * Music player with a three-tier source chain (see js/config.js).
 *
 * Browsers block autoplay with sound, so nothing starts until the splash gate
 * hands us a real user gesture — after that the music plays on every visit,
 * resumes across pages and loops forever.
 */

import { CONFIG } from './config.js';
import { ProceduralSong } from './procedural.js';

const YT_API = 'https://www.youtube.com/iframe_api';

export class MusicPlayer extends EventTarget {
  constructor() {
    super();
    this.source = null;         // 'local' | 'youtube' | 'procedural'
    this.volume = CONFIG.defaultVolume;
    this.isPlaying = false;
    this.ctx = null;
    this.master = null;
    this.procedural = null;
    this.audioEl = null;
    this.yt = null;
    this._started = false;
  }

  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  get label() {
    if (this.source === 'procedural') {
      return { title: 'Sleigh Ride Sessions', sub: 'Live Web Audio mix' };
    }
    return { title: CONFIG.trackTitle, sub: CONFIG.trackArtist };
  }

  /** Called once, from a click. Walks the source chain until something plays. */
  async start() {
    if (this._started) return this.source;
    this._started = true;

    if (await this._tryLocal()) return this._settle('local');
    if (CONFIG.useYouTube && (await this._tryYouTube())) return this._settle('youtube');
    await this._startProcedural();
    return this._settle('procedural');
  }

  _settle(source) {
    this.source = source;
    this.isPlaying = true;
    this._emit('sourcechange', { source, ...this.label });
    this._emit('statechange', { playing: true });
    return source;
  }

  // ------------------------------------------------------------- tier 1: file

  _tryLocal() {
    return new Promise((resolve) => {
      const el = new Audio();
      el.src = CONFIG.localTrack;
      el.loop = true;
      el.preload = 'auto';
      el.volume = this.volume;

      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (ok) this.audioEl = el;
        else el.src = '';
        resolve(ok);
      };

      el.addEventListener('error', () => finish(false), { once: true });
      el.addEventListener('canplay', () => {
        el.play().then(() => finish(true)).catch(() => finish(false));
      }, { once: true });

      // No file committed in /audio by default, so this normally times out fast.
      const timer = setTimeout(() => finish(false), 3500);
    });
  }

  // ---------------------------------------------------------- tier 2: YouTube

  _loadYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(true);
    if (this._ytApiPromise) return this._ytApiPromise;

    this._ytApiPromise = new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), CONFIG.youtubeTimeout);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timer);
        if (typeof prev === 'function') prev();
        resolve(true);
      };
      const tag = document.createElement('script');
      tag.src = YT_API;
      tag.onerror = () => { clearTimeout(timer); resolve(false); };
      document.head.appendChild(tag);
    });
    return this._ytApiPromise;
  }

  async _tryYouTube() {
    if (!(await this._loadYouTubeApi())) return false;

    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (!ok && this.yt) {
          try { this.yt.destroy(); } catch { /* already gone */ }
          this.yt = null;
        }
        resolve(ok);
      };

      const timer = setTimeout(() => finish(false), CONFIG.youtubeTimeout);

      try {
        this.yt = new window.YT.Player('yt-host', {
          videoId: CONFIG.youtubeId,
          playerVars: {
            autoplay: 1, controls: 0, disablekb: 1, loop: 1,
            playlist: CONFIG.youtubeId, playsinline: 1, rel: 0,
            modestbranding: 1, origin: location.origin,
          },
          events: {
            onReady: (e) => {
              e.target.setVolume(Math.round(this.volume * 100));
              e.target.unMute();
              e.target.playVideo();
            },
            onStateChange: (e) => {
              const YTS = window.YT.PlayerState;
              if (e.data === YTS.PLAYING) finish(true);
              // Keep it looping even if the loop param is ignored.
              if (e.data === YTS.ENDED) e.target.playVideo();
            },
            onError: () => finish(false),
          },
        });
      } catch {
        finish(false);
      }
    });
  }

  // ------------------------------------------------- tier 3: procedural (floor)

  async _startProcedural() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    this.ctx = new Ctx();
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }

    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume * 0.8;
    this.master.connect(this.ctx.destination);

    this.procedural = new ProceduralSong(this.ctx, this.master);
    this.procedural.start();
  }

  /** A shared AudioContext so game sound effects can ride along. */
  async ensureContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        try { await this.ctx.resume(); } catch { /* ignore */ }
      }
      return this.ctx;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    this.ctx = new Ctx();
    try { await this.ctx.resume(); } catch { /* ignore */ }
    return this.ctx;
  }

  // ------------------------------------------------------------------ controls

  toggle() { return this.isPlaying ? this.pause() : this.play(); }

  play() {
    if (this.source === 'local' && this.audioEl) this.audioEl.play().catch(() => {});
    if (this.source === 'youtube' && this.yt) this.yt.playVideo();
    if (this.source === 'procedural' && this.procedural) {
      this.ctx?.resume?.();
      this.procedural.start();
    }
    this.isPlaying = true;
    this._emit('statechange', { playing: true });
  }

  pause() {
    if (this.source === 'local' && this.audioEl) this.audioEl.pause();
    if (this.source === 'youtube' && this.yt) this.yt.pauseVideo();
    if (this.source === 'procedural' && this.procedural) this.procedural.stop();
    this.isPlaying = false;
    this._emit('statechange', { playing: false });
  }

  setVolume(v) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.audioEl) this.audioEl.volume = this.volume;
    if (this.yt?.setVolume) this.yt.setVolume(Math.round(this.volume * 100));
    if (this.master) {
      this.master.gain.setTargetAtTime(this.volume * 0.8, this.ctx.currentTime, 0.05);
    }
    this._emit('volumechange', { volume: this.volume });
  }
}

export const music = new MusicPlayer();
