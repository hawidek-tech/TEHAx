/** Registers the offline service worker in production builds only (not in the Vite dev server or embeds). */
export function registerServiceWorker() {
  if (
    import.meta.env.DEV ||
    !('serviceWorker' in navigator) ||
    window.location.pathname.startsWith('/embed')
  )
    return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}
