import api from './client';

export async function fetchAuthStatus() {
  const { data } = await api.get('/auth/status');
  return data;
}

export async function setupPin(pin) {
  const { data } = await api.post('/auth/setup', { pin });
  return data;
}

export async function loginWithPin(pin) {
  const { data } = await api.post('/auth/login', { pin });
  return data;
}

export async function changePin(currentPin, newPin) {
  const { data } = await api.post('/auth/change', { currentPin, newPin });
  return data;
}

export async function probeMe() {
  const { data } = await api.get('/me');
  return data;
}
