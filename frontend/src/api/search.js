import api from './client';

export async function searchNotes(query) {
  const q = (query || '').trim();
  if (!q || q.length < 2) return { query: q, notes: [] };
  const { data } = await api.get('/search', { params: { q } });
  return data;
}
