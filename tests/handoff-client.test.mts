// Run: node --test tests/*.test.mts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HANDOFF_CLIENTS,
  authCallbackBase,
  connectPath,
  parseClient
} from '../lib/handoff-client.ts'
import { safeNext } from '../lib/safe-next.ts'

const challenge = 'A'.repeat(43)
const state = 'B'.repeat(43)

test('the client-to-scheme map is fixed: desktop cratecloud, mobile deepcrated', () => {
  assert.equal(authCallbackBase('desktop'), 'cratecloud://auth-callback')
  assert.equal(authCallbackBase('mobile'), 'deepcrated://auth-callback')
  assert.deepEqual([...HANDOFF_CLIENTS], ['desktop', 'mobile'])
})

test('client=mobile is mobile; everything else is desktop', () => {
  assert.equal(parseClient('mobile'), 'mobile')
  assert.equal(parseClient('desktop'), 'desktop')
  for (const v of [undefined, null, '', 'MOBILE', 'Mobile', ' mobile', 'mobile ', 'ios', 'android', 'desktop2',
    ['mobile'], ['mobile', 'desktop'], ['desktop', 'mobile'], 1, true, {}]) {
    assert.equal(parseClient(v), 'desktop', JSON.stringify(v))
  }
})

test('the scheme never comes from a URL parameter', () => {
  const hostile = ['evil://auth-callback', 'javascript:alert(1)', 'https://evil.example', 'cratecloud', 'deepcrated://x']
  for (const v of hostile) {
    // A hostile value is never mobile, so it maps to the desktop scheme only,
    // and the output is always one of the two fixed bases.
    const base = authCallbackBase(parseClient(v))
    assert.ok(['cratecloud://auth-callback', 'deepcrated://auth-callback'].includes(base), v)
    assert.equal(base, 'cratecloud://auth-callback', v)
  }
})

test('the connect path carries client=mobile and leaves desktop links unchanged', () => {
  assert.equal(
    connectPath({ challenge, state, client: 'desktop' }),
    `/desktop/connect?challenge=${challenge}&state=${state}`
  )
  assert.equal(
    connectPath({ challenge, state, client: 'mobile' }),
    `/desktop/connect?challenge=${challenge}&state=${state}&client=mobile`
  )
})

// What the page does for a signed-out visitor: /login?next=<connect path>.
// Email links and Google then go through /auth/callback?next=<same value>.
// Both hops read `next` and pass it through safeNext.
function afterLogin(client: 'desktop' | 'mobile') {
  const here = connectPath({ challenge, state, client })
  const loginUrl = new URL(`https://site.test/login?next=${encodeURIComponent(here)}`)
  const nextOnLogin = safeNext(loginUrl.searchParams.get('next'))
  const callbackUrl = new URL(`https://site.test/auth/callback?next=${encodeURIComponent(nextOnLogin)}`)
  return safeNext(callbackUrl.searchParams.get('next'))
}

test('client survives the login and OAuth/email redirects', () => {
  for (const client of ['mobile', 'desktop'] as const) {
    const landed = afterLogin(client)
    assert.equal(landed, connectPath({ challenge, state, client }))
    const url = new URL(`https://site.test${landed}`)
    assert.equal(url.pathname, '/desktop/connect')
    assert.equal(url.searchParams.get('challenge'), challenge)
    assert.equal(url.searchParams.get('state'), state)
    assert.equal(parseClient(url.searchParams.get('client') ?? undefined), client)
  }
})

test('a client smuggled into the return path still cannot choose a scheme', () => {
  // An attacker-supplied client value is re-normalised by the page on return.
  const landed = new URL(`https://site.test/desktop/connect?challenge=${challenge}&state=${state}&client=evil%3A%2F%2Fx`)
  assert.equal(authCallbackBase(parseClient(landed.searchParams.get('client') ?? undefined)), 'cratecloud://auth-callback')
})
