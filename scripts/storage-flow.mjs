// Manual end-to-end test of the B2 storage routes, against a PREVIEW deployment.
//
//   node scripts/storage-flow.mjs https://<preview-url>
//
// It reads .env.local itself, so no --env-file flag (or Node 20.6+) is needed.
// Needs (from .env.local): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY. If the Preview sits behind Vercel Deployment
// Protection, also set VERCEL_AUTOMATION_BYPASS_SECRET (a "Protection Bypass for
// Automation" secret from the project settings); it is sent as a header and
// never printed.
//
// What it does (writes data, so run it deliberately):
//   1. creates a THROWAWAY Supabase user (storage-test-<ts>@example.com) and gives
//      its entitlements row plan "sync" (10 GB), status "active"
//   2. file A: upload-url -> PUT -> complete -> upload-url again (already_stored)
//      -> download-url -> GET (checksum compared) -> delete "hide" -> download-url (404)
//   3. file B: upload-url -> PUT -> complete -> delete "purge" -> download-url (404)
//   4. a few negative checks (no auth, bad type, too large)
//   5. deletes the throwaway user (storage rows cascade). Objects hidden in B2 by
//      step 2 stay until your 14-day lifecycle rule removes them.
//
// Output: step names, HTTP status codes and error/status codes only. It never
// prints tokens, keys, passwords or signed URLs. It refuses to run against
// Production hosts.

import { createHash, randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// Minimal .env.local loader (no dependency, no Node version requirement).
// Values already in the environment win. Nothing read here is ever printed.
if (existsSync('.env.local')) {
  for (const raw of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = raw.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!m || m[1].startsWith('#')) continue
    let v = m[2]
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1)
    if (process.env[m[1]] === undefined) process.env[m[1]] = v
  }
}

const base = (process.argv[2] ?? '').replace(/\/+$/, '')
if (!/^https:\/\//.test(base)) {
  console.error('usage: node scripts/storage-flow.mjs https://<preview-url>   (run from the repo root)')
  process.exit(2)
}
const host = new URL(base).hostname
if (host === 'deepcrated.com' || host === 'www.deepcrated.com') {
  console.error('refusing to run against Production')
  process.exit(2)
}

for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) {
    console.error(`missing env var: ${name}`)
    process.exit(2)
  }
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
})

const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
let token = null
let failures = 0

function line(step, status, detail = '') {
  console.log(`${String(status).padEnd(4)} ${step}${detail ? '  ' + detail : ''}`)
}
function expect(step, ok, detail) {
  if (!ok) failures++
  line(step, ok ? 'PASS' : 'FAIL', detail)
}

