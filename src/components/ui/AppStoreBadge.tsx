export const APP_STORE_URL = 'https://apps.apple.com/de/app/kicktipp-spielrundenverwaltung/id6804452098'

// Inline-Nachbau des offiziellen Apple "Download on the App Store"-Badges
// (schwarz, Original-Seitenverhältnis) - kein Bild-Asset/Lizenz nötig,
// entspricht Apples Marketing-Richtlinien für Entwickler-Links.
export function AppStoreBadge() {
  return (
    <svg viewBox="0 0 120 40" width="120" height="40" role="img" aria-hidden="true">
      <rect width="120" height="40" rx="6" fill="#000" />
      <path
        fill="#fff"
        d="M24.77 20.3c-.02-2.16 1.77-3.2 1.85-3.25-1.01-1.47-2.58-1.68-3.14-1.7-1.32-.14-2.6.79-3.27.79-.68 0-1.72-.77-2.84-.75-1.44.02-2.78.85-3.52 2.14-1.52 2.63-.39 6.51 1.08 8.64.73 1.04 1.58 2.2 2.71 2.16 1.09-.04 1.5-.7 2.82-.7 1.31 0 1.69.7 2.84.68 1.18-.02 1.92-1.05 2.63-2.1.83-1.2 1.17-2.37 1.19-2.43-.03-.01-2.28-.87-2.3-3.48Zm-2.16-6.4c.59-.72.99-1.71.88-2.7-.85.03-1.9.57-2.51 1.27-.55.63-1.03 1.65-.9 2.61.94.07 1.9-.48 2.53-1.18Z"
      />
      <text x="34" y="16.5" fill="#fff" fontFamily="-apple-system, sans-serif" fontSize="8.5">
        Download on the
      </text>
      <text x="34" y="28" fill="#fff" fontFamily="-apple-system, sans-serif" fontSize="14" fontWeight="600">
        App Store
      </text>
    </svg>
  )
}
