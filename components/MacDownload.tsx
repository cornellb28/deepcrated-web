import { ButtonLink } from '@/components/ui'
import { UnnotarizedNote } from '@/components/UnnotarizedNote'
import type { MacRelease } from '@/lib/releases'
import { formatMegabytes } from '@/lib/releases-parse'

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

// The macOS card body. `release` is null when the manifest could not be read
// or failed validation: then the button is disabled and says why in text.
export function MacDownload({ release }: { release: MacRelease | null }) {
  if (!release) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          disabled
          aria-describedby="mac-unavailable"
          className="inline-flex cursor-not-allowed items-center justify-center rounded-full bg-accent px-8 py-3.5 text-[15px] font-semibold text-white opacity-50"
        >
          Download coming soon
        </button>
        <p id="mac-unavailable" className="max-w-sm text-[13px] text-ink-2">
          The macOS download isn’t available right now. Check back soon.
        </p>
      </div>
    )
  }

  const date = formatDate(release.releasedAt)

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <ButtonLink href={release.url} variant="pillLg">
        Download for macOS
      </ButtonLink>
      <p className="text-[13px] font-medium text-ink-2">Apple Silicon (M1 or later) only</p>
      <p className="text-[13px] text-muted">
        Version {release.version} · {formatMegabytes(release.file.size)}
        {date ? ` · Released ${date}` : ''}
      </p>

      <UnnotarizedNote />

      {release.notes && (
        <div className="mt-2 w-full max-w-md text-left">
          <h3 className="text-[13px] font-semibold text-ink">Release notes</h3>
          {/* Plain text only: React escapes it, newlines are kept. */}
          <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-muted">{release.notes}</p>
        </div>
      )}

      <details className="w-full max-w-md text-left text-[13px] text-muted">
        <summary className="cursor-pointer font-medium text-ink-2">Verify the download</summary>
        <p className="mt-2">SHA-256 checksum of {release.file.name}:</p>
        <code className="mt-1 block break-all rounded-lg bg-surface-3 px-3 py-2 font-mono text-[12px] text-ink-2">
          {release.file.sha256}
        </code>
        <p className="mt-2">
          In Terminal: <code className="font-mono text-ink-2">shasum -a 256 ~/Downloads/{release.file.name}</code>
        </p>
      </details>
    </div>
  )
}
