const CACHE_NAME = 'casa-nostra-v6'
const STATIC_CACHE = 'casa-nostra-static-v6'
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(URLS_TO_CACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  const keepCaches = [CACHE_NAME, STATIC_CACHE]
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => !keepCaches.includes(name)).map((name) => caches.delete(name))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // NEVER cache version.json or APK files — always fetch from network
  if (url.pathname.includes('version.json') || url.pathname.includes('/releases/')) {
    event.respondWith(fetch(event.request))
    return
  }

  // For navigation requests (HTML pages), use network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match(event.request) || caches.match('/index.html'))
    )
    return
  }

  // For JS/CSS assets with hash in filename, use cache-first (immutable)
  if (/\.[a-f0-9]{8,}\.(js|css)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // For all other requests, use stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => cached)
      return cached || fetchPromise
    })
  )
})
