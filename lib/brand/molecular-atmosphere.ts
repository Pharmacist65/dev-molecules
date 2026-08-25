export type MolevrenAtmosphereVariant =
  | "home"
  | "atlas"
  | "dossier"
  | "academy"
  | "synthesis"
  | "lab"
  | "default";

export interface MolevrenAtmosphereNode {
  x: number;
  y: number;
  readonly radius: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly phase: number;
  readonly accent: number;
}
export const MOLEVREN_ATMOSPHERE_FPS = 24;
export const MOLEVREN_ATMOSPHERE_DPR_CAP = 1.5;

const MOBILE_BREAKPOINT = 768;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function hashString(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function createDeterministicRandom(seed: number) {
  let state = seed || 0x6d_6f_6c_65;

  return () => {
    state += 0x6d_2b_79_f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function getMolevrenAtmosphereVariant(
  route: string,
): MolevrenAtmosphereVariant {
  const normalizedRoute = route.trim().toLowerCase();

  if (normalizedRoute.includes("synthesis")) return "synthesis";
  if (normalizedRoute.includes("academy") || normalizedRoute.includes("learn")) {
    return "academy";
  }
  if (normalizedRoute.includes("lab") || normalizedRoute.includes("build")) {
    return "lab";
  }
  if (normalizedRoute.includes("dossier") || normalizedRoute.includes("drug")) {
    return "dossier";
  }
  if (normalizedRoute.includes("atlas") || normalizedRoute.includes("explore")) {
    return "atlas";
  }
  if (!normalizedRoute || normalizedRoute.includes("home")) return "home";
  return "default";
}

/** Keeps the scene deliberately sparse: 12–20 nodes on mobile, 30–45 otherwise. */
export function getMolevrenAtmosphereNodeCount(width: number, height: number) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const area = safeWidth * safeHeight;

  return safeWidth < MOBILE_BREAKPOINT
    ? clamp(Math.round(area / 24_000), 12, 20)
    : clamp(Math.round(area / 39_000), 30, 45);
}

export function getMolevrenAtmosphereLinkDistance(width: number) {
  return width < MOBILE_BREAKPOINT ? 112 : 168;
}

export function createMolevrenAtmosphereNodes(
  width: number,
  height: number,
  route: string,
): MolevrenAtmosphereNode[] {
  const nodeCount = getMolevrenAtmosphereNodeCount(width, height);
  const seed = hashString(
    `${route}|${Math.round(width)}x${Math.round(height)}|${nodeCount}`,
  );
  const random = createDeterministicRandom(seed);

  return Array.from({ length: nodeCount }, (_, index) => {
    const angle = random() * Math.PI * 2;
    const speed = 4 + random() * 7;

    return {
      x: random() * width,
      y: random() * height,
      radius: 1.4 + random() * 2.2,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      phase: random() * Math.PI * 2,
      accent: (index + Math.floor(random() * 3)) % 3,
    };
  });
}
