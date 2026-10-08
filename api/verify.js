/**
 * TEMPORARY verification endpoint.
 *
 * The dev container cannot reach youtube.com, so this runs the oEmbed lookup
 * from Vercel's network instead. Call it with ?ids=a,b,c to find out which
 * candidate video IDs exist, who uploaded them, and what they are called.
 *
 * Delete once the track list in js/config.js is confirmed.
 */
export default async function handler(req) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const ids = (url.searchParams.get('ids') || '').split(',').map((s) => s.trim()).filter(Boolean);

  const results = await Promise.all(ids.map(async (id) => {
    const target = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${id}`)}&format=json`;
    try {
      const res = await fetch(target);
      if (!res.ok) return { id, ok: false, status: res.status };
      const data = await res.json();
      return { id, ok: true, title: data.title, author: data.author_name };
    } catch (err) {
      return { id, ok: false, error: String(err) };
    }
  }));

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { 'content-type': 'application/json' },
  });
}
