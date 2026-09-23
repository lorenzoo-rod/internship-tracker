import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'
import type { Opportunity } from './api'

function reply(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  delete window.trackerApi
  window.localStorage.clear()
})

it('loads the board and shows saved opportunities in their stage', async () => {
  const existing: Opportunity = {
    id: 7,
    title: 'Software Intern',
    company: 'Example Co',
    postingUrl: 'https://example.com/jobs/7',
    stage: 'INTERVIEWING',
  }
  vi.stubGlobal('fetch', vi.fn(async () => reply(200, [existing])))

  render(<App />)

  const column = await screen.findByRole('region', { name: 'Interviewing stage' })
  expect(within(column).getByRole('heading', { name: 'Software Intern' })).not.toBeNull()
  expect(screen.getByText('example.com')).not.toBeNull()
})

it('uses the Electron bridge when the desktop shell provides it', async () => {
  const existing: Opportunity = {
    id: 4,
    title: 'Research Intern',
    company: 'Example Lab',
    postingUrl: 'https://example.com/jobs/4',
    stage: 'SAVED',
  }
  const bridge = vi.fn(async () => ({ status: 200, body: [existing] }))
  window.trackerApi = { request: bridge, backup: vi.fn(async () => ({ canceled: true })) }
  const browserFetch = vi.fn()
  vi.stubGlobal('fetch', browserFetch)

  render(<App />)

  expect(await screen.findByRole('heading', { name: 'Research Intern' })).not.toBeNull()
  expect(bridge).toHaveBeenCalledWith('/api/opportunities', 'GET', null)
  expect(browserFetch).not.toHaveBeenCalled()
})

it('adds a card, moves it, and shows the existing card on duplicate save', async () => {
  const user = userEvent.setup()
  let cards: Opportunity[] = []
  const fetchMock = vi.fn(async (_path: string, options?: RequestInit) => {
    if (!options?.method) return reply(200, cards)

    if (options.method === 'POST') {
      const submitted = JSON.parse(String(options.body))
      const existing = cards.find((card) => card.postingUrl === submitted.postingUrl.trim())
      if (existing) return reply(409, { code: 'DUPLICATE_POSTING_URL', existing })
      const created: Opportunity = { ...submitted, postingUrl: submitted.postingUrl.trim(), id: 1, stage: 'SAVED' }
      cards = [created]
      return reply(201, created)
    }

    if (options.method === 'PATCH') {
      const { stage } = JSON.parse(String(options.body))
      cards = cards.map((card) => ({ ...card, stage }))
      return reply(200, cards[0])
    }

    throw new Error('Unexpected request')
  })
  vi.stubGlobal('fetch', fetchMock)

  render(<App />)
  await screen.findByText('New opportunities start here')
  await user.click(screen.getByRole('button', { name: 'Add opportunity' }))
  const form = screen.getByRole('dialog')
  await user.type(within(form).getByLabelText('Role title'), 'Software Intern')
  await user.type(within(form).getByLabelText('Company'), 'Example Co')
  await user.type(within(form).getByLabelText('Posting URL'), 'https://example.com/jobs/1')
  await user.click(within(form).getByRole('button', { name: 'Add opportunity' }))

  const saved = await screen.findByRole('region', { name: 'Saved stage' })
  expect(within(saved).getByRole('heading', { name: 'Software Intern' })).not.toBeNull()
  await user.selectOptions(within(saved).getByRole('combobox', { name: 'Move to' }), 'APPLIED')
  const applied = await screen.findByRole('region', { name: 'Applied stage' })
  expect(within(applied).getByRole('heading', { name: 'Software Intern' })).not.toBeNull()

  await user.click(screen.getByRole('button', { name: 'Add opportunity' }))
  const duplicateForm = screen.getByRole('dialog')
  await user.type(within(duplicateForm).getByLabelText('Role title'), 'Another Intern')
  await user.type(within(duplicateForm).getByLabelText('Company'), 'Example Co')
  await user.type(within(duplicateForm).getByLabelText('Posting URL'), 'https://example.com/jobs/1')
  await user.click(within(duplicateForm).getByRole('button', { name: 'Add opportunity' }))

  expect(await within(duplicateForm).findByText('Already on your board')).not.toBeNull()
  expect(cards).toHaveLength(1)
  expect(fetchMock).toHaveBeenCalledWith('/api/opportunities/1/stage', expect.objectContaining({ method: 'PATCH' }))

  await user.click(within(duplicateForm).getByRole('button', { name: 'Back to board' }))
  const data = new Map<string, string>()
  const dataTransfer = {
    setData: (type: string, value: string) => data.set(type, value),
    getData: (type: string) => data.get(type) ?? '',
    effectAllowed: 'move',
  }
  fireEvent.dragStart(within(applied).getByRole('article'), { dataTransfer })
  const interviewing = screen.getByRole('region', { name: 'Interviewing stage' })
  fireEvent.dragOver(interviewing, { dataTransfer })
  fireEvent.drop(interviewing, { dataTransfer })
  expect(await within(interviewing).findByRole('heading', { name: 'Software Intern' })).not.toBeNull()
})

