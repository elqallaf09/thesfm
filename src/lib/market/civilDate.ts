const MONTH_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

/**
 * Parses an English publication date as the publisher's calendar day, never
 * as local midnight. This avoids shifting a source date backwards when a
 * server later serializes it as UTC.
 */
export function parseEnglishCivilDate(value: unknown): string | null {
  const raw = String(value ?? '').trim().replace(/\s+/g, ' ');
  const dayFirst = raw.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  const monthFirst = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  const parts = dayFirst
    ? { day: Number(dayFirst[1]), month: dayFirst[2].toLowerCase(), year: Number(dayFirst[3]) }
    : monthFirst
      ? { day: Number(monthFirst[2]), month: monthFirst[1].toLowerCase(), year: Number(monthFirst[3]) }
      : null;
  if (!parts || !Number.isInteger(parts.year) || parts.year < 1000) return null;

  const month = MONTH_INDEX[parts.month];
  if (month === undefined || !Number.isInteger(parts.day) || parts.day < 1 || parts.day > 31) return null;

  const date = new Date(Date.UTC(parts.year, month, parts.day));
  if (date.getUTCFullYear() !== parts.year || date.getUTCMonth() !== month || date.getUTCDate() !== parts.day) return null;
  return date.toISOString().slice(0, 10);
}
