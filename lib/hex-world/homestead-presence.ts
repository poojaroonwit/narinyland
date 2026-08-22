export type HomesteadPresenceRole = 'home' | 'garden' | 'pond' | 'workshop' | 'bench' | 'barn';

export type HomesteadPresenceAnchor = {
  role: HomesteadPresenceRole;
  x: number;
  y: number;
  z: number;
};

export type HomesteadPresencePosition = {
  x: number;
  y: number;
  z: number;
  heading: number;
  role: HomesteadPresenceRole;
};

const ROUTES: Record<string, HomesteadPresenceRole[]> = {
  'partner-1': ['home', 'garden', 'bench', 'pond', 'home'],
  'partner-2': ['home', 'workshop', 'barn', 'bench', 'home'],
  child: ['home', 'garden', 'bench', 'home'],
  cow: ['barn', 'barn'],
  sheep: ['barn', 'barn'],
  pet: ['home', 'garden', 'bench', 'home'],
};

function stableUnit(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(t: number) {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

function findAnchor(anchors: HomesteadPresenceAnchor[], role: HomesteadPresenceRole): HomesteadPresenceAnchor | null {
  return anchors.find((anchor) => anchor.role === role) ?? null;
}

function fallbackAnchor(anchors: HomesteadPresenceAnchor[]): HomesteadPresenceAnchor {
  return findAnchor(anchors, 'home') ?? anchors[0] ?? { role: 'home', x: 0, y: 0.62, z: 0 };
}

export function getHomesteadPresencePosition({
  id,
  day,
  timeMinutes,
  elapsedSeconds,
  anchors,
  reducedMotion,
}: {
  id: string;
  day: number;
  timeMinutes: number;
  elapsedSeconds: number;
  anchors: HomesteadPresenceAnchor[];
  reducedMotion: boolean;
}): HomesteadPresencePosition {
  const fallback = fallbackAnchor(anchors);
  const requestedRoute = ROUTES[id] ?? ['home', 'bench', 'home'];
  const route = requestedRoute
    .map((role) => findAnchor(anchors, role))
    .filter((anchor): anchor is HomesteadPresenceAnchor => !!anchor);
  const safeRoute = route.length > 0 ? route : [fallback];
  const phase = stableUnit(`${id}:${Math.max(1, Math.floor(day))}`);
  const offsetAngle = stableUnit(`${id}:offset`) * Math.PI * 2;
  const offsetRadius = id === 'cow' || id === 'sheep' ? 0.52 : id === 'pet' ? 0.32 : 0.22;
  const offsetX = Math.cos(offsetAngle) * offsetRadius;
  const offsetZ = Math.sin(offsetAngle) * offsetRadius;

  if (reducedMotion || safeRoute.length === 1) {
    const index = Math.floor(phase * safeRoute.length) % safeRoute.length;
    const anchor = safeRoute[index];
    return { x: anchor.x + offsetX, y: anchor.y, z: anchor.z + offsetZ, heading: offsetAngle, role: anchor.role };
  }

  const clock = Math.max(0, timeMinutes) / 90 + Math.max(0, elapsedSeconds) / 8 + phase * safeRoute.length;
  const index = Math.floor(clock) % safeRoute.length;
  const nextIndex = (index + 1) % safeRoute.length;
  const from = safeRoute[index];
  const to = safeRoute[nextIndex];
  const progress = smoothstep(clock - Math.floor(clock));
  const x = lerp(from.x, to.x, progress) + offsetX;
  const y = lerp(from.y, to.y, progress);
  const z = lerp(from.z, to.z, progress) + offsetZ;
  const heading = Math.atan2(to.x - from.x, to.z - from.z);
  return { x, y, z, heading, role: progress < 0.5 ? from.role : to.role };
}
