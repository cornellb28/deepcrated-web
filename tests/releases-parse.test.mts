// Run: node --test tests/*.test.mts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ALLOWED_RELEASE_HOST_SUFFIX,
  MAX_NOTES_CHARS,
  downloadUrl,
  formatMegabytes,
  latestJsonUrl,
  normalizeBaseUrl,
  parseLatest,
  parseLatestText,
  pickFile
} from '../lib/releases-parse.ts'

const HASH = '4f9a75e21cd381be126c3837bbabe3c9bafb2c0c1309717d1550d83c702af05d'
const BASE = 'https://deepcrated-release.s3.us-east-005.backblazeb2.com'

// Exactly what is published today.
const REAL = {
  version: '1.0.0',
  files: [{ arch: 'arm64', name: 'DeepCrated-1.0.0-arm64.dmg', sha256: HASH, size: 313818816 }],
  released_at: '2026-10-16T20:17:15.897Z',
  notes: 'First tester build.'
}
const withFile = (patch: Record<string, unknown>) => ({ ...REAL, files: [{ ...REAL.files[0], ...patch }] })

// ── valid JSON ────────────────────────────────────────────────────────────
test('the real latest.json parses', () => {
  const r = parseLatest(REAL)
  assert.ok(r)
  assert.equal(r.version, '1.0.0')
  assert.equal(r.releasedAt, '2026-10-16T20:17:15.897Z')
  assert.equal(r.notes, 'First tester build.')
  assert.deepEqual(r.files, [{ arch: 'arm64', name: 'DeepCrated-1.0.0-arm64.dmg', sha256: HASH, size: 313818816 }])
})

test('parseLatestText parses the JSON text, rejects garbage and oversized bodies', () => {
  assert.ok(parseLatestText(JSON.stringify(REAL)))
  assert.equal(parseLatestText('not json'), null)
  assert.equal(parseLatestText(''), null)
  assert.equal(parseLatestText('x'.repeat(20 * 1024)), null)
  assert.equal(parseLatestText('null'), null)
  assert.equal(parseLatestText('[]'), null)
})

// ── wrong version format ─────────────────────────────────────────────────
test('wrong version formats are rejected', () => {
  for (const bad of ['1.0', '1', 'v1.0.0', '1.0.0-beta', '1.0.0+build', '01.0.0', '1.0.x', '', ' 1.0.0', 100, null, undefined]) {
    assert.equal(parseLatest({ ...REAL, version: bad }), null, JSON.stringify(bad))
  }
})

// ── bad file name ────────────────────────────────────────────────────────
test('bad file names are dropped, and with no valid file the release is rejected', () => {
  for (const name of [
    '../DeepCrated-1.0.0-arm64.dmg',
    'DeepCrated-1.0.0-arm64.dmg/../../x',
    'deepcrated-1.0.0-arm64.dmg',
    'DeepCrated-1.0.0-arm64.zip',
    'DeepCrated-1.0.0-arm64.dmg ',
    'DeepCrated-1.0.0-arm64.dmg?x=1',
    'https://evil.example/DeepCrated-1.0.0-arm64.dmg',
    'DeepCrated-1.0-arm64.dmg',
    'DeepCrated-1.0.0-ppc.dmg',
    '/DeepCrated-1.0.0-arm64.dmg',
    'mac/DeepCrated-1.0.0-arm64.dmg',
    '',
    42
  ]) {
    assert.equal(parseLatest(withFile({ name })), null, JSON.stringify(name))
  }
})

test('one bad file does not hide a good one', () => {
  const r = parseLatest({
    ...REAL,
    files: [
      { arch: 'x64', name: '../evil.dmg', sha256: HASH, size: 10 },
      REAL.files[0]
    ]
  })
  assert.ok(r)
  assert.equal(r.files.length, 1)
  assert.equal(r.files[0].arch, 'arm64')
})

// ── name / version / arch mismatch ───────────────────────────────────────
test('file name must agree with the manifest version and arch', () => {
  assert.equal(parseLatest(withFile({ name: 'DeepCrated-0.9.0-arm64.dmg' })), null) // version mismatch
  assert.equal(parseLatest(withFile({ name: 'DeepCrated-1.0.1-arm64.dmg' })), null)
  assert.equal(parseLatest(withFile({ name: 'DeepCrated-1.0.0-x64.dmg' })), null) // arch mismatch (field says arm64)
  assert.equal(parseLatest(withFile({ arch: 'x64' })), null) // field says x64, name says arm64
  assert.equal(parseLatest(withFile({ arch: 'ia32' })), null)
})

// ── bad sha256 / size ────────────────────────────────────────────────────
test('bad sha256 values are rejected', () => {
  for (const sha256 of [HASH.toUpperCase(), HASH.slice(1), HASH + '0', 'g'.repeat(64), '', 'sha256:' + HASH, null, 5]) {
    assert.equal(parseLatest(withFile({ sha256 })), null, String(sha256).slice(0, 20))
  }
})

test('bad sizes are rejected', () => {
  for (const size of [0, -1, 1.5, '313818816', null, 5_000_000_000, NaN, Infinity]) {
    assert.equal(parseLatest(withFile({ size })), null, String(size))
  }
})

