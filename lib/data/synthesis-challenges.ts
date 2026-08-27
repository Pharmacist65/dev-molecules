import type { SynthesisChallenge } from "../domain";

/** Route-derived challenges are published only after review and rights clearance. */
export const synthesisChallenges: readonly SynthesisChallenge[] = [];

export const synthesisChallengeById: ReadonlyMap<string, SynthesisChallenge> =
  new Map();
