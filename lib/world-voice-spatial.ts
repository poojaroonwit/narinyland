export function getProximityVoiceGain(
  distance: number,
  maxRange: number,
  fullVolumeRange = maxRange * 0.25,
) {
  if (!Number.isFinite(distance) || !Number.isFinite(maxRange) || maxRange <= 0) return 0;

  const safeDistance = Math.max(0, distance);
  const innerRange = Math.min(maxRange, Math.max(0, fullVolumeRange));
  if (safeDistance <= innerRange) return 1;
  if (safeDistance >= maxRange) return 0;

  const falloff = 1 - (safeDistance - innerRange) / Math.max(0.001, maxRange - innerRange);
  return falloff * falloff;
}
