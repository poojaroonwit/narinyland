import assert from 'node:assert/strict';
import test from 'node:test';
import { applyWorldTradeOffer, getWorldTradeOfferForRole, getWorldTradeState } from '@/lib/world-trade';

test('trade state requires both confirmations and at least one distinct offer', () => {
  assert.equal(getWorldTradeState({ senderReady: true, recipientReady: true }).canSettle, false);
  assert.equal(getWorldTradeState({
    senderOfferItemKey: 'rose_halo',
    senderReady: true,
    recipientReady: true,
  }).canSettle, true);
  assert.equal(getWorldTradeState({
    senderOfferItemKey: 'rose_halo',
    recipientOfferItemKey: 'rose_halo',
    senderReady: true,
    recipientReady: true,
  }).canSettle, false);
});

test('changing an offer clears both confirmations', () => {
  const metadata = applyWorldTradeOffer({
    senderReady: true,
    recipientReady: true,
    recipientOfferItemKey: 'moon_pin',
  }, 'sender', 'rose_halo', '2026-08-02T12:00:00.000Z');

  assert.equal(metadata.senderOfferItemKey, 'rose_halo');
  assert.equal(metadata.recipientOfferItemKey, 'moon_pin');
  assert.equal(metadata.senderReady, false);
  assert.equal(metadata.recipientReady, false);
  assert.equal(metadata.tradeOfferUpdatedBy, 'sender');
});

test('clearing an offer removes it from normalized trade state', () => {
  const metadata = applyWorldTradeOffer({ senderOfferItemKey: 'rose_halo' }, 'sender', null, 'now');
  const state = getWorldTradeState(metadata);
  assert.equal(getWorldTradeOfferForRole(state, 'sender'), null);
});
