/*
 * ACCESSFLOW service worker (production only).
 * - App shell and hashed assets: cached so the app opens on unreliable connections.
 * - Approved guidance (help articles, form definitions, job listings): network first, cached copy offline.
 * - Everything personal or state-changing goes to the network only and is never cached.
 */
const VERSION = 'af-v1'
const SHELL = `${VERSION}-shell`
const DATA = `${VERSION}-guidance`
const CACHEABLE_API = [/^\/api\/v1\/forms\/[a-z-]+$/, /^\/api\/v1\/help(\/|$)/] // public content only

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/index.html', '/favicon.svg', '/manifest.webmanifest'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/embed')) return

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')))
    return
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(SHELL).then((c) => c.put(req, copy))
        return res
      })),
    )
    return
  }
  if (CACHEABLE_API.some((re) => re.test(url.pathname)) && !req.headers.get('Authorization')) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(DATA).then((c) => c.put(req, copy))
        }
        return res
      }).catch(() => caches.match(req).then((hit) => hit || Response.error())),
    )
  }
})
