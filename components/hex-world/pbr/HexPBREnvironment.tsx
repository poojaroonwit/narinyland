"use client";

import { Environment } from '@react-three/drei';
import { getPBREnvironmentPathForQuality } from '@/lib/hex-world/pbr/quality-assets';
import type { HexQualityProfile } from '@/lib/hex-world/quality';

export function HexPBREnvironment({ profile }: { profile: HexQualityProfile }) {
  const environmentPath = getPBREnvironmentPathForQuality(profile.name);
  return <Environment files={environmentPath} background={false} />;
}
