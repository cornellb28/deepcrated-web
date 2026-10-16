// ── macOS release lookup (server only) ────────────────────────────────────
// Fetches mac/latest.json from the public release bucket named by
// RELEASES_BASE_URL (a plain, non-secret value) and turns it into something
// safe to render. NEVER throws: any failure returns null and the page shows
// its disabled "Download coming soon" state.
//
// Only that one base is ever fetched, redirects are refused, the body is
// size-capped, and the download URL is built from the validated file name,
// never from the JSON. See lib/releases-parse.ts.

import 'server-only'
import {
  downloadUrl,
  latestJsonUrl,
  MAX_LATEST_JSON_BYTES,
  normalizeBaseUrl,
  parseLatestText,
  pickFile,
  type ReleaseFile
} from './releases-parse'

export interface MacRelease {
  version: string
  releasedAt: string | null
  notes: string | null
  file: ReleaseFile
  url: string
}

const REVALIDATE_SECONDS = 300
const TIMEOUT_MS = 3000

function warn(reason: string) {
  // Reason only. No keys exist here, and the URL is not secret, but it is not needed.
  console.warn(`[releases] ${reason}`)
}

export async function getLatestMac(): Promise<MacRelease | null> {
  try {
    const raw = process.env.RELEASES_BASE_URL
    if (!raw) {
      warn('RELEASES_BASE_URL is not set')
      return null
    }
    const base = normalizeBaseUrl(raw)
    if (!base) {
      warn('RELEASES_BASE_URL is not an https URL on an allowed host')
      return null
    }

    const res = await fetch(latestJsonUrl(base), {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'error',
      headers: { Accept: 'application/json' }
    })
    if (!res.ok) {
      warn(`latest.json responded ${res.status}`)
      return null
    }
    const declared = Number(res.headers.get('content-length') ?? 0)
    if (declared > MAX_LATEST_JSON_BYTES) {
      warn('latest.json is too large')
      return null
    }

    const release = parseLatestText(await res.text())
    if (!release) {
      warn('latest.json failed validation')
      return null
    }
    const file = pickFile(release, 'arm64')
    if (!file) {
      warn('latest.json has no valid arm64 file')
      return null
    }

    return {
      version: release.version,
      releasedAt: release.releasedAt,
      notes: release.notes,
      file,
      url: downloadUrl(base, file)
    }
  } catch (err) {
    warn(`fetch failed: ${(err as Error).name}`)
    return null
  }
}
