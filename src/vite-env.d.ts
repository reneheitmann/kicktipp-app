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
  /** "production" oder "beta", je nach Branch von GitHub Actions gesetzt
   *  (siehe .github/workflows/docker-publish.yml). Lokal (ohne .env-Eintrag)
   *  leer – AppShell zeigt dann keine BETA-Kennzeichnung an. */
  readonly VITE_APP_CHANNEL?: string
  /** Commit-Betreffzeilen seit dem letzten Push auf diesen Branch, per
   *  Docker-Build-Arg aus GitHub Actions gesetzt – mit dem literalen
   *  2-Zeichen-Trenner "\n" (kein echter Zeilenumbruch, da Build-Args nur
   *  einzeilige Werte erlauben) statt Zeilenumbrüchen zusammengefügt.
   *  AboutPage.tsx splittet entsprechend wieder auf. Lokal leer. */
  readonly VITE_APP_CHANGELOG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Aus package.json zur Build-Zeit eingesetzt, siehe vite.config.ts. */
declare const __APP_VERSION__: string
