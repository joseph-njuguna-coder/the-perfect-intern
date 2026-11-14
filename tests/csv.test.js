import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, toCsv } from '../server/src/utils/csv.js';

test('quotes cells containing commas, quotes and newlines', () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('line1\nline2'), '"line1\nline2"');
});

test('neutralises spreadsheet formula injection', () => {
  for (const bad of ['=SUM(A1)', '+1', '-1', '@cmd']) assert.ok(csvCell(bad).startsWith("'"), bad);
});

test('handles nulls, numbers and dates', () => {
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(199), '199');
  assert.equal(csvCell(new Date('2026-01-01T00:00:00Z')), '2026-01-01T00:00:00.000Z');
});

test('builds a CSV with a header row', () => {
  assert.equal(toCsv(['a', 'b'], [[1, 'x,y']]), 'a,b\r\n1,"x,y"');
});
