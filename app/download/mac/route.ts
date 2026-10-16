// ── GET /download/mac ─────────────────────────────────────────────────────
// A stable link for emails and docs. 302s to the CURRENT arm64 DMG, so the link
// never goes stale when a new version is published. The Location is built from
// the validated file name (lib/releases-parse.ts), never from the manifest. If
// the release can't be read, it sends people to /download instead of a dead end.

import { getLatestMac } from '@/lib/releases'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const release = await getLatestMac()

  if (!release) {
    return new Response(null, {
      status: 302,
      headers: { Location: new URL('/download', request.url).toString(), 'Cache-Control': 'no-store' }
    })
  }

  return new Response(null, {
    status: 302,
    headers: { Location: release.url, 'Cache-Control': 'public, max-age=60' }
  })
}
