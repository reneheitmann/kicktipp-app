/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Kurzer Commit-Hash des Builds, per Docker-Build-Arg aus GitHub Actions
   *  gesetzt (siehe .github/workflows/docker-publish.yml). Lokal (`npm run
   *  dev`/`npm run build` ohne .env-Eintrag) leer – AboutPage zeigt dann
   *  "lokal" statt eines Hashes an. */
  readonly VITE_APP_COMMIT_SHA?: string
  /** Build-Zeitpunkt (ISO 8601), ebenfalls per Docker-Build-Arg gesetzt. */
  readonly VITE_APP_BUILD_DATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Aus package.json zur Build-Zeit eingesetzt, siehe vite.config.ts. */
declare const __APP_VERSION__: string
