const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' });

export function formatDate(date: Date): string {
  return formatter.format(date);
}
