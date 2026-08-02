export type WorldCameraMode = 'isometric' | 'third';

export type DirectionalMovementInput = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
};

export function getCameraRelativeMovement(
  movement: DirectionalMovementInput,
  cameraMode: WorldCameraMode,
  cameraRotation: number,
) {
  const localX = (movement.right ? 1 : 0) - (movement.left ? 1 : 0);
  const localZ = (movement.back ? 1 : 0) - (movement.forward ? 1 : 0);
  const length = Math.hypot(localX, localZ);

  if (length === 0) return { x: 0, z: 0 };

  const normalizedX = localX / length;
  const normalizedZ = localZ / length;
  const cameraBearing = cameraRotation + (cameraMode === 'isometric' ? Math.PI / 4 : 0);
  const cosine = Math.cos(cameraBearing);
  const sine = Math.sin(cameraBearing);

  return {
    x: normalizedX * cosine + normalizedZ * sine,
    z: -normalizedX * sine + normalizedZ * cosine,
  };
}
