interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly VITE_STATIC_EVIDENCE?: string;
  readonly VITE_MOLEVREN_WORKING_BRAND?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
