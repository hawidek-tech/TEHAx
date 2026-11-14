#!/usr/bin/env node
/**
 * Translation completeness check (run in CI and in `npm test`).
 *  1. Every static key used in the source exists in the English catalog.
 *  2. Every locale contains every English key (except optional "simple.*" variants), so no screen is
 *     left half-translated.
 *  3. Interpolation placeholders ({{name}}) match between English and each translation.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('../src/', import.meta.url).pathname
const localesDir = join(root, 'i18n/locales')
const load = (l) => JSON.parse(readFileSync(join(localesDir, `${l}.json`), 'utf8'))
const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v, key, out)
    else out[key] = String(v)
  }
  return out
}
const en = flatten(load('en'))
const enKeys = new Set(Object.keys(en))
const has = (key) => enKeys.has(key) || enKeys.has(`${key}_one`) || enKeys.has(`${key}_other`)

let failures = 0
const fail = (msg) => {
  failures++
  console.error('✗ ' + msg)
}

// 1. static keys in source
const files = []
const walk = (dir) => readdirSync(dir).forEach((f) => {
  const p = join(dir, f)
  if (statSync(p).isDirectory()) walk(p)
  else if (/\.(tsx?|jsx?)$/.test(f) && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx')) files.push(p)
})
walk(root)
const re = /\bt\(\s*(['"`])([a-zA-Z0-9_.\-]+)\1/g
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(re)) if (!m[2].endsWith(".") && !has(m[2])) fail(`missing English key "${m[2]}" used in ${f.replace(root, 'src/')}`)
}

// 2 + 3. locale completeness and placeholders
const placeholders = (s) => [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort().join(',')
for (const file of readdirSync(localesDir).filter((f) => f.endsWith('.json') && f !== 'en.json')) {
  const locale = file.replace('.json', '')
  const tr = flatten(load(locale))
  const plural = (k) => k.replace(/_(one|other|zero|two|few|many)$/, '')
  const trBase = new Set(Object.keys(tr).map(plural))
  for (const k of enKeys) {
    if (k.startsWith('simple.')) continue
    if (!(k in tr) && !trBase.has(plural(k))) fail(`[${locale}] missing "${k}"`)
    else if (k in tr && placeholders(en[k]) !== placeholders(tr[k])) fail(`[${locale}] placeholders differ for "${k}"`)
  }
  for (const k of Object.keys(tr)) if (!k.startsWith('simple.') && !enKeys.has(k) && !has(plural(k))) fail(`[${locale}] unknown key "${k}"`)
}

if (failures) {
  console.error(`\n${failures} translation problem(s).`)
  process.exit(1)
}
console.log(`✓ translations complete: ${enKeys.size} English keys, ${files.length} source files checked`)
