import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrom } from '../server/src/modules/email/address.js';

test('parses "Name <email>" sender strings', () => {
  assert.deepEqual(parseFrom('The Perfect Intern <no-reply@example.co.ke>'), { name: 'The Perfect Intern', email: 'no-reply@example.co.ke' });
  assert.deepEqual(parseFrom('"Quoted Name" <a@b.co>'), { name: 'Quoted Name', email: 'a@b.co' });
  assert.deepEqual(parseFrom('plain@b.co'), { name: '', email: 'plain@b.co' });
});
