import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getConfigId, getExplicitConfigId } from '@/lib/get-config-id';
import {
  extractBoundaryTokens,
  extractBoundaryUser,
  getBoundarySsoLaunchUrl,
  normalizeBaseUrl,
  normalizeBoundaryUser,
} from '@/lib/boundary-sso';
import { allowUnscopedLegacyMediaAccess } from '@/lib/media-access';
import { getConfigIdFromStorageKey, scopeLegacyUniboxStorageKey } from '@/lib/media-key';
import { isSameOrigin } from '@/lib/security';
import { isSafeStorageKey, normalizeUploadFolder } from '@/lib/upload-validation';

function requestWith(headers: Record<string, string>): Request {
  return new Request('https://narinyland.test/api/config', { headers });
}

test('getConfigId prefers a valid X-Circle-Id header', () => {
  const request = requestWith({
    'X-Circle-Id': 'circle_123',
    cookie: 'narinyland_circle_id=other-circle',
  });

  assert.equal(getExplicitConfigId(request), 'circle_123');
  assert.equal(getConfigId(request), 'circle_123');
});

test('getConfigId falls back to the active circle cookie for browser media requests', () => {
  const request = requestWith({
    cookie: 'narinyland_circle_id=cookie-circle',
  });

  assert.equal(getExplicitConfigId(request), 'cookie-circle');
  assert.equal(getConfigId(request), 'cookie-circle');
});

test('getConfigId rejects malformed values and falls back to default', () => {
  const request = requestWith({
    'X-Circle-Id': '../not-safe',
    cookie: 'narinyland_circle_id=also/not/safe',
  });

  assert.equal(getExplicitConfigId(request), null);
  assert.equal(getConfigId(request), 'default');
});

test('scoped media keys expose their config id', () => {
  assert.equal(
    getConfigIdFromStorageKey('configs/circle-1/gallery/image.png'),
    'circle-1'
  );
  assert.equal(getConfigIdFromStorageKey('gallery/legacy-image.png'), null);
  assert.equal(getConfigIdFromStorageKey('configs/../gallery/image.png'), null);
});

test('legacy UniBox media keys can be scoped without changing asset id', () => {
  assert.equal(
    scopeLegacyUniboxStorageKey('unibox/asset_123', 'circle-1'),
    'configs/circle-1/unibox/asset_123'
  );
  assert.equal(
    scopeLegacyUniboxStorageKey('configs/circle-1/unibox/asset_123', 'circle-2'),
    'configs/circle-1/unibox/asset_123'
  );
  assert.equal(scopeLegacyUniboxStorageKey('gallery/legacy-image.png', 'circle-1'), null);
});

test('production requires explicit opt-in for unscoped legacy media', () => {
  assert.equal(allowUnscopedLegacyMediaAccess({ NODE_ENV: 'production' }), false);
  assert.equal(
    allowUnscopedLegacyMediaAccess({ NODE_ENV: 'production', ALLOW_LEGACY_UNSCOPED_MEDIA: 'true' }),
    true
  );
  assert.equal(allowUnscopedLegacyMediaAccess({ NODE_ENV: 'development' }), true);
});

test('origin checks require exact host matches', () => {
  assert.equal(
    isSameOrigin(requestWith({ origin: 'https://narinyland.test', host: 'narinyland.test' })),
    true
  );
  assert.equal(
    isSameOrigin(requestWith({ origin: 'https://evil-narinyland.test', host: 'narinyland.test' })),
    false
  );
});

test('upload folders and storage keys are constrained', () => {
  assert.equal(normalizeUploadFolder('gallery'), 'gallery');
  assert.equal(normalizeUploadFolder('../secrets'), 'uploads');
  assert.equal(isSafeStorageKey('configs/circle-1/gallery/image.png'), true);
  assert.equal(isSafeStorageKey('../secrets'), false);
  assert.equal(isSafeStorageKey('/absolute/key'), false);
});

test('Boundary launch URLs resolve to the configured route', () => {
  assert.equal(normalizeBaseUrl('narinyland.up.railway.app/'), 'https://narinyland.up.railway.app');

  const request = new Request('http://internal/auth/boundary/launch', {
    headers: {
      'x-forwarded-host': 'narinyland.up.railway.app',
      'x-forwarded-proto': 'https',
    },
  });

  assert.equal(
    getBoundarySsoLaunchUrl(request),
    'https://narinyland.up.railway.app/auth/boundary/launch'
  );
});

test('Boundary SSO exchange payloads produce local session data', () => {
  const payload = {
    data: {
      user: {
        userId: 'user_123',
        firstName: 'Nari',
        lastName: 'Love',
        email: 'nari@example.com',
        picture: 'https://cdn.example.com/nari.png',
        attributes: { circleId: 'circle_123' },
      },
      tokens: {
        accessToken: 'access.jwt',
        refreshToken: 'refresh.jwt',
        expiresIn: '7200',
      },
    },
  };

  const user = normalizeBoundaryUser(extractBoundaryUser(payload));
  assert.deepEqual(user, {
    id: 'user_123',
    sub: 'user_123',
    name: 'Nari Love',
    email: 'nari@example.com',
    avatar: 'https://cdn.example.com/nari.png',
    picture: 'https://cdn.example.com/nari.png',
    attributes: { circleId: 'circle_123' },
  });

  assert.deepEqual(extractBoundaryTokens(payload), {
    accessToken: 'access.jwt',
    refreshToken: 'refresh.jwt',
    expiresIn: 7200,
  });
});
