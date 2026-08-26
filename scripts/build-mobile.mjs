#!/usr/bin/env node
// Baut den mobile-Kanal (dist-mobile, siehe mobile/) mit denselben
// Diagnose-/Changelog-Metadaten wie main/beta (siehe AboutPage.tsx), statt
// wie bisher nur VITE_APP_CHANNEL zu setzen – ohne Commit-Hash/Build-Datum/
// Changelog zeigte die "Über"-Seite in der App "lokal" und keinerlei
// Änderungsverlauf an, obwohl der Build ein echter, aus main/beta gebauter
// war. Eigenes Node-Script statt Inline-Shell in package.json, um nicht auf
// `$(...)`-Befehlsersetzung (bash-spezifisch) angewiesen zu sein.

import { execFileSync } from 'node:child_process'

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

const commitSha = git(['rev-parse', '--short', 'HEAD'])
const buildDate = new Date().toISOString()
// Aktueller Branch statt fest "beta": mobile-Builds laufen typischerweise
// von beta (siehe docs/mobile-app.md), ein Store-Release-Build kann aber
// auch von main aus gebaut werden – generate-changelog.cjs kennt für jeden
// Nicht-main-Branch dieselbe "Unveröffentlicht"-Behandlung wie für beta.
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'])
const changelogJson = execFileSync('node', ['.github/scripts/generate-changelog.cjs', branch], { encoding: 'utf8' })
const changelog = Buffer.from(changelogJson, 'utf8').toString('base64')

execFileSync('npx', ['tsc', '-b'], { stdio: 'inherit' })
execFileSync('npx', ['vite', 'build', '--outDir', 'dist-mobile'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_APP_CHANNEL: 'mobile',
    VITE_APP_COMMIT_SHA: commitSha,
    VITE_APP_BUILD_DATE: buildDate,
    VITE_APP_CHANGELOG: changelog,
  },
})
