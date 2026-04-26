import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Debounced auto-save helper.
 *
 * - `key` identifies the current target (e.g. note id). When it changes the
 *   pending timer is cleared and a new "idle" cycle starts.
 * - `save(payload)` is the async function that actually persists changes.
 *
 * Returns `{ status, schedule, flush }`:
 *   - `status` ∈ 'idle' | 'pending' | 'saving' | 'saved' | 'error'
 *   - `schedule(payload)` queues a save; multiple calls within `delay` ms
 *     coalesce into one network call with the *latest* payload.
 *   - `flush()` forces an immediate save of the pending payload (useful on
 *     unmount / page leave).
 */
export default function useDebouncedSave({ key, save, delay = 700 }) {
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const timerRef = useRef(null);
  const payloadRef = useRef(null);
  const keyRef = useRef(key);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  // Reset on key change.
  useEffect(() => {
    keyRef.current = key;
    payloadRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus('idle');
    setErrorMessage('');
  }, [key]);

  const performSave = useCallback(async () => {
    const pending = payloadRef.current;
    if (!pending) return;
    payloadRef.current = null;
    timerRef.current = null;
    setStatus('saving');
    try {
      await saveRef.current(pending);
      setStatus('saved');
      setErrorMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err?.userMessage || err?.message || 'فشل الحفظ');
    }
  }, []);

  const schedule = useCallback(
    (payload) => {
      payloadRef.current = payload;
      setStatus('pending');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(performSave, delay);
    },
    [delay, performSave]
  );

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return performSave();
  }, [performSave]);

  // Save before unload.
  useEffect(() => {
    const onBeforeUnload = () => {
      if (payloadRef.current) {
        // Best-effort; modern browsers won't await async work here.
        flush();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [flush]);

  return { status, errorMessage, schedule, flush };
}
