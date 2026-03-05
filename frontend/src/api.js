const BASE = '/api';

export async function getLinks() {
  const r = await fetch(`${BASE}/links`);
  return r.json();
}

export async function createLink(data) {
  const r = await fetch(`${BASE}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw await r.json();
  return r.json();
}

export async function updateLink(id, data) {
  const r = await fetch(`${BASE}/links/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw await r.json();
  return r.json();
}

export async function deleteLink(id) {
  const r = await fetch(`${BASE}/links/${id}`, { method: 'DELETE' });
  if (!r.ok) throw await r.json();
  return r.json();
}

export async function getStats() {
  const r = await fetch(`${BASE}/stats`);
  return r.json();
}

export async function getClickTrend(days = 30) {
  const r = await fetch(`${BASE}/stats/clicks?days=${days}`);
  return r.json();
}

export function qrUrl(slug) {
  return `${BASE}/links/${slug}/qr`;
}

export function redirectUrl(slug) {
  return `/r/${slug}`;
}
