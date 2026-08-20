"use client";

import React, { useMemo } from 'react';
import { axialToWorld, hexKey } from '@/lib/hex-world/hex-grid';
import type { HexCoord, HexTileDTO } from '@/lib/hex-world/types';

export const HEX_MOTION = {
  fastMs: 180,
  settleMs: 280,
  expansionMs: 950,
} as const;

export function HexSelectionEffects({
  tiles,
  selectedCoord,
  validKeys,
  invalidKeys,
}: {
  tiles: HexTileDTO[];
  selectedCoord?: HexCoord | null;
  validKeys?: Set<string>;
  invalidKeys?: Set<string>;
}) {
  const tileByKey = useMemo(() => new Map(tiles.map((tile) => [hexKey(tile), tile])), [tiles]);
  const selected = selectedCoord ? tileByKey.get(hexKey(selectedCoord)) : null;
  const position = selected ? axialToWorld(selected, 1, selected.height + 0.11) : null;
  const state = selectedCoord ? (invalidKeys?.has(hexKey(selectedCoord)) ? 'invalid' : validKeys?.has(hexKey(selectedCoord)) ? 'valid' : 'selected') : null;
  const color = state === 'invalid' ? '#cf716d' : state === 'valid' ? '#6faf79' : '#fff4d8';

  if (!position) return null;
  return (
    <group position={[position.x, position.y, position.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh renderOrder={8}>
        <ringGeometry args={[0.76, 0.9, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.82} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
