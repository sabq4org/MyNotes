import api from './client';
import { getToken } from '../lib/storage';

/**
 * Trigger a browser download of the backup JSON.
 * Uses fetch directly (not axios) so the browser saves the file natively.
 */
export async function downloadBackup() {
  const token = getToken();
  const res = await fetch('/api/backup/export', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = 'فشل التصدير';
    try {
      const data = await res.json();
      message = data?.message || message;
    } catch {
      /* ignore parse errors */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  const blob = await res.blob();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `mynotes-backup-${stamp}.json`;
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
  return { filename };
}

/**
 * Import a backup JSON object (already parsed). REPLACES all data.
 */
export async function importBackup(payload) {
  const { data } = await api.post('/backup/import', payload);
  return data;
}
