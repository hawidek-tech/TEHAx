/**
 * accessflow.js - drop-in Web Components for partner websites.
 *
 *   <script src="https://ACCESSFLOW-HOST/accessflow.js" defer></script>
 *   <accessflow-signup partner-key="pk_..." locale="am"></accessflow-signup>
 *
 * Each element renders an isolated iframe served from the ACCESSFLOW origin, so the host page cannot read
 * what people type (passwords, ID numbers, support needs). Authentication inside the frame uses an
 * in-memory token, never third-party cookies. A full-page link is always shown as a fallback.
 */
const script = document.currentScript as HTMLScriptElement | null
const BASE = script ? new URL(script.src).origin : window.location.origin

const STYLE = `
:host { display: block; }
.frame { width: 100%; min-height: 420px; border: 0; display: block; }
.fallback { font: inherit; margin: .5rem 0 0; }
.fallback a { display: inline-flex; min-height: 44px; align-items: center; font-weight: 600; }
`

abstract class AccessflowElement extends HTMLElement {
  static observedAttributes = ['partner-key', 'locale', 'job-id']
  protected abstract readonly component: 'signup' | 'profile' | 'job-application'
  private iframe?: HTMLIFrameElement
  private readonly onMessage = (e: MessageEvent) => this.handle(e)

  connectedCallback() {
    this.render()
    window.addEventListener('message', this.onMessage)
  }

  disconnectedCallback() {
    window.removeEventListener('message', this.onMessage)
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render()
  }

  private render() {
    const key = this.getAttribute('partner-key') ?? ''
    const locale = this.getAttribute('locale') ?? 'en'
    const job = this.getAttribute('job-id') ?? ''
    const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
    const q = new URLSearchParams({ key, locale, origin: window.location.origin })
    if (job) q.set('job', job)

    const iframe = document.createElement('iframe')
    iframe.className = 'frame'
    iframe.src = `${BASE}/embed/${this.component}?${q.toString()}`
    iframe.title =
      this.getAttribute('frame-title') ?? `ACCESSFLOW ${this.component.replace('-', ' ')}`
    iframe.setAttribute('allow', 'microphone') // voice input inside the frame (asked only when the user presses the button)
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox',
    )
    iframe.setAttribute('referrerpolicy', 'strict-origin')
    iframe.loading = 'lazy'

    const route =
      this.component === 'job-application' && job
        ? `/jobs/${encodeURIComponent(job)}/apply`
        : this.component === 'profile'
          ? '/profile'
          : '/preview'
    const fallback = document.createElement('p')
    fallback.className = 'fallback'
    const link = document.createElement('a')
    link.href = `${BASE}${route}?partner=${encodeURIComponent(key)}`
    link.target = '_blank'
    link.rel = 'noopener'
    link.textContent =
      this.getAttribute('fallback-text') ?? 'Having trouble? Open ACCESSFLOW in a new tab'
    fallback.append(link)

    const style = document.createElement('style')
    style.textContent = STYLE
    root.replaceChildren(style, iframe, fallback)
    this.iframe = iframe
  }

  /** Accept messages only from the ACCESSFLOW origin AND from this element's own iframe. */
  private handle(e: MessageEvent) {
    if (e.origin !== BASE || !this.iframe || e.source !== this.iframe.contentWindow) return
    const data = e.data as { source?: string; type?: string; height?: number; reference?: string }
    if (!data || data.source !== 'accessflow') return
    if (data.type === 'resize' && typeof data.height === 'number') {
      this.iframe.style.height = `${Math.min(6000, Math.max(300, Math.round(data.height)))}px`
    } else if (data.type === 'ready') {
      this.dispatchEvent(
        new CustomEvent('accessflow:ready', {
          bubbles: true,
          composed: true,
          detail: { component: this.component },
        }),
      )
    } else if (data.type === 'completed') {
      const reference = typeof data.reference === 'string' ? data.reference.slice(0, 64) : undefined
      this.dispatchEvent(
        new CustomEvent('accessflow:completed', {
          bubbles: true,
          composed: true,
          detail: { component: this.component, reference },
        }),
      )
    }
  }
}

class SignupElement extends AccessflowElement {
  protected readonly component = 'signup' as const
}
class ProfileElement extends AccessflowElement {
  protected readonly component = 'profile' as const
}
class JobApplicationElement extends AccessflowElement {
  protected readonly component = 'job-application' as const
}

if (!customElements.get('accessflow-signup'))
  customElements.define('accessflow-signup', SignupElement)
if (!customElements.get('accessflow-profile'))
  customElements.define('accessflow-profile', ProfileElement)
if (!customElements.get('accessflow-job-application'))
  customElements.define('accessflow-job-application', JobApplicationElement)