async function api(path, body, { auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth && token) headers.Authorization = `Bearer ${token}`
  if (bypass) headers['x-vercel-protection-bypass'] = bypass
  const res = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  let json = {}
  try {
    json = await res.json()
  } catch {
    /* non-JSON (e.g. a protection page) */
  }
  return { status: res.status, json, code: json?.error?.code ?? json?.status ?? '-' , url: json?.url }
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const makeFile = (size) => {
  const bytes = randomBytes(size)
  return { bytes, hash: sha256(bytes), size }
}

async function uploadAndComplete(label, file) {
  const up = await api('/api/storage/upload-url', { hash: file.hash, sizeBytes: file.size, contentType: 'audio/mpeg' })
  expect(`${label} upload-url`, up.status === 200 && up.code === 'upload', `http=${up.status} code=${up.code}`)
  if (!up.url) return false

  const put = await fetch(up.url, { method: 'PUT', headers: { 'Content-Type': 'audio/mpeg' }, body: file.bytes })
  expect(`${label} PUT to B2`, put.ok, `http=${put.status}`)
  if (!put.ok) return false

  const done = await api('/api/storage/complete', { hash: file.hash })
  expect(`${label} complete`, done.status === 200 && done.code === 'active', `http=${done.status} code=${done.code}`)
  return done.status === 200
}

async function main() {
  // ── throwaway user ──
  const email = `storage-test-${Date.now()}@example.com`
  const password = randomBytes(18).toString('base64url')
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error) throw new Error(`createUser failed: ${created.error.message}`)
  const userId = created.data.user.id
  line('throwaway user created', 'OK', `(${email})`)

  try {
    const ent = await admin.from('entitlements').upsert({ user_id: userId, plan: 'sync', status: 'active' }, { onConflict: 'user_id' })
    if (ent.error) throw new Error(`entitlement setup failed: ${ent.error.message}`)
    const signedIn = await anon.auth.signInWithPassword({ email, password })
    if (signedIn.error) throw new Error('sign-in failed')
    token = signedIn.data.session.access_token
    line('signed in, plan=sync', 'OK')

    // ── negative checks ──
    const noAuth = await api('/api/storage/upload-url', { hash: 'a'.repeat(64), sizeBytes: 10, contentType: 'audio/mpeg' }, { auth: false })
    expect('no auth', noAuth.status === 401 && noAuth.code === 'UNAUTHENTICATED', `http=${noAuth.status} code=${noAuth.code}`)
    const badType = await api('/api/storage/upload-url', { hash: 'b'.repeat(64), sizeBytes: 10, contentType: 'application/zip' })
    expect('bad content type', badType.status === 415 && badType.code === 'UNSUPPORTED_TYPE', `http=${badType.status} code=${badType.code}`)
    const tooBig = await api('/api/storage/upload-url', { hash: 'c'.repeat(64), sizeBytes: 5_000_000_000, contentType: 'audio/mpeg' })
    expect('file too large', tooBig.status === 413 && tooBig.code === 'FILE_TOO_LARGE', `http=${tooBig.status} code=${tooBig.code}`)

    // ── file A: upload, dedupe, download, hide ──
    const A = makeFile(256 * 1024)
    if (await uploadAndComplete('A', A)) {
      const again = await api('/api/storage/upload-url', { hash: A.hash, sizeBytes: A.size, contentType: 'audio/mpeg' })
      expect('A upload-url again (dedupe)', again.status === 200 && again.code === 'already_stored', `http=${again.status} code=${again.code}`)

      const dl = await api('/api/storage/download-url', { hash: A.hash })
      expect('A download-url', dl.status === 200 && Boolean(dl.url), `http=${dl.status}`)
      if (dl.url) {
        const got = await fetch(dl.url)
        const body = Buffer.from(await got.arrayBuffer())
        expect('A GET from B2 (checksum matches)', got.ok && sha256(body) === A.hash, `http=${got.status}`)
      }

      const hide = await api('/api/storage/delete', { hash: A.hash, mode: 'hide' })
      expect('A delete mode=hide', hide.status === 200 && hide.code === 'hidden', `http=${hide.status} code=${hide.code}`)
      const afterHide = await api('/api/storage/download-url', { hash: A.hash })
      expect('A download-url after hide', afterHide.status === 404 && afterHide.code === 'NOT_FOUND', `http=${afterHide.status} code=${afterHide.code}`)
    }

    // ── file B: upload, purge ──
    const B = makeFile(128 * 1024)
    if (await uploadAndComplete('B', B)) {
      const purge = await api('/api/storage/delete', { hash: B.hash, mode: 'purge' })
      expect('B delete mode=purge', purge.status === 200 && purge.code === 'purged', `http=${purge.status} code=${purge.code}`)
      const afterPurge = await api('/api/storage/download-url', { hash: B.hash })
      expect('B download-url after purge', afterPurge.status === 404 && afterPurge.code === 'NOT_FOUND', `http=${afterPurge.status} code=${afterPurge.code}`)
    }

    // ── accounting returned to zero ──
    const usage = await admin.from('storage_usage').select('used_bytes, reserved_bytes').eq('user_id', userId).maybeSingle()
    expect('usage back to 0 used / 0 reserved', usage.data?.used_bytes === 0 && usage.data?.reserved_bytes === 0, `used=${usage.data?.used_bytes} reserved=${usage.data?.reserved_bytes}`)
  } finally {
    const del = await admin.auth.admin.deleteUser(userId)
    line('throwaway user deleted', del.error ? 'FAIL' : 'OK')
    if (del.error) failures++
  }
}

try {
  await main()
} catch (err) {
  failures++
  console.error('ABORTED:', err.message) // messages here never contain keys or URLs
}
console.log(failures === 0 ? '\nALL STEPS PASSED' : `\n${failures} STEP(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
