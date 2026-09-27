// Petits utilitaires DOM. Les textes venant des API ne passent jamais par
// innerHTML : ils sont insérés comme texte, ce qui empêche toute injection.

type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | undefined> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value !== undefined) el.setAttribute(name, value);
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'number' ? String(child) : child);
  }
  return el;
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' });
const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' });
const hourFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
});

export const formatDate = (iso: string) => dateFormatter.format(new Date(iso));
export const formatShortDate = (iso: string) => shortDateFormatter.format(new Date(iso));
export const formatHour = (iso: string) => hourFormatter.format(new Date(iso));

/** Débit en m³/s avec un nombre de chiffres adapté à son ordre de grandeur. */
export function formatDebit(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (value === 0) return '0';
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : value >= 1 ? 2 : 3;
  return value.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Met une majuscule initiale à un libellé tout en capitales (« VIGNEULLES » → « Vigneulles »). */
export function capitalize(text: string | null): string {
  if (!text) return '—';
  if (text !== text.toUpperCase()) return text;
  return text.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase());
}
