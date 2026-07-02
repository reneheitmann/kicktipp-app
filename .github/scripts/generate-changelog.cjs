// Baut die Änderungsliste für die "Über"-Seite: die letzten 10 Versionen
// samt der Commit-Betreffzeilen, die zu jeder Version geführt haben.
//
// Versions-Historie kommt IMMER aus origin/main (dort passiert der einzige
// automatische Versions-Bump, siehe docker-publish.yml) – auch wenn dieser
// Build auf beta läuft, wo package.json nie gebumpt wird und beta zudem
// Mains spätere Bump-Commits nie zurückmergt, ihre Historie also unvollständig
// wäre. Der Workflow muss vor diesem Skript "git fetch origin main" ausführen,
// damit origin/main lokal auflösbar ist, egal welcher Branch gerade gebaut wird.
//
// Läuft NACH dem Versions-Bump-Schritt (nur main), damit
// require('../../package.json').version dort schon die Version dieses Builds
// ist (der zugehörige "chore: bump version"-Commit existiert zu diesem
// Zeitpunkt noch nicht – der aktuelle Build ist also der erste, "offene"
// Eintrag). Auf beta gibt es keine sinnvolle Versionsnummer für den offenen
// Eintrag, daher dort ein fester Platzhalter-Label.
//
// Ausgabe: ein einzeiliges JSON-Array auf stdout, vom Workflow base64-codiert
// als Docker-Build-Arg durchgereicht (roh eingebettet würden Anführungszeichen
// in Commit-Nachrichten sonst die YAML/Shell-Einbettung brechen). Wird von
// AboutPage.tsx wieder decodiert.

const { execSync } = require('node:child_process')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..', '..')
const branch = process.env.GITHUB_REF_NAME || 'main'

function git(args) {
  return execSync(`git ${args}`, { cwd: repoRoot, encoding: 'utf8' }).trim()
}

function commitSubjects(sinceHash, untilRef) {
  const cmd = sinceHash
    ? `log ${sinceHash}..${untilRef} --no-merges --format=%s`
    : `log ${untilRef} --no-merges --format=%s`
  const out = git(cmd)
  if (!out) return []
  return out
    .split('\n')
    .filter(Boolean)
    .filter((s) => !s.startsWith('chore: bump version'))
    .filter((s) => !s.startsWith('Merge '))
}

const bumpLogRaw = git("log origin/main --format='%H|%s' --grep='^chore: bump version to '")
const bumps = bumpLogRaw
  ? bumpLogRaw
      .split('\n')
      .map((line) => {
        const [hash, subject] = line.split('|')
        const match = subject.match(/chore: bump version to ([\d.]+)/)
        return match ? { hash, version: match[1] } : null
      })
      .filter(Boolean)
  : []

const entries = []

// Offener, noch nicht committeter Bump = die aktuell gebaute Version (nur auf
// main sinnvoll benennbar, siehe Kommentar oben).
const pendingVersion = branch === 'main' ? require(path.join(repoRoot, 'package.json')).version : 'Unveröffentlicht (Beta)'
entries.push({
  version: pendingVersion,
  changes: commitSubjects(bumps[0] ? bumps[0].hash : null, 'HEAD'),
})

for (let i = 0; i < bumps.length && entries.length < 10; i++) {
  const sinceHash = bumps[i + 1] ? bumps[i + 1].hash : null
  entries.push({ version: bumps[i].version, changes: commitSubjects(sinceHash, bumps[i].hash) })
}

const result = entries.filter((e) => e.changes.length > 0).slice(0, 10)

process.stdout.write(JSON.stringify(result))
