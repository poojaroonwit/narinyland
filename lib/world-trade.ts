export type WorldTradeParticipantRole = 'sender' | 'recipient';

export type WorldTradeState = {
  senderOfferItemKey: string | null;
  recipientOfferItemKey: string | null;
  senderReady: boolean;
  recipientReady: boolean;
  readyCount: number;
  canSettle: boolean;
};

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : null;
}

export function getWorldTradeState(metadata: Record<string, unknown>): WorldTradeState {
  const senderOfferItemKey = getMetadataString(metadata, 'senderOfferItemKey');
  const recipientOfferItemKey = getMetadataString(metadata, 'recipientOfferItemKey');
  const senderReady = metadata.senderReady === true;
  const recipientReady = metadata.recipientReady === true;
  const hasOffer = Boolean(senderOfferItemKey || recipientOfferItemKey);
  const offersAreDistinct = !senderOfferItemKey || !recipientOfferItemKey || senderOfferItemKey !== recipientOfferItemKey;

  return {
    senderOfferItemKey,
    recipientOfferItemKey,
    senderReady,
    recipientReady,
    readyCount: Number(senderReady) + Number(recipientReady),
    canSettle: senderReady && recipientReady && hasOffer && offersAreDistinct,
  };
}

export function applyWorldTradeOffer(
  metadata: Record<string, unknown>,
  role: WorldTradeParticipantRole,
  itemKey: string | null,
  updatedAt: string,
) {
  const offerKey = role === 'sender' ? 'senderOfferItemKey' : 'recipientOfferItemKey';
  const next = {
    ...metadata,
    [offerKey]: itemKey,
    senderReady: false,
    recipientReady: false,
    tradeOfferUpdatedBy: role,
    tradeOfferUpdatedAt: updatedAt,
  };

  if (!itemKey) delete next[offerKey];
  return next;
}

export function getWorldTradeOfferForRole(state: WorldTradeState, role: WorldTradeParticipantRole) {
  return role === 'sender' ? state.senderOfferItemKey : state.recipientOfferItemKey;
}
