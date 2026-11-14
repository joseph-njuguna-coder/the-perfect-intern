import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseKenyanPhone } from '../server/src/utils/phone.js';
import { newToken, hashToken } from '../server/src/utils/tokens.js';

test('normalises Kenyan phone formats', () => {
  assert.equal(normaliseKenyanPhone('0712 345 678'), '254712345678');
  assert.equal(normaliseKenyanPhone('+254112345678'), '254112345678');
  assert.equal(normaliseKenyanPhone('254712345678'), '254712345678');
  assert.equal(normaliseKenyanPhone('0612345678'), null);
  assert.equal(normaliseKenyanPhone('12345'), null);
});

test('tokens are random and hashed consistently', () => {
  const a = newToken();
  const b = newToken();
  assert.notEqual(a.token, b.token);
  assert.equal(a.hash, hashToken(a.token));
  assert.match(a.token, /^[a-f0-9]{64}$/);
});
