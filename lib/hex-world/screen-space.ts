export type ScreenPoint = { x: number; y: number };
export type ScreenViewport = { width: number; height: number };

export function clampScreenPoint(point: ScreenPoint, viewport: ScreenViewport, padding = 16): ScreenPoint {
  const minX = padding;
  const maxX = Math.max(minX, viewport.width - padding);
  const minY = padding;
  const maxY = Math.max(minY, viewport.height - padding);
  return {
    x: Math.min(maxX, Math.max(minX, point.x)),
    y: Math.min(maxY, Math.max(minY, point.y)),
  };
}
