// WCAG-Kontrastberechnung (relative Luminanz + Kontrastverhältnis nach der
// offiziellen Formel, siehe
// https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) – für
// die admin-konfigurierbare Primärfarbe (siehe AppSettingsPage.tsx), die der
// ursprüngliche Kontrast-Audit in DESIGN.md naturgemäß nicht abdecken kann,
// da sie zur Laufzeit frei wählbar ist.

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '')
  const int = parseInt(normalized, 16)
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
}

function srgbChannelToLinear(channel255: number): number {
  const c = channel255 / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * srgbChannelToLinear(r) + 0.7152 * srgbChannelToLinear(g) + 0.0722 * srgbChannelToLinear(b)
}

/** Kontrastverhältnis zweier Farben (1 bis 21), unabhängig davon welche der
 * beiden Vorder-/Hintergrund ist. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA)
  const lB = relativeLuminance(hexB)
  const lighter = Math.max(lA, lB)
  const darker = Math.min(lA, lB)
  return (lighter + 0.05) / (darker + 0.05)
}

/** true, wenn `hex` ein vollständiger #rrggbb-Wert ist (der Farbwähler in
 * AppSettingsPage.tsx erlaubt während des Tippens auch kürzere/ungültige
 * Zwischenstände im Textfeld) – nur dann macht eine Kontrastprüfung Sinn. */
export function isFullHexColor(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex)
}
