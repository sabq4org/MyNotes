import api from './client';

export async function listProjects() {
  const { data } = await api.get('/projects');
  return data.projects;
}

export async function getProject(id) {
  const { data } = await api.get(`/projects/${id}`);
  return data.project;
}

export async function createProject(payload) {
  const { data } = await api.post('/projects', payload);
  return data.project;
}

export async function updateProject(id, payload) {
  const { data } = await api.patch(`/projects/${id}`, payload);
  return data.project;
}

export async function deleteProject(id) {
  const { data } = await api.delete(`/projects/${id}`);
  return data;
}