// ── extra url field ignored ──────────────────────────────────────────────
test('an extra url field (anywhere) is ignored and never reaches the output or the download URL', () => {
  const evil = 'https://evil.example/malware.dmg'
  const r = parseLatest({
    ...REAL,
    url: evil,
    download_url: evil,
    files: [{ ...REAL.files[0], url: evil, href: evil, path: '../x' }]
  })
  assert.ok(r)
  assert.equal(JSON.stringify(r).includes('evil.example'), false)
  assert.deepEqual(Object.keys(r.files[0]).sort(), ['arch', 'name', 'sha256', 'size'])
  const file = pickFile(r)!
  assert.equal(downloadUrl(BASE, file), `${BASE}/mac/DeepCrated-1.0.0-arm64.dmg`)
})

test('downloadUrl refuses an unvalidated name', () => {
  assert.throws(() => downloadUrl(BASE, { name: '../x.dmg' }), /validated/)
  assert.throws(() => downloadUrl(BASE, { name: 'https://evil.example/a.dmg' }), /validated/)
})

// ── oversized notes ──────────────────────────────────────────────────────
test('oversized notes are dropped but the release stays valid', () => {
  const r = parseLatest({ ...REAL, notes: 'a'.repeat(MAX_NOTES_CHARS + 1) })
  assert.ok(r)
  assert.equal(r.notes, null)
  assert.equal(parseLatest({ ...REAL, notes: 'a'.repeat(MAX_NOTES_CHARS) })?.notes?.length, MAX_NOTES_CHARS)
})

test('notes: non-strings dropped, control characters stripped, newlines kept', () => {
  assert.equal(parseLatest({ ...REAL, notes: { html: '<b>x</b>' } })?.notes, null)
  assert.equal(parseLatest({ ...REAL, notes: 42 })?.notes, null)
  assert.equal(parseLatest({ ...REAL, notes: 'line 1\nline 2\u0000\u0007' })?.notes, 'line 1\nline 2')
  assert.equal(parseLatest({ ...REAL, notes: '   ' })?.notes, null)
})

test('released_at: invalid dates become null, valid ones are normalised', () => {
  assert.equal(parseLatest({ ...REAL, released_at: 'yesterday' })?.releasedAt, null)
  assert.equal(parseLatest({ ...REAL, released_at: 5 })?.releasedAt, null)
  assert.equal(parseLatest({ ...REAL, released_at: undefined })?.releasedAt, null)
})

test('wrong top-level shapes are rejected', () => {
  for (const bad of [null, undefined, 'x', 5, [], { version: '1.0.0' }, { version: '1.0.0', files: 'nope' }, { version: '1.0.0', files: [] }]) {
    assert.equal(parseLatest(bad), null, JSON.stringify(bad))
  }
})

// ── base URL: non-backblaze host and friends ─────────────────────────────
test('the real bucket URL is accepted, with or without a trailing slash', () => {
  assert.equal(normalizeBaseUrl(BASE), BASE)
  assert.equal(normalizeBaseUrl(BASE + '/'), BASE)
  assert.equal(normalizeBaseUrl('  ' + BASE + '  '), BASE)
  assert.equal(normalizeBaseUrl('https://DeepCrated-Release.S3.us-east-005.BackBlazeB2.com'), BASE)
  assert.equal(latestJsonUrl(BASE), `${BASE}/mac/latest.json`)
})

test('a non-backblaze host is rejected', () => {
  for (const bad of [
    'https://evil.example',
    'https://deepcrated.com',
    'https://backblazeb2.com', // no label in front of the suffix
    'https://backblazeb2.com.evil.example',
    'https://evil-backblazeb2.com',
    'https://xbackblazeb2.com',
    'https://deepcrated-release.s3.us-east-005.backblazeb2.com.evil.example',
    'https://evil.example/.backblazeb2.com',
    'https://evil.example#.backblazeb2.com',
    'https://evil.example?x=.backblazeb2.com'
  ]) {
    assert.equal(normalizeBaseUrl(bad), null, bad)
  }
})

test('base URL: http, credentials, ports, query, hash, junk and non-strings are rejected', () => {
  for (const bad of [
    'http://deepcrated-release.s3.us-east-005.backblazeb2.com',
    'https://user:pw@deepcrated-release.s3.us-east-005.backblazeb2.com',
    'https://deepcrated-release.s3.us-east-005.backblazeb2.com:8443',
    BASE + '?x=1',
    BASE + '#frag',
    BASE + '/a/../b',
    BASE + '//x',
    'ftp://x.backblazeb2.com',
    'javascript:alert(1)',
    '',
    'not a url',
    undefined,
    null,
    5,
    {}
  ]) {
    assert.equal(normalizeBaseUrl(bad), null, JSON.stringify(bad))
  }
})

test('the allowed suffix is a single named constant', () => {
  assert.equal(ALLOWED_RELEASE_HOST_SUFFIX, '.backblazeb2.com')
})

test('formatMegabytes is decimal MB with one decimal place', () => {
  assert.equal(formatMegabytes(313818816), '313.8 MB')
  assert.equal(formatMegabytes(1_000_000), '1.0 MB')
})
