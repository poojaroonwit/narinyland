"use client";

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { HomesteadLifeState } from '@/lib/homestead-life-engine';
import type { HexResidentInteractionSample, HexResidentId } from '@/lib/hex-world/explore-interactions';
import { axialToWorld, hexKey } from '@/lib/hex-world/hex-grid';
import {
  getHomesteadPresencePosition,
  type HomesteadPresenceAnchor,
  type HomesteadPresenceRole,
} from '@/lib/hex-world/homestead-presence';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';

export const RESIDENT_REPORT_INTERVAL = 0.1;
export const RESIDENT_REPORT_EPSILON = 0.04;

const PRESENCE_ROLE_BY_BUILDING: Partial<Record<string, HomesteadPresenceRole>> = {
  home: 'home',
  garden_patch: 'garden',
  pond: 'pond',
  workshop: 'workshop',
  bench: 'bench',
  barn: 'barn',
};

function samplesChanged(
  previous: HexResidentInteractionSample[],
  next: HexResidentInteractionSample[],
): boolean {
  if (previous.length !== next.length) return true;
  for (let index = 0; index < next.length; index += 1) {
    const left = previous[index];
    const right = next[index];
    if (
      left.residentId !== right.residentId
      || left.role !== right.role
      || left.petKind !== right.petKind
      || Math.abs(left.x - right.x) > RESIDENT_REPORT_EPSILON
      || Math.abs(left.z - right.z) > RESIDENT_REPORT_EPSILON
    ) return true;
  }
  return false;
}

export function HexResidentInteractionReporter({
  state,
  buildings,
  tiles,
  reducedMotion,
  onResidentSamplesChange,
}: {
  state: HomesteadLifeState;
  buildings: HexBuildingDTO[];
  tiles: HexTileDTO[];
  reducedMotion: boolean;
  onResidentSamplesChange: (samples: HexResidentInteractionSample[]) => void;
}) {
  const previousSamplesRef = useRef<HexResidentInteractionSample[]>([]);
  const lastReportRef = useRef(-Infinity);
  const tileHeight = useMemo(() => new Map(tiles.map((tile) => [hexKey(tile), tile.height])), [tiles]);
  const anchors = useMemo<HomesteadPresenceAnchor[]>(() => buildings.flatMap((building) => {
    const role = PRESENCE_ROLE_BY_BUILDING[building.buildingKey];
    if (!role) return [];
    const baseY = tileHeight.get(`${building.anchorQ}:${building.anchorR}`) ?? 0;
    const world = axialToWorld({ q: building.anchorQ, r: building.anchorR }, 1, baseY + 0.14);
    return [{ role, x: world.x, y: world.y, z: world.z }];
  }), [buildings, tileHeight]);

  useFrame(({ clock }) => {
    if (document.visibilityState === 'hidden') return;
    if (clock.elapsedTime - lastReportRef.current < RESIDENT_REPORT_INTERVAL) return;
    lastReportRef.current = clock.elapsedTime;

    const residents: Array<{ residentId: HexResidentId; role: 'partner' | 'child' | 'pet'; petKind?: 'cat' | 'dog' }> = [
      { residentId: 'partner-1', role: 'partner' },
      { residentId: 'partner-2', role: 'partner' },
      ...(state.family.stage === 'child' ? [{ residentId: 'child' as const, role: 'child' as const }] : []),
      ...(state.animals.pet.kind
        ? [{ residentId: 'pet' as const, role: 'pet' as const, petKind: state.animals.pet.kind }]
        : []),
    ];

    const next = residents.map((resident) => {
      const position = getHomesteadPresencePosition({
        id: resident.residentId,
        day: state.day,
        timeMinutes: state.timeMinutes,
        elapsedSeconds: clock.elapsedTime,
        anchors,
        reducedMotion,
      });
      return {
        ...resident,
        x: position.x,
        z: position.z,
      } satisfies HexResidentInteractionSample;
    });

    if (!samplesChanged(previousSamplesRef.current, next)) return;
    previousSamplesRef.current = next;
    onResidentSamplesChange(next);
  });

  return null;
}
