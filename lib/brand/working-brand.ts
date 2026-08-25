import { MOLEVREN_WORKING_BRAND_FLAG } from "./molevren-brand";

export const MOLEVREN_WORKING_BRAND_STORAGE_KEY =
  "dev-molecules:molevren-working-brand:v1" as const;

export type WorkingBrandMode = "molevren" | "dev-molecules";

const compiledWorkingBrand = import.meta.env.VITE_MOLEVREN_WORKING_BRAND;

export const DEFAULT_WORKING_BRAND_MODE: WorkingBrandMode =
  compiledWorkingBrand === "off" ? "dev-molecules" : "molevren";

export function resolveWorkingBrandMode({
  search = "",
  storedPreference,
}: {
  readonly search?: string;
  readonly storedPreference?: string | null;
} = {}): WorkingBrandMode {
  const queryMode = new URLSearchParams(search).get(MOLEVREN_WORKING_BRAND_FLAG);
  if (queryMode === "off" || queryMode === "dev-molecules") return "dev-molecules";
  if (queryMode === "on" || queryMode === "molevren") return "molevren";
  if (storedPreference === "dev-molecules" || storedPreference === "molevren") {
    return storedPreference;
  }
  return DEFAULT_WORKING_BRAND_MODE;
}
