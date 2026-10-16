// ── Where this site lives ─────────────────────────────────────────────────
// Stripe's success_url / cancel_url / return_url must be absolute, and they
// must be RIGHT — a production checkout that redirects to a preview URL is a
// bug nobody notices until a customer reports it.
//
// NEXT_PUBLIC_SITE_URL wins. VERCEL_URL is the preview fallback only: on a
// production deployment it is the deployment's own generated hostname, not
// the custom domain, so relying on it in production sends buyers to a URL
// they have never seen.

// BRAND: the product name. Change this one line if it ever changes. User-facing
// copy should read it from here rather than repeating the string. (Not for the
// protocol scheme, repo names, env vars, table names or Stripe identifiers.)
export const BRAND = 'DeepCrated'

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// The desktop deep link. Registered by the Electron app via
// app.setAsDefaultProtocolClient('deepcrated') and declared in
// electron-builder.yml, so a packaged build on any OS answers it.
export const DESKTOP_CHECKOUT_CALLBACK = 'deepcrated://checkout-complete'

// Where /desktop/connect sends the one-time key depends on the client (desktop
// or mobile) and lives in lib/handoff-client.ts, not here.

// Contact / notify-me address. TODO(waitlist): a real waitlist needs a table
// (ask before creating one); until then the Cloud & Mobile notify-me button
// is a mailto to this address. Unset => the button renders disabled.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? null
