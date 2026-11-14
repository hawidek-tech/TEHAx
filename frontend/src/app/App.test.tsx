import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

function mockFetch(response: Partial<Response> | Error) {
  const fn =
    response instanceof Error
      ? vi.fn().mockRejectedValue(response)
      : vi.fn().mockResolvedValue(response as Response)
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('App shell (Phase 0)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('has one level-1 heading and a main landmark', () => {
    mockFetch(new Error('offline'))
    render(<App />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it('skip link is the first keyboard stop and targets main content', async () => {
    mockFetch(new Error('offline'))
    render(<App />)
    await userEvent.tab()
    const skip = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skip).toHaveFocus()
    expect(skip).toHaveAttribute('href', '#main')
  })

  it('announces a connected status when the API responds', async () => {
    mockFetch({
      ok: true,
      json: async () => ({ name: 'ACCESSFLOW', version: '0.1.0', apiVersion: 'v1' }),
    })
    render(<App />)
    expect(await screen.findByRole('status')).toHaveTextContent('Connected to ACCESSFLOW service')
  })

  it('announces a plain-language message when the API cannot be reached', async () => {
    mockFetch(new Error('network down'))
    render(<App />)
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cannot reach the service right now',
    )
  })
})
