import api from './client';

export async function listNotes(projectId) {
  const { data } = await api.get(`/projects/${projectId}/notes`);
  return data.notes;
}

export async function createNote(projectId, payload = {}) {
  const { data } = await api.post(`/projects/${projectId}/notes`, payload);
  return data.note;
}

export async function getNote(noteId) {
  const { data } = await api.get(`/notes/${noteId}`);
  return data.note;
}

export async function updateNote(noteId, payload) {
  const { data } = await api.patch(`/notes/${noteId}`, payload);
  return data.note;
}

export async function deleteNote(noteId) {
  const { data } = await api.delete(`/notes/${noteId}`);
  return data;
}
