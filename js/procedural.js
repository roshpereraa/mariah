/**
 * An original, royalty-free Christmas arrangement generated live in the browser.
 *
 * Sleigh bells, celesta chords, a walking bass and a glockenspiel melody over a
 * doo-wop progression — the 1960s Phil-Spector-Christmas-record furniture that
 * "All I Want for Christmas Is You" is itself a loving pastiche of. The melody
 * here is written for this site, not lifted from the song.
 */

const BPM = 124;
const BEAT = 60 / BPM;
const BEATS_PER_BAR = 4;
const LOOKAHEAD = 0.5;    // seconds of audio scheduled in advance
const TICK = 25;          // scheduler wake-up interval (ms)

/**
 * The scheduler clock lives in a worker. Browsers throttle main-thread timers
 * to about once a second in a background tab, which would leave the audio
 * graph starved and the music stuttering or silent on a tab people have
 * switched away from. Worker timers keep ticking.
 */
const CLOCK_SRC = `
  let id = null;
  onmessage = (e) => {
    if (e.data.start) {
      clearInterval(id);
      id = setInterval(() => postMessage('tick'), e.data.interval);
    } else {
      clearInterval(id);
      id = null;
    }
  };
`;

const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** I–vi–IV–V, eight bars, with a turnaround. */
const CHORDS = [
  { triad: [60, 64, 67], bass: 36 }, // C
  { triad: [57, 60, 64], bass: 33 }, // Am
  { triad: [53, 57, 60], bass: 41 }, // F
  { triad: [55, 59, 62], bass: 43 }, // G
  { triad: [60, 64, 67], bass: 36 }, // C
  { triad: [57, 60, 64], bass: 33 }, // Am
  { triad: [53, 57, 60], bass: 41 }, // F
  { triad: [55, 59, 62], bass: 43 }, // G
];

/** Melody per bar: [midi, beatOffset, durationInBeats]. */
const MELODY = [
  [[64, 0, 1], [67, 1, 1], [72, 2, 1.75]],
  [[69, 0, 1], [67, 1, 1], [64, 2, 1.75]],
  [[65, 0, 1], [69, 1, 1], [72, 2, 1], [69, 3, 1]],
  [[67, 0, 1.5], [62, 1.5, 0.5], [59, 2, 1.75]],
  [[72, 0, 1], [71, 1, 1], [67, 2, 1], [64, 3, 1]],
  [[69, 0, 1.75], [72, 2, 1.75]],
  [[69, 0, 1], [67, 1, 1], [65, 2, 1], [64, 3, 1]],
  [[62, 0, 1], [67, 1, 1], [72, 2, 1.75]],
];

export class ProceduralSong {
  /** @param {AudioContext} ctx @param {AudioNode} destination */
  constructor(ctx, destination) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.9;

    // A cheap generated reverb keeps the bells from sounding bone dry.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(1.9, 2.6);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.3;
    this.reverb.connect(this.wet).connect(destination);
    this.out.connect(destination);
    this.out.connect(this.reverb);

