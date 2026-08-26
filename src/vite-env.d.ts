/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Kurzer Commit-Hash des Builds, per Docker-Build-Arg aus GitHub Actions
   *  gesetzt (siehe .github/workflows/docker-publish.yml), bzw. per
   *  "git rev-parse --short HEAD" von "npm run build:mobile" (package.json).
   *  Lokal (`npm run dev`/`npm run build` ohne .env-Eintrag) leer –
   *  AboutPage zeigt dann "lokal" statt eines Hashes an. */
  readonly VITE_APP_COMMIT_SHA?: string
  /** Build-Zeitpunkt (ISO 8601), ebenfalls per Docker-Build-Arg bzw. für
   *  mobile per "npm run build:mobile" gesetzt. */
  readonly VITE_APP_BUILD_DATE?: string
  /** "production", "beta" oder "dev", je nach Branch/Ziel von GitHub Actions
   *  gesetzt (siehe .github/workflows/docker-publish.yml, deploy-dev.yml).
   *  "mobile" wird stattdessen lokal von "npm run build:mobile" gesetzt
   *  (siehe package.json) – kein CI-Job dafür. Lokal ohne einen der beiden
   *  (z. B. "npm run dev") leer – AppShell zeigt dann keine
   *  Kanal-Kennzeichnung an. */
  readonly VITE_APP_CHANNEL?: string
  /** Base64-codiertes JSON-Array der letzten 10 Versionen samt
   *  Commit-Betreffzeilen (siehe .github/scripts/generate-changelog.cjs),
   *  per Docker-Build-Arg aus GitHub Actions bzw. für mobile per
   *  "npm run build:mobile" gesetzt. Base64 statt roher Einbettung, da
   *  Build-Args/Shell nur einzeilige Werte erlauben und Commit-Nachrichten
   *  Anführungszeichen enthalten können. AboutPage.tsx decodiert wieder.
   *  Lokal leer. */
  readonly VITE_APP_CHANGELOG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Aus package.json zur Build-Zeit eingesetzt, siehe vite.config.ts. */
declare const __APP_VERSION__: string
