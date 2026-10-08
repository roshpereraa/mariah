/**
 * Music player with a three-tier source chain (see js/config.js).
 *
 * Browsers block autoplay with sound, so nothing starts until the splash gate
 * hands us a real user gesture. After that the job is to never stop: every
 * source loops, and a watchdog restarts anything that stalls, ends or gets
 * suspended while the page was in the background.
 */

import { CONFIG } from './config.js';
import { ProceduralSong } from './procedural.js';

const YT_API = 'https://www.youtube.com/iframe_api';

export class MusicPlayer extends EventTarget {
  constructor() {
    super();
    this.source = null;         // 'local' | 'youtube' | 'procedural'
    this.volume = CONFIG.defaultVolume;
    this.isPlaying = false;     // what the *user* wants, not the momentary state
    this.ctx = null;
    this.master = null;
    this.procedural = null;
    this.audioEl = null;
    this.yt = null;
    this.youtubeId = null;
    this._started = false;
    this._watchdog = null;
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
    this._startWatchdog();
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
        if (ok) {
          // Belt and braces: `loop` is enough, but if the browser ever lets it
          // end anyway, start it over.
          el.addEventListener('ended', () => {
            el.currentTime = 0;
            el.play().catch(() => {});
          });
          this.audioEl = el;
        } else {
          el.src = '';
        }
        resolve(ok);
      };

      el.addEventListener('error', () => finish(false), { once: true });
      el.addEventListener('canplay', () => {
        el.play().then(() => finish(true)).catch(() => finish(false));
      }, { once: true });

      // No file committed in /audio by default, so this normally fails fast.
      const timer = setTimeout(() => finish(false), 2500);
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

  /** Try each official upload in turn; the first one that really plays wins. */
  async _tryYouTube() {
    if (!(await this._loadYouTubeApi())) return false;

    for (const id of CONFIG.youtubeIds) {
      if (await this._playYouTubeId(id)) {
        this.youtubeId = id;
        return true;
      }
    }
    return false;
  }

  /**
   * The YT player replaces its host element, so each attempt gets a fresh one.
   * Resolves true only once the player reports it is genuinely PLAYING.
   */
  _playYouTubeId(videoId) {
    return new Promise((resolve) => {
      const host = this._freshYouTubeHost();
      let done = false;
      let rescue = null;

      const finish = (ok) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        clearTimeout(rescue);
        if (!ok) this._destroyYouTube();
        resolve(ok);
      };

      const timer = setTimeout(() => finish(false), CONFIG.youtubeTimeout);

      try {
        this.yt = new window.YT.Player(host, {
          videoId,
          playerVars: {
            autoplay: 1, controls: 0, disablekb: 1, loop: 1,
            playlist: videoId, playsinline: 1, rel: 0,
            modestbranding: 1, origin: location.origin,
          },
          events: {
            onReady: (e) => {
              e.target.setVolume(Math.round(this.volume * 100));
              e.target.unMute();
              e.target.playVideo();

              // If the browser refused unmuted autoplay, muted always works —
              // and unmuting something already playing is allowed.
              rescue = setTimeout(() => {
                if (done) return;
                try {
                  e.target.mute();
                  e.target.playVideo();
                  setTimeout(() => { try { e.target.unMute(); } catch { /* gone */ } }, 700);
                } catch { /* player went away */ }
              }, CONFIG.youtubeMutedRescueAfter);
            },

            onStateChange: (e) => {
              const YTS = window.YT.PlayerState;
              if (e.data === YTS.PLAYING) {
                clearTimeout(rescue);
                finish(true);
              }
              // Loop by hand — the `loop` playerVar is unreliable for a single video.
              if (e.data === YTS.ENDED) {
                try { e.target.seekTo(0); e.target.playVideo(); } catch { /* gone */ }
              }
            },

            onError: () => finish(false),
          },
        });
      } catch {
        finish(false);
      }
    });
  }

  /** A clean div inside #yt-host for the player to take over. */
  _freshYouTubeHost() {
    this._destroyYouTube();
    const shell = document.getElementById('yt-host');
    const host = document.createElement('div');
    shell?.replaceChildren(host);
    return host;
  }

  _destroyYouTube() {
    if (!this.yt) return;
    try { this.yt.destroy(); } catch { /* already gone */ }
    this.yt = null;
  }

  // ------------------------------------------------- tier 3: procedural (floor)

  async _startProcedural() {
    const ctx = await this.ensureContext();
    if (!ctx) return;

    this.master = ctx.createGain();
    this.master.gain.value = this.volume * 0.8;
    this.master.connect(ctx.destination);

    this.procedural = new ProceduralSong(ctx, this.master);
    this.procedural.start();
  }

  /** A shared AudioContext so game sound effects can ride along. */
  async ensureContext() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* needs another gesture */ }
    }
    return this.ctx;
  }

  // ------------------------------------------------------------------ watchdog

  /**
   * Nothing here should ever fall silent while the user wants music. Tabs get
   * backgrounded, AudioContexts get suspended, YouTube stalls on a network
   * blip — this notices and restarts whatever died.
   */
  _startWatchdog() {
    if (this._watchdog) return;

    const check = () => {
      if (!this.isPlaying) return;

      if (this.source === 'local' && this.audioEl?.paused) {
        this.audioEl.play().catch(() => {});
      }

      if (this.source === 'youtube' && this.yt?.getPlayerState) {
        try {
          const YTS = window.YT.PlayerState;
          const state = this.yt.getPlayerState();
          if (state === YTS.PAUSED || state === YTS.ENDED || state === YTS.CUED) {
            if (state === YTS.ENDED) this.yt.seekTo(0);
            this.yt.playVideo();
          }
        } catch { /* player not ready yet */ }
      }

      if (this.source === 'procedural') {
        if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
        if (this.procedural && !this.procedural.playing) this.procedural.start();
      }
    };

    this._watchdog = setInterval(check, CONFIG.watchdogInterval);
    // Coming back to the tab is the most likely moment to find things stopped.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) check();
    });
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
    if (this.yt?.setVolume) {
      this.yt.setVolume(Math.round(this.volume * 100));
      // A rescue attempt may have left it muted.
      if (this.volume > 0 && this.yt.isMuted?.()) this.yt.unMute();
    }
    if (this.master) {
      this.master.gain.setTargetAtTime(this.volume * 0.8, this.ctx.currentTime, 0.05);
    }
    this._emit('volumechange', { volume: this.volume });
  }
}

export const music = new MusicPlayer();
