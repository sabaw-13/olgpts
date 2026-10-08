import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchAllRows } from '../src/lib/fetchAllRows.js';
import { getSchoolDate } from '../src/lib/date.js';
import { escapeCsv } from '../src/lib/csv.js';

test('pagination retrieves all rows even below the requested API page size', async () => {
  const records = Array.from({ length: 1205 }, (_, id) => ({ id }));
  const result = await fetchAllRows(() => ({
    order() { return this; },
    async range(from, to) {
      return { data: records.slice(from, Math.min(to + 1, from + 100)), error: null };
    },
  }));
  assert.deepEqual(result, { data: records, error: null });
});

test('pagination discards partial results when a later page fails', async () => {
  const error = new Error('Network failed');
  let page = 0;
  const result = await fetchAllRows(() => ({
    order() { return this; },
    async range() { return page++ === 0 ? { data: [{ id: 1 }] } : { error }; },
  }));
  assert.deepEqual(result, { data: null, error });
});

test('school dates use Manila across midnight and year boundaries', () => {
  assert.equal(getSchoolDate(new Date('2026-10-05T23:30:00Z')), '2026-10-06');
  assert.equal(getSchoolDate(new Date('2026-12-31T16:00:00Z')), '2027-01-01');
});

test('CSV quotes delimiters and neutralizes spreadsheet formulas', () => {
  assert.equal(escapeCsv('Last, First'), '"Last, First"');
  assert.equal(escapeCsv('say "hello"\r\nnext'), '"say ""hello""\r\nnext"');
  for (const value of ['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', '\t=1+1']) {
    assert.equal(escapeCsv(value), `'${value}`);
  }
  assert.equal(escapeCsv(-10), '-10');
});
