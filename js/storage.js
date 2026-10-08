/** High scores in localStorage, tolerant of private-mode and blocked storage. */

import { CONFIG } from './config.js';

const key = (id) => `${CONFIG.storagePrefix}best:${id}`;

export function getBest(id) {
  try {
    const raw = localStorage.getItem(key(id));
    const n = raw === null ? 0 : Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

/** @returns {boolean} true when this score beat the stored best. */
export function setBest(id, score) {
  const prev = getBest(id);
  if (!(score > prev)) return false;
  try { localStorage.setItem(key(id), String(score)); } catch { /* read-only is fine */ }
  return true;
}
