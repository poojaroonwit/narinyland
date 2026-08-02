import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCachedAuthUser, resolveAuthUser, type AuthUser } from '../lib/auth-bootstrap';

const verifiedUser: AuthUser = {
  sub: 'user-1',
  name: 'Narin',
  email: 'narin@example.com',
  picture: '/avatar.png',
  attributes: { circleId: 'circle-1' },
};

test('parseCachedAuthUser accepts only a profile with a stable subject', () => {
  assert.deepEqual(parseCachedAuthUser(JSON.stringify(verifiedUser)), verifiedUser);
  assert.equal(parseCachedAuthUser('{"name":"Missing subject"}'), null);
  assert.equal(parseCachedAuthUser('not-json'), null);
});

test('resolveAuthUser prefers a freshly verified profile', () => {
  const freshUser = { ...verifiedUser, name: 'Fresh profile' };
  assert.deepEqual(resolveAuthUser({
    hasSession: true,
    remoteUser: freshUser,
    cachedUser: verifiedUser,
    remoteUnavailable: false,
  }), { user: freshUser, source: 'remote' });
});

test('resolveAuthUser permits cached recovery only for a present session and transient outage', () => {
  assert.deepEqual(resolveAuthUser({
    hasSession: true,
    remoteUser: null,
    cachedUser: verifiedUser,
    remoteUnavailable: true,
  }), { user: verifiedUser, source: 'cached' });

  assert.deepEqual(resolveAuthUser({
    hasSession: false,
    remoteUser: null,
    cachedUser: verifiedUser,
    remoteUnavailable: true,
  }), { user: null, source: 'missing' });

  assert.deepEqual(resolveAuthUser({
    hasSession: true,
    remoteUser: null,
    cachedUser: verifiedUser,
    remoteUnavailable: false,
  }), { user: null, source: 'missing' });
});
