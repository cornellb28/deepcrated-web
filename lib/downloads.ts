// ── Desktop platforms ─────────────────────────────────────────────────────
// Which platforms exist and whether each is available. The macOS download URL,
// version and notes are NOT here: they come from the release manifest on
// Backblaze B2 (lib/releases.ts). Windows and Linux are 'soon': no build, no
// button. Flip `status` when a build exists.

export type OsKey = 'mac' | 'windows' | 'linux'

export interface Platform {
  key: OsKey
  label: string
  status: 'available' | 'soon'
}

export const PLATFORMS: Platform[] = [
  { key: 'mac', label: 'macOS', status: 'available' },
  { key: 'windows', label: 'Windows', status: 'soon' },
  { key: 'linux', label: 'Linux', status: 'soon' }
]

// Server-side, from the User-Agent header, so the right content is in the
// first HTML with no client-side flash. 'other' = unknown.
export function detectOs(userAgent: string | null): OsKey | 'mobile' | 'other' {
  const ua = userAgent ?? ''
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return 'mobile'
  if (/Windows/i.test(ua)) return 'windows'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'mac'
  if (/Linux|X11|CrOS/i.test(ua)) return 'linux'
  return 'other'
}
