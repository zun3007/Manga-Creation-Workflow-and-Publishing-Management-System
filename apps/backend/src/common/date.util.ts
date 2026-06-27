/**
 * Normalize an incoming calendar date into a MySQL-safe DATETIME literal.
 *
 * The client sends a calendar date ("YYYY-MM-DD" from an <input type="date">);
 * older / buggy clients sent a full ISO string with a trailing "Z"
 * (e.g. "2026-06-20T00:00:00.000Z"). MySQL 8 in strict mode (STRICT_TRANS_TABLES)
 * rejects the "Z" designator with "Incorrect datetime value" (ERROR 1292), which
 * makes every INSERT carrying such a deadline fail. We take just the date part
 * and anchor it to noon so the calendar day survives the timezone round-trip when
 * the DATETIME is later serialized back to the client (00:00 / 23:59 can slip a
 * day). Returns null for empty or malformed input.
 *
 * Use this for any column typed DATETIME that receives a client-supplied date.
 */
export function toMysqlDeadline(input?: string | null): string | null {
  if (!input) return null;
  const datePart = String(input).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? `${datePart} 12:00:00` : null;
}
