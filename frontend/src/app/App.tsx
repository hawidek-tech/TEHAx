import { ConnectionStatus } from './ConnectionStatus'

/** Phase 0 application shell. Phase 2 replaces this with the full AppShell and routing. */
export function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3"
      >
        Skip to main content
      </a>
      <header className="bg-[var(--color-accent)] px-4 py-4 text-white">
        <p className="mx-auto max-w-3xl text-xl font-bold">ACCESSFLOW</p>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-4 text-3xl font-bold">ACCESSFLOW</h1>
        <p className="mb-6 text-lg">One accessible journey from onboarding to employment.</p>
        <ConnectionStatus />
      </main>
    </>
  )
}
