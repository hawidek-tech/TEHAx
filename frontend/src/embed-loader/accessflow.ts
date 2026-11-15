/**
 * db-signup.js (also published as accessflow.js) - ACCESSFLOW as a one-script, drop-in module.
 *
 *   <script src="https://MODULE-HOST/db-signup.js" defer></script>
 *   <db-signup lang="am" api="https://MODULE-HOST" theme="auto"></db-signup>
 *   <script>
 *     document.addEventListener('db-signup:done', (e) => console.log(e.detail))
 *   </script>
 *
 * Design:
 * - Each element renders, inside its own Shadow DOM, an iframe served from the ACCESSFLOW origin. Host CSS (Bootstrap,
 *   Savanna, anything) cannot reach the form, and the module never touches host styles, <body> or other DOM.
 * - No global variables: everything lives inside this module's closure.
 * - Sign-in inside the frame uses a short-lived bearer token, never third-party cookies. A full-page link is always shown.
 * - Events (bubbling, composed) carry no personal data:
 *     db-signup:ready    { view }
 *     db-signup:step     { view, step, index, total, section }
 *     db-signup:support  { view, requested: true }
 *     db-signup:done     { view, reference }
 */
type View = 'signup' | 'profile' | 'jobs' | 'job-application'

const script = document.currentScript as HTMLScriptElement | null
const SCRIPT_ORIGIN = script ? new URL(script.src).origin : window.location.origin

const STYLE = `
:host { display: block; contain: content; }
.frame { display: block; width: 100%; min-height: 420px; border: var(--db-signup-border, 1px solid #c9d1cc);
  border-radius: var(--db-signup-radius, 12px); background: var(--db-signup-background, #f6f5f1); }
.fallback { margin: .5rem 0 0; font: inherit; }
.fallback a { display: inline-flex; min-height: 44px; align-items: center; font-weight: 600;
  color: var(--db-signup-link-color, inherit); }
`

/** Origin of the API/frame host: the `api` attribute if given (scheme+host+port only), otherwise the script's origin. */
function hostOrigin(api: string | null): string {
  if (!api) return SCRIPT_ORIGIN
  try {
    const u = new URL(api, window.location.href)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : SCRIPT_ORIGIN
  } catch {
    return SCRIPT_ORIGIN
  }
}

abstract class ModuleElement extends HTMLElement {
  static observedAttributes = ['lang', 'locale', 'api', 'theme', 'view', 'job-id', 'partner-key']
  protected abstract readonly eventPrefix: string
  protected abstract defaultView(): View
  private iframe?: HTMLIFrameElement
  private origin = SCRIPT_ORIGIN
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

  protected view(): View {
    const v = this.getAttribute('view')
    return v === 'signup' || v === 'profile' || v === 'jobs' || v === 'job-application'
      ? v
      : this.defaultView()
  }

  private render() {
    const view = this.view()
    const lang = this.getAttribute('lang') ?? this.getAttribute('locale') ?? 'en'
    const theme = this.getAttribute('theme') ?? 'auto'
    const key = this.getAttribute('partner-key')
    const job = this.getAttribute('job-id')
    this.origin = hostOrigin(this.getAttribute('api'))
    // Host design tokens (CSS custom properties) are passed to the frame; the frame ignores unreadable values.
    const accent = getComputedStyle(this).getPropertyValue('--db-signup-accent').trim()

    const q = new URLSearchParams({ origin: window.location.origin, lang, theme })
    if (key) q.set('key', key)
    if (job) q.set('job', job)
    if (/^#[0-9a-fA-F]{6}$/.test(accent)) q.set('accent', accent)

    const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
    const iframe = document.createElement('iframe')
    iframe.className = 'frame'
    iframe.src = `${this.origin}/embed/${view}?${q.toString()}`
    iframe.title = this.getAttribute('frame-title') ?? `ACCESSFLOW: ${view.replace('-', ' ')}`
    iframe.setAttribute('allow', 'microphone; camera') // asked only when the user presses the voice or camera button
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox',
    )
    iframe.setAttribute('referrerpolicy', 'strict-origin')
    iframe.loading = 'lazy'

    const route =
      view === 'job-application' && job
        ? `/jobs/${encodeURIComponent(job)}/apply`
        : view === 'jobs'
          ? '/jobs'
          : view === 'profile'
            ? '/profile'
            : '/preview'
    const fallback = document.createElement('p')
    fallback.className = 'fallback'
    const link = document.createElement('a')
    link.href = `${this.origin}${route}`
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

  private emit(type: string, detail: Record<string, unknown>) {
    this.dispatchEvent(
      new CustomEvent(`${this.eventPrefix}:${type}`, { bubbles: true, composed: true, detail }),
    )
  }

  /** Accept messages only from the module origin AND this element's own iframe. */
  private handle(e: MessageEvent) {
    if (e.origin !== this.origin || !this.iframe || e.source !== this.iframe.contentWindow) return
    const d = e.data as {
      source?: string
      type?: string
      height?: number
      reference?: unknown
      stepId?: unknown
      index?: unknown
      total?: unknown
      section?: unknown
    }
    if (!d || d.source !== 'accessflow') return
    const view = this.view()
    const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, 64) : undefined)
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
    switch (d.type) {
      case 'resize':
        if (typeof d.height === 'number')
          this.iframe.style.height = `${Math.min(8000, Math.max(300, Math.round(d.height)))}px`
        break
      case 'ready':
        this.emit('ready', { view })
        break
      case 'step':
        this.emit('step', {
          view,
          step: str(d.stepId),
          index: num(d.index),
          total: num(d.total),
          section: str(d.section),
        })
        break
      case 'support':
        this.emit('support', { view, requested: true })
        break
      case 'completed':
        this.emit(this.eventPrefix === 'db-signup' ? 'done' : 'completed', {
          view,
          reference: str(d.reference),
        })
        break
    }
  }
}

/** Track 1 contract element. */
class DbSignup extends ModuleElement {
  protected readonly eventPrefix = 'db-signup'
  protected defaultView(): View {
    return 'signup'
  }
}

/** Earlier ACCESSFLOW element names (kept for compatibility); events are prefixed "accessflow:". */
class AccessflowSignup extends ModuleElement {
  protected readonly eventPrefix = 'accessflow'
  protected defaultView(): View {
    return 'signup'
  }
}
class AccessflowProfile extends ModuleElement {
  protected readonly eventPrefix = 'accessflow'
  protected defaultView(): View {
    return 'profile'
  }
}
class AccessflowJobApplication extends ModuleElement {
  protected readonly eventPrefix = 'accessflow'
  protected defaultView(): View {
    return 'job-application'
  }
}

const define = (name: string, ctor: CustomElementConstructor) =>
  customElements.get(name) || customElements.define(name, ctor)
define('db-signup', DbSignup)
define('accessflow-signup', AccessflowSignup)
define('accessflow-profile', AccessflowProfile)
define('accessflow-job-application', AccessflowJobApplication)
