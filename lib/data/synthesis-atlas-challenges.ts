import type { SynthesisAtlasChallenge } from "../domain/synthesis-atlas";

/** Pending route-derived challenges remain in the private review layer. */
export const synthesisAtlasChallenges: readonly SynthesisAtlasChallenge[] = [];

export const synthesisAtlasChallengesByRouteId: ReadonlyMap<
  string,
  readonly SynthesisAtlasChallenge[]
> = new Map();
