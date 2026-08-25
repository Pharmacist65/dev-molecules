export const MOLEVREN_WORKING_BRAND_FLAG = "molevren-working-brand" as const;

export const MOLEVREN_BRAND = {
  status: "working-brand",
  publicName: "Molevren",
  wordmarkName: "MOLEVREN",
  descriptor: {
    en: "Pharmaceutical Molecular Atlas & Academy",
    tr: "Farmasötik Moleküler Atlas ve Akademi",
  },
  line: "STRUCTURE. MOTION. KNOWLEDGE.",
  technicalPlatform: "Dev Molecules",
  colors: {
    orange: "#FF8A00",
    parliamentBlue: "#0A3D91",
    deepNavy: "#0B1324",
    midnight: "#050A16",
    softIvory: "#F6F1E8",
    paperIvory: "#FFFDF7",
  },
  assets: {
    symbolFlat: "brand/molevren-symbol-flat.svg",
    symbolMetallic: "brand/molevren-symbol-metallic.svg",
    wordmark: "brand/molevren-wordmark.svg",
    headerDark: "brand/molevren-header-lockup-dark.svg",
    horizontalLight: "brand/molevren-lockup-horizontal-light.svg",
    horizontalDark: "brand/molevren-lockup-horizontal-dark.svg",
    stackedLight: "brand/molevren-lockup-stacked-light.svg",
    stackedDark: "brand/molevren-lockup-stacked-dark.svg",
    monochromeDark: "brand/molevren-monochrome-dark.svg",
    monochromeLight: "brand/molevren-monochrome-light.svg",
    favicon: "brand/molevren-favicon.svg",
    maskIcon: "brand/molevren-mask-icon.svg",
    socialCard: "brand/molevren-og-1200x630.png",
    socialSquare: "brand/molevren-social-square-1080.png",
  },
} as const;

export type MolevrenBrandAsset = keyof typeof MOLEVREN_BRAND.assets;

export function getMolevrenAssetUrl(
  basePath: string,
  asset: MolevrenBrandAsset,
): string {
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return `${normalizedBase}${MOLEVREN_BRAND.assets[asset]}`;
}
