import test from 'node:test';
import assert from 'node:assert/strict';
import { completion } from '../server/src/modules/intern/completion.js';

test('empty profile is 0% and lists every requirement', () => {
  const r = completion({ skills: [], career_interests: [] });
  assert.equal(r.pct, 0);
  assert.equal(r.missing.length, 10);
});

test('full profile is 100%', () => {
  const r = completion({
    photo_path: 'photos/a.jpg', institution: 'UoN', course: 'CS', qualification_level: 'Diploma', graduation_year: 2026,
    skills: ['SQL'], career_interests: ['marketing'], preferred_county: 'Nairobi', preferred_work_arrangement: 'hybrid', cv_path: 'cvs/a.pdf',
  });
  assert.equal(r.pct, 100);
  assert.deepEqual(r.missing, []);
});

test('partial profile rounds correctly', () => {
  const r = completion({ institution: 'UoN', course: 'CS', skills: ['x'], career_interests: [] });
  assert.equal(r.pct, 30);
});
