export function stripHtml(html) {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

export function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'الآن';
  if (diff < hour) return `قبل ${Math.floor(diff / minute)} دقيقة`;
  if (diff < day) return `قبل ${Math.floor(diff / hour)} ساعة`;
  if (diff < 7 * day) return `قبل ${Math.floor(diff / day)} يوم`;

  return new Date(iso).toLocaleDateString('ar', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
