import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Eyebrow } from '@/components/marketing'
import { MacDownload } from '@/components/MacDownload'
import { detectOs, PLATFORMS } from '@/lib/downloads'
import { getLatestMac } from '@/lib/releases'
import { BRAND } from '@/lib/site'

export const metadata: Metadata = { title: 'Download' }

export default async function DownloadPage() {
  // No account needed. OS comes from the User-Agent, server-side.
  const os = detectOs((await headers()).get('user-agent'))
  // Cached ~5 minutes; null (never an exception) when unavailable or invalid.
  const release = await getLatestMac()
  const mac = PLATFORMS.find((p) => p.key === 'mac')!
  const soon = PLATFORMS.filter((p) => p.status === 'soon')
  const visitorPlatform = PLATFORMS.find((p) => p.key === os)

  return (
    <div className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
      <div className="text-center">
        <Eyebrow>Download</Eyebrow>
        <h1 className="text-display font-extrabold text-ink">Get {BRAND}.</h1>
        <p className="mx-auto mt-6 max-w-md text-[16px] leading-relaxed text-muted">
          Free, no account needed. Sign in only if you want Cloud &amp; Mobile later.
        </p>
      </div>

      {/* Windows/Linux visitors still get the macOS download, plus a note. */}
      {visitorPlatform && visitorPlatform.status === 'soon' && (
        <p className="mx-auto mt-8 max-w-md text-center text-[14px] text-ink-2" role="note">
          {visitorPlatform.label} is coming soon. {BRAND} is available for macOS today.
        </p>
      )}
      {os === 'mobile' && (
        <p className="mx-auto mt-8 max-w-md text-center text-[14px] text-ink-2" role="note">
          {BRAND} is a desktop app — open this page on your computer to download it.
        </p>
      )}

      <section aria-labelledby="mac-heading" className="mt-10 rounded-3xl bg-surface p-8 text-center shadow-lift">
        <h2 id="mac-heading" className="text-[20px] font-bold text-ink">
          {mac.label}
        </h2>
        <MacDownload release={release} />
      </section>

      <section aria-label="Other platforms" className="mt-4 grid gap-4 sm:grid-cols-2">
        {soon.map((p) => (
          <div key={p.key} className="flex items-center justify-between gap-4 rounded-3xl bg-surface px-6 py-5">
            <h2 className="text-[16px] font-semibold text-ink">{p.label}</h2>
            <span className="rounded-full bg-surface-3 px-3 py-1 text-[12px] font-medium text-ink-2">
              Coming soon
            </span>
          </div>
        ))}
      </section>

      {/* TODO(downloads): older versions. latest.json holds only the latest release, so a
          versions index (or a listing endpoint) is needed first. */}
    </div>
  )
}
