// ── Release manifest: validation and URL building ─────────────────────────
// Pure (no env, no network, no `server-only`) so every rule is unit-tested.
//
// The manifest (mac/latest.json on a public Backblaze B2 bucket) is treated as
// UNTRUSTED input. Only whitelisted fields survive parsing, a file is accepted
// only if its name matches the strict pattern, and a download URL is ALWAYS
// built as `${base}/mac/${validatedName}`. A `url` (or any other) field in the
// JSON is never read.

// The only host suffix a RELEASES_BASE_URL may have. To serve downloads from a
// custom domain later, change this one constant (and nothing else).
export const ALLOWED_RELEASE_HOST_SUFFIX = '.backblazeb2.com'

export const MAX_LATEST_JSON_BYTES = 16 * 1024
export const MAX_NOTES_CHARS = 2000
const MAX_FILES_SCANNED = 10
const MAX_FILE_BYTES = 4_000_000_000 // sanity bound, not a product limit

export type Arch = 'arm64' | 'x64'

export interface ReleaseFile {
  arch: Arch
  name: string
  sha256: string
  size: number
}

export interface Release {
  version: string
  releasedAt: string | null // ISO string, or null if missing/invalid
  notes: string | null
  files: ReleaseFile[]
}

const VERSION_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const FILE_NAME_RE = /^DeepCrated-(\d+\.\d+\.\d+)-(arm64|x64)\.dmg$/
const SHA256_RE = /^[0-9a-f]{64}$/
const SAFE_PATH_RE = /^\/[A-Za-z0-9._~/-]*$/

// ── base URL ─────────────────────────────────────────────────────────────
// https only, no credentials, port, query or hash, and the host must end in
// ALLOWED_RELEASE_HOST_SUFFIX with at least one label in front of it. Returns
// the base without a trailing slash, or null (treat as "unavailable").
export function normalizeBaseUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (!value || value.length > 300) return null
  // new URL() silently resolves "/a/../b" to "/b", so dot-segments must be
  // refused on the raw string, before parsing.
  if (/\/\.\.?(\/|$|\?|#)/.test(value)) return null

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  if (url.protocol !== 'https:') return null
  if (url.username || url.password || url.port || url.search || url.hash) return null

  const host = url.hostname.toLowerCase()
  if (!host.endsWith(ALLOWED_RELEASE_HOST_SUFFIX) || host.length <= ALLOWED_RELEASE_HOST_SUFFIX.length) return null
  if (!/^[a-z0-9.-]+$/.test(host)) return null

  const path = url.pathname.replace(/\/+$/, '')
  if (path && !SAFE_PATH_RE.test(path)) return null
  if (path.includes('//')) return null

  return `https://${host}${path}`
}

export function latestJsonUrl(base: string): string {
  return `${base}/mac/latest.json`
}

// ── manifest ─────────────────────────────────────────────────────────────
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function parseFile(raw: unknown, version: string): ReleaseFile | null {
  if (!isRecord(raw)) return null
  const { arch, name, sha256, size } = raw
  if (arch !== 'arm64' && arch !== 'x64') return null
  if (typeof name !== 'string') return null
  const m = FILE_NAME_RE.exec(name)
  if (!m) return null
  if (m[1] !== version || m[2] !== arch) return null // name must agree with the manifest
  if (typeof sha256 !== 'string' || !SHA256_RE.test(sha256)) return null
  if (typeof size !== 'number' || !Number.isInteger(size) || size <= 0 || size > MAX_FILE_BYTES) return null
  return { arch, name, sha256, size }
}

function cleanNotes(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  // Oversized notes are dropped, not truncated: a cut-off sentence is worse.
  if (raw.length > MAX_NOTES_CHARS) return null
  const text = raw.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim()
  return text || null
}

function cleanDate(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 40) return null
  const t = Date.parse(raw)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

// Returns null when there is nothing safe to offer (bad version, or no file
// survives validation). Extra fields anywhere are ignored.
export function parseLatest(input: unknown): Release | null {
  if (!isRecord(input)) return null
  const { version, files } = input
  if (typeof version !== 'string' || !VERSION_RE.test(version)) return null
  if (!Array.isArray(files)) return null

  const valid: ReleaseFile[] = []
  for (const f of files.slice(0, MAX_FILES_SCANNED)) {
    const file = parseFile(f, version)
    if (file) valid.push(file)
  }
  if (valid.length === 0) return null

  return { version, releasedAt: cleanDate(input.released_at), notes: cleanNotes(input.notes), files: valid }
}

export function parseLatestText(text: string): Release | null {
  if (text.length > MAX_LATEST_JSON_BYTES) return null
  try {
    return parseLatest(JSON.parse(text))
  } catch {
    return null
  }
}

export function pickFile(release: Release, arch: Arch = 'arm64'): ReleaseFile | null {
  return release.files.find((f) => f.arch === arch) ?? null
}

// The only way a download URL is made: base + mac/ + a name that passed
// FILE_NAME_RE. Throws if handed an unvalidated name.
export function downloadUrl(base: string, file: Pick<ReleaseFile, 'name'>): string {
  if (!FILE_NAME_RE.test(file.name)) throw new Error('downloadUrl: file name is not a validated DeepCrated dmg name')
  return `${base}/mac/${file.name}`
}

// Decimal megabytes (what Finder shows), one decimal place.
export function formatMegabytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}
