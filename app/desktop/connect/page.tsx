// ── /desktop/connect ──────────────────────────────────────────────────────
// An app opens this in the system browser with ?challenge&state
// (&mode=signup, &client=desktop|mobile, default desktop). Signed out: through /login and back to THIS exact URL, for
// email and Google alike (the existing `next` plumbing carries it). Signed in:
// ask before handing the session to the app.

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DesktopConnect } from '@/components/DesktopConnect'
import { Card, Notice } from '@/components/ui'
import { getUser } from '@/lib/auth'
import { BRAND } from '@/lib/site'
import { CHALLENGE_RE } from '@/lib/desktop-handoff'
import { authCallbackBase, connectPath, parseClient } from '@/lib/handoff-client'

export const metadata: Metadata = { title: `Connect ${BRAND}`, robots: { index: false } }

const STATE_RE = /^[A-Za-z0-9_-]{16,128}$/

export default async function DesktopConnectPage({
  searchParams
}: {
  searchParams: Promise<{ challenge?: string; state?: string; mode?: string; client?: string | string[] }>
}) {
  const { challenge, state, mode, client: rawClient } = await searchParams
  // Fixed map, never a URL parameter: unknown or missing values mean desktop.
  const client = parseClient(rawClient)

  if (!challenge || !state || !CHALLENGE_RE.test(challenge) || !STATE_RE.test(state)) {
    return (
      <div className="mx-auto max-w-sm px-6 py-20">
        <Card>
          <Notice>This sign-in link isn’t valid. Go back to the {BRAND} app and try again.</Notice>
        </Card>
      </div>
    )
  }

  // Carries the normalised client, so login and signup return to this same request.
  const here = connectPath({ challenge, state, client })
  const user = await getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(here)}${mode === 'signup' ? '&mode=signup' : ''}`)
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <Card>
        <DesktopConnect
          email={user.email ?? ''}
          emailConfirmed={!!user.email_confirmed_at}
          challenge={challenge}
          state={state}
          callbackBase={authCallbackBase(client)}
          loginHref={`/login?next=${encodeURIComponent(here)}`}
        />
      </Card>
    </div>
  )
}
