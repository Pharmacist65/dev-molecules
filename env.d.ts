interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly VITE_STATIC_EVIDENCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
