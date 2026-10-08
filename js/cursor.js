/**
 * The reindeer cursor itself is pure CSS (see styles/base.css) so it never lags
 * behind the pointer. This adds the trail of magic dust behind it, plus the
 * swap to the happy-reindeer art while a button is held down.
 */

const MAX_SPARKLES = 26;
const SPAWN_DISTANCE = 26;   // px of travel between sparkles

export function startCursorMagic() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  if (matchMedia('(hover: none)').matches) return () => {};

  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, {
    position: 'fixed', inset: '0', zIndex: '70', pointerEvents: 'none',
    overflow: 'hidden',
  });
  document.body.appendChild(layer);

  const glyphs = ['❄', '✦', '·', '✵'];
  let lastX = 0, lastY = 0, travelled = 0, live = 0;

  function onMove(e) {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    travelled += Math.hypot(dx, dy);
    lastX = e.clientX;
    lastY = e.clientY;

    if (travelled < SPAWN_DISTANCE || live >= MAX_SPARKLES) return;
    travelled = 0;
    spawn(e.clientX, e.clientY);
  }

  function spawn(x, y) {
    const s = document.createElement('span');
    s.textContent = glyphs[(Math.random() * glyphs.length) | 0];
    const size = 7 + Math.random() * 9;
    const drift = (Math.random() - 0.5) * 34;
    Object.assign(s.style, {
      position: 'absolute',
      left: `${x - 16}px`,
      top: `${y + 16}px`,
      fontSize: `${size}px`,
      color: Math.random() > 0.45 ? '#ffe9b0' : '#ffffff',
      textShadow: '0 0 8px rgba(255,220,150,.85)',
      opacity: '0',
      willChange: 'transform, opacity',
    });
    layer.appendChild(s);
    live++;

    const anim = s.animate(
      [
        { opacity: 0.95, transform: 'translate(0,0) scale(1) rotate(0deg)' },
        { opacity: 0, transform: `translate(${drift}px, 34px) scale(.35) rotate(${drift * 6}deg)` },
      ],
      { duration: 850 + Math.random() * 450, easing: 'cubic-bezier(.3,.8,.4,1)' },
    );
    anim.onfinish = anim.oncancel = () => { s.remove(); live--; };
  }

  function down() { document.body.classList.add('cursor-active'); }
  function up() { document.body.classList.remove('cursor-active'); }

  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', down, { passive: true });
  addEventListener('pointerup', up, { passive: true });
  addEventListener('pointercancel', up, { passive: true });

  return () => {
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerdown', down);
    removeEventListener('pointerup', up);
    removeEventListener('pointercancel', up);
    layer.remove();
  };
}
