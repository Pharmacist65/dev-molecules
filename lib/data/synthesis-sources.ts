import type { SourceId, SourceReference } from "../domain";

/** Real pending synthesis sources and locators are private review inputs. */
export const synthesisSourceRegistry: readonly SourceReference[] = [];

export const synthesisSourceById: ReadonlyMap<SourceId, SourceReference> =
  new Map();
