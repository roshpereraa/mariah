/**
 * TEMPORARY verification endpoint.
 *
 * The dev container cannot reach youtube.com, so this runs the oEmbed lookup
 * from Vercel's network instead. Call it with ?ids=a,b,c to find out which
 * candidate video IDs exist, who uploaded them, and what they are called.
 *
 * Delete once the track list in js/config.js is confirmed.
 */
module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const ids = (url.searchParams.get('ids') || '')
    .split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12);

  const results = [];
  for (const id of ids) {
    const target = 'https://www.youtube.com/oembed?url='
      + encodeURIComponent(`https://www.youtube.com/watch?v=${id}`) + '&format=json';
    try {
      const r = await fetch(target, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) { results.push({ id, ok: false, status: r.status }); continue; }
      const data = await r.json();
      results.push({ id, ok: true, title: data.title, author: data.author_name });
    } catch (err) {
      results.push({ id, ok: false, error: String(err && err.message || err) });
    }
  }

  res.setHeader('content-type', 'application/json');
  res.status(200).send(JSON.stringify({ results }, null, 2));
};
