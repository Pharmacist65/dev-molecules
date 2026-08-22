import type { CatalogBrowseNavigator } from "@/lib/application/catalog-browse";
import type { CatalogNormalizedEntity } from "@/lib/catalog";
import type { MoleculeUniverseProps } from "@/components/universe";

export interface AtlasCatalogNavigator extends CatalogBrowseNavigator {
  /** Entity hydration is used only by an intersecting 2D thumbnail. */
  hydrate(entityId: string): Promise<CatalogNormalizedEntity | null>;
}

export interface AtlasSpatialConfiguration {
  readonly universe: MoleculeUniverseProps;
  readonly catalogCount: number;
}
