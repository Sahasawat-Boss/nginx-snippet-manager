const dateFormat = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDate(iso) {
  return dateFormat.format(new Date(iso));
}