    this.noise = this._noiseBuffer(1);
    this.beat = 0;
    this.nextNoteTime = 0;
    this.clock = null;      // Worker driving the scheduler, or a timer fallback
    this.clockUrl = null;
  }

  // ---------------------------------------------------------------- buffers

  _noiseBuffer(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  _impulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  // ------------------------------------------------------------ instruments

  /** Glockenspiel / music-box: bright inharmonic partials, long shimmer. */
  _bell(midi, time, dur, gain = 0.3) {
    const hz = midiToHz(midi);
    const bus = this.ctx.createGain();
    bus.gain.value = gain;
    bus.connect(this.out);

    [[1, 1], [2.78, 0.34], [5.21, 0.12]].forEach(([ratio, amp]) => {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = hz * ratio;
      const life = dur * (ratio === 1 ? 1.6 : 0.5) + 0.25;
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(amp, time + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0001, time + life);
      osc.connect(env).connect(bus);
      osc.start(time);
      osc.stop(time + life + 0.05);
    });
  }

  /** Celesta-ish pad for the chord beds. */
  _chordVoice(midi, time, dur, gain = 0.085) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.value = midiToHz(midi);
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.06);
    env.gain.setTargetAtTime(0.0001, time + dur * 0.55, 0.3);
    osc.connect(lp).connect(env).connect(this.out);
    osc.start(time);
    osc.stop(time + dur + 0.6);
  }

  _bass(midi, time, dur, gain = 0.3) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.value = midiToHz(midi);
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.95);
    osc.connect(lp).connect(env).connect(this.out);
    osc.start(time);
    osc.stop(time + dur + 0.1);
  }

  /** Sleigh bells: a short burst of band-passed noise. */
  _sleigh(time, gain = 0.1) {
    const src = this.ctx.createBufferSource();
    const bp = this.ctx.createBiquadFilter();
    const hp = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();
    src.buffer = this.noise;
    src.playbackRate.value = 1 + Math.random() * 0.3;
    bp.type = 'bandpass';
    bp.frequency.value = 5200 + Math.random() * 1800;
    bp.Q.value = 2.4;
    hp.type = 'highpass';
    hp.frequency.value = 3000;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
    src.connect(bp).connect(hp).connect(env).connect(this.out);
    src.start(time, Math.random() * 0.4);
    src.stop(time + 0.2);
  }

  // -------------------------------------------------------------- scheduler

  /** Lay down everything that falls on one eighth-note tick. */
  _schedule(beat, time) {
    const eighth = Math.round(beat * 2) % 2;         // 0 = on-beat, 1 = off-beat
    const beatInBar = Math.floor(beat) % BEATS_PER_BAR;
    const bar = Math.floor(beat / BEATS_PER_BAR) % CHORDS.length;
    const chord = CHORDS[bar];

    // Sleigh bells ride every eighth, accented on the beat.
    this._sleigh(time, eighth === 0 ? 0.115 : 0.062);

    if (eighth !== 0) return;

    // Bass on 1 and 3, with a lift into the next bar on 4.
    if (beatInBar === 0) this._bass(chord.bass, time, BEAT * 1.6, 0.32);
    else if (beatInBar === 2) this._bass(chord.bass + 7, time, BEAT * 1.2, 0.24);
    else if (beatInBar === 3) this._bass(chord.bass + 12, time, BEAT * 0.7, 0.17);

    // Chord bed on 1 and 3.
    if (beatInBar === 0 || beatInBar === 2) {
      chord.triad.forEach((n, i) => {
        this._chordVoice(n + 12, time + i * 0.012, BEAT * 1.9, 0.075);
      });
    }

    // Melody notes that start on this beat.
    for (const [midi, offset, dur] of MELODY[bar]) {
      if (offset === beatInBar) this._bell(midi + 12, time, BEAT * dur, 0.26);
    }

    // A soft counter-bell an octave down on bar edges.
    if (beatInBar === 0 && bar % 2 === 0) {
      this._bell(chord.triad[0], time, BEAT * 2, 0.1);
    }
  }

  _tick = () => {
    const now = this.ctx.currentTime;

    // If the clock was starved anyway (a suspended context, a sleeping laptop),
    // don't dump a backlog of notes dated in the past — they would all fire at
    // once as a blast of noise. Resume from the next whole bar instead.
    if (this.nextNoteTime < now) {
      const missed = Math.ceil((now - this.nextNoteTime) / (BEAT * 0.5));
      this.beat += missed;
      this.nextNoteTime += missed * BEAT * 0.5;
    }

    const horizon = now + LOOKAHEAD;
    while (this.nextNoteTime < horizon) {
      this._schedule(this.beat, this.nextNoteTime);
      this.beat += 0.5;                 // advance one eighth note
      this.nextNoteTime += BEAT * 0.5;
    }
  };

  start() {
    if (this.clock) return;
    this.nextNoteTime = this.ctx.currentTime + 0.08;

    try {
      this.clockUrl = URL.createObjectURL(new Blob([CLOCK_SRC], { type: 'text/javascript' }));
      this.clock = new Worker(this.clockUrl);
      this.clock.onmessage = this._tick;
      this.clock.postMessage({ start: true, interval: TICK });
    } catch {
      // Workers blocked (strict CSP, ancient browser) — a main-thread timer
      // still works, it just throttles in a background tab.
      this.clock = { fallback: setInterval(this._tick, TICK) };
    }

    this._tick();
  }

  stop() {
    if (!this.clock) return;
    if (this.clock.fallback) {
      clearInterval(this.clock.fallback);
    } else {
      this.clock.postMessage({ start: false });
      this.clock.terminate();
      URL.revokeObjectURL(this.clockUrl);
      this.clockUrl = null;
    }
    this.clock = null;
  }

  get playing() { return this.clock !== null; }
}
