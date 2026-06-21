import { toMysqlDeadline } from './date.util';

describe('toMysqlDeadline', () => {
  it('anchors a plain calendar date to noon (survives tz round-trip)', () => {
    expect(toMysqlDeadline('2026-06-20')).toBe('2026-06-20 12:00:00');
  });

  it('strips the trailing "Z" that MySQL 8 strict mode rejects (ERROR 1292)', () => {
    // The exact value the buggy client sent for <input type="date">.
    expect(toMysqlDeadline('2026-06-20T00:00:00.000Z')).toBe(
      '2026-06-20 12:00:00',
    );
  });

  it('returns null for empty / nullish input', () => {
    expect(toMysqlDeadline(undefined)).toBeNull();
    expect(toMysqlDeadline(null)).toBeNull();
    expect(toMysqlDeadline('')).toBeNull();
  });

  it('returns null for malformed input rather than passing garbage to SQL', () => {
    expect(toMysqlDeadline('not-a-date')).toBeNull();
    expect(toMysqlDeadline('2026/06/20')).toBeNull();
  });
});
