import api from './client';

export async function listTags() {
  const { data } = await api.get('/tags');
  return data.tags;
}

export async function listNotesByTag(tagId) {
  const { data } = await api.get(`/tags/${tagId}/notes`);
  return data;
}
