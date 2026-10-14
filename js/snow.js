/** Canvas snowfall with parallax drift and a gentle wind that wanders. */

export function startSnow(canvas) {
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let flakes = [];
  let w = 0, h = 0, dpr = 1;
  let wind = 0, windTarget = 0;
  let raf = null;
  let densityScale = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const base = reduced ? 50 : Math.min(320, (w * h) / 4200);
    const target = Math.round(base * densityScale);
    flakes = Array.from({ length: target }, makeFlake);
  }

  function makeFlake() {
    const depth = Math.random();            // 0 = far, 1 = near
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1 + depth * 2.8,
      speed: 0.25 + depth * 1.25,
      sway: 0.4 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.42 + depth * 0.55,
      depth,
    };
  }

  let last = performance.now();

  function frame(now) {
    const dt = Math.min(48, now - last) / 16.667;
    last = now;

    if (Math.random() < 0.004) windTarget = (Math.random() - 0.5) * 1.5;
    wind += (windTarget - wind) * 0.015;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f2e7d2';

    for (const f of flakes) {
      f.phase += 0.02 * f.sway * dt;
      f.y += f.speed * dt;
      f.x += (Math.sin(f.phase) * f.sway * 0.5 + wind * (0.4 + f.depth)) * dt;

      if (f.y - f.r > h) { f.y = -f.r; f.x = Math.random() * w; }
      if (f.x < -12) f.x = w + 10;
      if (f.x > w + 12) f.x = -10;

      ctx.globalAlpha = f.alpha;
      // Only the nearest flakes get the (expensive) halo.
      ctx.shadowBlur = f.depth > 0.62 ? 7 : 0;
      ctx.shadowColor = 'rgba(242,231,210,.85)';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    raf = requestAnimationFrame(frame);
  }

  resize();
  addEventListener('resize', resize, { passive: true });
  raf = requestAnimationFrame(frame);

  return {
    stop() { cancelAnimationFrame(raf); removeEventListener('resize', resize); },
    /** Christmas Day gets a heavier fall. */
    setDensityScale(n) { densityScale = n; resize(); },
  };
}
