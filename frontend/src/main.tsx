import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import { App } from './app/App'
import { registerServiceWorker } from './lib/serviceWorker'
import { setEmbedMode } from './lib/api'

// Embedded (iframe) mode is decided before rendering: authentication then uses an in-memory bearer
// token instead of cookies, so it keeps working when browsers block third-party cookies.
if (window.location.pathname.startsWith('/embed/')) {
  setEmbedMode(new URLSearchParams(window.location.search).get('key') ?? '')
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