it('edits a card and shows the existing card on a duplicate URL', async () => {
  const user = userEvent.setup()
  const cards: Opportunity[] = [
    { id: 1, title: 'Software Intern', company: 'Example Co', postingUrl: 'https://example.com/one', stage: 'APPLIED' },
    { id: 2, title: 'Research Intern', company: 'Other Co', postingUrl: 'https://example.com/two', stage: 'SAVED' },
  ]
  const fetchMock = vi.fn(async (_path: string, options?: RequestInit) => {
    if (!options?.method) return reply(200, cards)
    if (options.method === 'PATCH') {
      const updated = JSON.parse(String(options.body))
      const duplicate = cards.find((card) => card.id !== 1 && card.postingUrl === updated.postingUrl)
      if (duplicate) return reply(409, { code: 'DUPLICATE_POSTING_URL', existing: duplicate })
      Object.assign(cards[0], updated)
      return reply(200, cards[0])
    }
    throw new Error('Unexpected request')
  })
  vi.stubGlobal('fetch', fetchMock)

  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Edit Software Intern' }))
  let dialog = screen.getByRole('dialog')
  expect(within(dialog).getByLabelText('Role title')).toHaveProperty('value', 'Software Intern')
  await user.clear(within(dialog).getByLabelText('Role title'))
  await user.type(within(dialog).getByLabelText('Role title'), 'Platform Intern')
  await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByRole('heading', { name: 'Platform Intern' })).not.toBeNull()
  expect(cards[0].stage).toBe('APPLIED')
  expect(fetchMock).toHaveBeenCalledWith('/api/opportunities/1', expect.objectContaining({ method: 'PATCH' }))

  await user.click(screen.getByRole('button', { name: 'Edit Platform Intern' }))
  dialog = screen.getByRole('dialog')
  await user.clear(within(dialog).getByLabelText('Posting URL'))
  await user.type(within(dialog).getByLabelText('Posting URL'), 'https://example.com/two')
  await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
  expect(await within(dialog).findByText('Already on your board')).not.toBeNull()
  expect(cards[0].postingUrl).toBe('https://example.com/one')
})

it('confirms deletion, remembers the choice, and lets the user restore confirmations', async () => {
  const user = userEvent.setup()
  let cards: Opportunity[] = [
    { id: 1, title: 'First Intern', company: 'Example Co', postingUrl: 'https://example.com/one', stage: 'SAVED' },
    { id: 2, title: 'Second Intern', company: 'Other Co', postingUrl: 'https://example.com/two', stage: 'APPLIED' },
  ]
  const fetchMock = vi.fn(async (path: string, options?: RequestInit) => {
    if (!options?.method) return reply(200, cards)
    if (options.method === 'DELETE') {
      cards = cards.filter((card) => !path.endsWith(`/${card.id}`))
      return reply(204, null)
    }
    throw new Error('Unexpected request')
  })
  vi.stubGlobal('fetch', fetchMock)

  const view = render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Delete First Intern' }))
  let dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText(/First Intern/)).not.toBeNull()
  await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(cards).toHaveLength(2)

  await user.click(screen.getByRole('button', { name: 'Delete First Intern' }))
  dialog = screen.getByRole('dialog')
  await user.click(within(dialog).getByRole('checkbox', { name: "Don't ask again on this device" }))
  await user.click(within(dialog).getByRole('button', { name: 'Delete card' }))
  expect(await screen.findByText('First Intern deleted.')).not.toBeNull()
  expect(cards).toHaveLength(1)
  expect(window.localStorage.getItem('internshipHub.skipDeleteConfirmation')).toBe('true')

  view.unmount()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Delete Second Intern' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(await screen.findByText('Second Intern deleted.')).not.toBeNull()
  await user.click(screen.getByRole('button', { name: 'Turn delete confirmations on' }))
  expect(window.localStorage.getItem('internshipHub.skipDeleteConfirmation')).toBeNull()
  expect(fetchMock).toHaveBeenCalledWith('/api/opportunities/2', expect.objectContaining({ method: 'DELETE' }))
})

it('saves a backup through the desktop bridge and reports success or failure', async () => {
  const user = userEvent.setup()
  const backup = vi.fn()
    .mockResolvedValueOnce({ canceled: false, path: 'C:\\Users\\test\\Documents\\backup.dump', bytes: 123 })
    .mockResolvedValueOnce({ canceled: true })
    .mockRejectedValueOnce(new Error('PostgreSQL backup tools were not found.'))
  window.trackerApi = { request: vi.fn(async () => ({ status: 200, body: [] })), backup }

  render(<App />)
  const button = screen.getByRole('button', { name: 'Save backup' })
  await user.click(button)
  expect(await screen.findByText(/Backup saved to .*backup\.dump/)).not.toBeNull()
  await user.click(button)
  expect(screen.queryByText(/Backup saved to/)).toBeNull()
  await user.click(button)
  expect(await screen.findByText('PostgreSQL backup tools were not found.')).not.toBeNull()
  expect(backup).toHaveBeenCalledTimes(3)
})
