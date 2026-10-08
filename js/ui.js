/** Tiny shared UI helpers: element builder, toast, scroll reveals. */

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

let toastTimer = null;

export function toast(message, ms = 2600) {
  const node = document.getElementById('toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('is-up');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('is-up'), ms);
}

export function watchReveals(root = document) {
  const targets = root.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  targets.forEach((t) => io.observe(t));
}

/** Clamp a value into [min, max]. */
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const randInt = (n) => (Math.random() * n) | 0;

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
