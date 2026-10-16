// ── Which app is asking to sign in ────────────────────────────────────────
// /desktop/connect serves both apps. `?client=desktop|mobile` says which one
// started the flow; the callback scheme comes from the FIXED map below and
// never from a URL parameter, so a crafted link cannot point the one-time key
// at an arbitrary scheme. Contract v4.2 (deepcrated-account-contract):
//
//   desktop -> cratecloud://auth-callback?key=...&state=...   (legacy scheme,
//              kept so already-installed desktop builds keep working)
//   mobile  -> deepcrated://auth-callback?key=...&state=...
//
// Each app accepts only its own scheme. Never reuse one in the other.

export const HANDOFF_CLIENTS = ['desktop', 'mobile'] as const
export type HandoffClient = (typeof HANDOFF_CLIENTS)[number]

const CALLBACK_SCHEMES: Readonly<Record<HandoffClient, string>> = {
  desktop: 'cratecloud',
  mobile: 'deepcrated'
}

const AUTH_CALLBACK_AUTHORITY = 'auth-callback'

// Exact, case-sensitive match on 'mobile'. Anything else, including a missing
// value, a repeated param (an array), different casing or padding, falls back
// to desktop. Never echo the raw value anywhere.
export function parseClient(raw: unknown): HandoffClient {
  return raw === 'mobile' ? 'mobile' : 'desktop'
}

// Scheme + authority only; the caller appends ?key=...&state=...
export function authCallbackBase(client: HandoffClient): string {
  return `${CALLBACK_SCHEMES[client]}://${AUTH_CALLBACK_AUTHORITY}`
}

// The URL a signed-out visitor is sent back to after login or signup (it goes
// through `next`, and so through safeNext). It carries the normalised client,
// so the return lands on the same connect request. Desktop is the default and
// stays out of the URL, which keeps existing desktop links unchanged.
export function connectPath({
  challenge,
  state,
  client
}: {
  challenge: string
  state: string
  client: HandoffClient
}): string {
  const base = `/desktop/connect?challenge=${challenge}&state=${state}`
  return client === 'desktop' ? base : `${base}&client=${client}`
}
