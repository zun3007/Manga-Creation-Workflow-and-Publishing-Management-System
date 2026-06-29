/**
 * Normalize an incoming calendar date into a MySQL-safe DATETIME literal.
 *
 * Clients send a calendar date ("YYYY-MM-DD" from an <input type="date">).
 * MySQL DATETIME does not accept a trailing ISO "Z", so keep the date part and
 * anchor it at noon to avoid timezone round-trip day shifts.
 */
export function toMysqlDeadline(input?: string | null): string | null {
  if (!input) return null;
  const datePart = String(input).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? `${datePart} 12:00:00` : null;
}
