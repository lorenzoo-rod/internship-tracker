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
    applicationUrl: 'https://example.com/jobs/7',
    stage: 'INTERVIEWING',
  }
  vi.stubGlobal('fetch', vi.fn(async () => reply(200, [existing])))

  render(<App />)

  const column = await screen.findByRole('region', { name: 'Interviewing stage' })
  expect(within(column).getByRole('heading', { name: 'Software Intern' })).not.toBeNull()
  expect(within(column).getByRole('link', { name: /example.com/ })).not.toBeNull()
})

it('focuses a stage, switches through counted tabs, moves cards, and returns to the full board', async () => {
  const user = userEvent.setup()
  let cards: Opportunity[] = [
    { id: 1, title: 'Software Intern', company: 'Example Co', applicationUrl: 'https://example.com/one', stage: 'SAVED' },
    { id: 2, title: 'Research Intern', company: 'Other Co', applicationUrl: 'https://example.com/two', stage: 'APPLIED' },
  ]
  vi.stubGlobal('fetch', vi.fn(async (_path: string, options?: RequestInit) => {
    if (!options?.method) return reply(200, cards)
    if (options.method === 'PATCH') {
      const { stage } = JSON.parse(String(options.body))
      cards = cards.map((card) => card.id === 1 ? { ...card, stage } : card)
      return reply(200, cards[0])
    }
    throw new Error('Unexpected request')
  }))

  render(<App />)
  const saved = await screen.findByRole('region', { name: 'Saved stage' })
  await user.click(saved)
  expect(saved.classList.contains('board-column-focused')).toBe(true)
  expect(screen.queryByRole('button', { name: 'Focus Saved stage' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Focus Applied stage, 1 card' })).not.toBeNull()
  expect(within(saved).getByRole('heading', { name: 'Software Intern' })).not.toBeNull()
  expect(screen.queryByRole('heading', { name: 'Research Intern' })).toBeNull()

  await user.selectOptions(within(saved).getByRole('combobox', { name: 'Move to' }), 'INTERVIEWING')
  expect(await screen.findByRole('button', { name: 'Focus Interviewing stage, 1 card' })).not.toBeNull()
  await user.click(screen.getByRole('button', { name: 'Focus Interviewing stage, 1 card' }))
  const interviewing = screen.getByRole('region', { name: 'Interviewing stage' })
  expect(within(interviewing).getByRole('heading', { name: 'Software Intern' })).not.toBeNull()
  const data = new Map<string, string>()
  const dataTransfer = {
    setData: (type: string, value: string) => data.set(type, value),
    getData: (type: string) => data.get(type) ?? '',
    effectAllowed: 'move',
  }
  fireEvent.dragStart(within(interviewing).getByRole('article'), { dataTransfer })
  const savedTab = screen.getByRole('region', { name: 'Saved stage' })
  fireEvent.dragOver(savedTab, { dataTransfer })
  fireEvent.drop(savedTab, { dataTransfer })
  const countedSavedTab = await screen.findByRole('button', { name: 'Focus Saved stage, 1 card' })
  countedSavedTab.focus()
  await user.keyboard('{Enter}')
  expect(within(savedTab).getByRole('heading', { name: 'Software Intern' })).not.toBeNull()
  await user.click(screen.getByRole('button', { name: 'Show full board' }))
  expect(screen.getByRole('heading', { name: 'Research Intern' })).not.toBeNull()
  saved.focus()
  await user.keyboard('{Enter}')
  expect(saved.classList.contains('board-column-focused')).toBe(true)
  await user.keyboard('{Escape}')
  expect(saved.classList.contains('board-column-focused')).toBe(false)
})

it('keeps card controls independent of column focus and gives Escape to an open dialog first', async () => {
  const user = userEvent.setup()
  const existing: Opportunity = { id: 1, title: 'Software Intern', company: 'Example Co', applicationUrl: 'https://example.com/one', stage: 'SAVED' }
  vi.stubGlobal('fetch', vi.fn(async () => reply(200, [existing])))

  render(<App />)
  const saved = await screen.findByRole('region', { name: 'Saved stage' })
  await user.click(saved)
  await user.click(within(saved).getByRole('button', { name: 'Edit Software Intern' }))
  expect(screen.getByRole('dialog')).not.toBeNull()
  expect(saved.classList.contains('board-column-focused')).toBe(true)
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(saved.classList.contains('board-column-focused')).toBe(true)
  await user.click(within(saved).getByRole('heading', { name: 'Saved' }))
  expect(saved.classList.contains('board-column-focused')).toBe(false)
  saved.focus()
  await user.keyboard(' ')
  expect(saved.classList.contains('board-column-focused')).toBe(true)
})

it('uses the Electron bridge when the desktop shell provides it', async () => {
  const existing: Opportunity = {
    id: 4,
    title: 'Research Intern',
    company: 'Example Lab',
    applicationUrl: 'https://example.com/jobs/4',
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

it('reviews a Chrome capture before saving a card', async () => {
  let deliver: ((draft: { applicationUrl: string; title?: string; company?: string }) => void) | undefined
  window.trackerApi = {
    request: vi.fn(async () => ({ status: 200, body: [] })),
    backup: vi.fn(async () => ({ canceled: true })),
    onBrowserDraft: (callback) => { deliver = callback; return () => {} },
  }
  render(<App />)
  await screen.findByText('New opportunities start here')
  deliver?.({ applicationUrl: 'https://example.com/apply', title: 'Software Intern', company: 'Example Co' })
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByLabelText('Application URL')).toHaveProperty('value', 'https://example.com/apply')
  expect(within(dialog).getByLabelText('Role title')).toHaveProperty('value', 'Software Intern')
  expect(window.trackerApi.request).toHaveBeenCalledTimes(1)
})

it('shows application links in Saved and status links after applying', async () => {
  const cards: Opportunity[] = [
    { id: 1, title: 'Saved role', company: 'Example', applicationUrl: 'https://example.com/apply', statusUrl: 'https://example.com/status', stage: 'SAVED' },
    { id: 2, title: 'Applied role', company: 'Example', applicationUrl: 'https://example.com/apply-2', statusUrl: 'https://example.com/status-2', stage: 'APPLIED' },
  ]
  vi.stubGlobal('fetch', vi.fn(async () => reply(200, cards)))
  render(<App />)
  const saved = await screen.findByRole('region', { name: 'Saved stage' })
  const applied = screen.getByRole('region', { name: 'Applied stage' })
  expect(within(saved).getByRole('link', { name: /Apply:/ }).getAttribute('href')).toBe('https://example.com/apply')
  expect(within(applied).getByRole('link', { name: /Status:/ }).getAttribute('href')).toBe('https://example.com/status-2')
})

it('adds a card, moves it, and shows the existing card on duplicate save', async () => {
  const user = userEvent.setup()
  let cards: Opportunity[] = []
  const fetchMock = vi.fn(async (_path: string, options?: RequestInit) => {
    if (!options?.method) return reply(200, cards)

    if (options.method === 'POST') {
      const submitted = JSON.parse(String(options.body))
      const existing = cards.find((card) => card.applicationUrl === submitted.applicationUrl.trim())
      if (existing) return reply(409, { code: 'DUPLICATE_POSTING_URL', existing })
      const created: Opportunity = { ...submitted, applicationUrl: submitted.applicationUrl.trim(), id: 1, stage: 'SAVED' }
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
  await user.type(within(form).getByLabelText('Application URL'), 'https://example.com/jobs/1')
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
  await user.type(within(duplicateForm).getByLabelText('Application URL'), 'https://example.com/jobs/1')
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

it('opens LinkedIn Jobs from Find and reviews a discovery link before saving', async () => {
  const user = userEvent.setup()
  const applicationUrl = 'https://www.linkedin.com/jobs/view/12345/'
  let cards: Opportunity[] = []
  const fetchMock = vi.fn(async (_path: string, options?: RequestInit) => {
    if (!options?.method) return reply(200, cards)
    if (options.method === 'POST') {
      const submitted = JSON.parse(String(options.body))
      const existing = cards.find((card) => card.discoveryUrl === submitted.discoveryUrl)
      if (existing) return reply(409, { code: 'DUPLICATE_POSTING_URL', existing })
      const created: Opportunity = { ...submitted, id: 1, stage: 'SAVED' }
      cards = [created]
      return reply(201, created)
    }
    throw new Error('Unexpected request')
  })
  vi.stubGlobal('fetch', fetchMock)

  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Find' }))
  const linkedin = screen.getByRole('link', { name: /Browse LinkedIn Jobs/ })
  expect(linkedin.getAttribute('href')).toBe('https://www.linkedin.com/jobs/')
  expect(linkedin.getAttribute('target')).toBe('_blank')
  const greenhouse = screen.getByRole('link', { name: /Browse MyGreenhouse Jobs/ })
  expect(greenhouse.getAttribute('href')).toBe('https://my.greenhouse.io/')
  expect(greenhouse.getAttribute('target')).toBe('_blank')

  await user.type(screen.getByLabelText('Posting link'), applicationUrl)
  await user.click(screen.getByRole('button', { name: 'Review for board' }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByLabelText('Discovery URL')).toHaveProperty('value', applicationUrl)
  expect(cards).toHaveLength(0)
  await user.type(within(dialog).getByLabelText('Role title'), 'Software Intern')
  await user.type(within(dialog).getByLabelText('Company'), 'Example Co')
  await user.click(within(dialog).getByRole('button', { name: 'Add opportunity' }))
  const saved = await screen.findByRole('region', { name: 'Saved stage' })
  expect(within(saved).getByRole('heading', { name: 'Software Intern' })).not.toBeNull()

  await user.click(screen.getByRole('button', { name: 'Find' }))
  await user.type(screen.getByLabelText('Posting link'), applicationUrl)
  await user.click(screen.getByRole('button', { name: 'Review for board' }))
  const duplicateDialog = screen.getByRole('dialog')
  await user.type(within(duplicateDialog).getByLabelText('Role title'), 'Another Intern')
  await user.type(within(duplicateDialog).getByLabelText('Company'), 'Example Co')
  await user.click(within(duplicateDialog).getByRole('button', { name: 'Add opportunity' }))
  expect(await within(duplicateDialog).findByText('Already on your board')).not.toBeNull()
  expect(cards).toHaveLength(1)
  expect(fetchMock.mock.calls.some(([path]) => String(path).startsWith('/api/posting-preview?'))).toBe(false)
})

it('prefills Greenhouse details for review while keeping the pasted application URL', async () => {
  const user = userEvent.setup()
  const applicationUrl = 'https://job-boards.greenhouse.io/example/jobs/12345?gh_src=linkedin'
  let saved: Opportunity | null = null
  const fetchMock = vi.fn(async (path: string, options?: RequestInit) => {
    if (path.startsWith('/api/posting-preview?')) return reply(200, { status: 'found', title: 'Software Intern', company: 'Example Co' })
    if (options?.method === 'POST') {
      saved = { ...JSON.parse(String(options.body)), id: 1, stage: 'SAVED' }
      return reply(201, saved)
    }
    return reply(200, [])
  })
  vi.stubGlobal('fetch', fetchMock)

  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Find' }))
  await user.type(screen.getByLabelText('Posting link'), applicationUrl)
  await user.click(screen.getByRole('button', { name: 'Review for board' }))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByLabelText('Role title')).toHaveProperty('value', 'Software Intern')
  expect(within(dialog).getByLabelText('Company')).toHaveProperty('value', 'Example Co')
  expect(within(dialog).getByLabelText('Application URL')).toHaveProperty('value', applicationUrl)
  expect(saved).toBeNull()
  await user.clear(within(dialog).getByLabelText('Role title'))
  await user.type(within(dialog).getByLabelText('Role title'), 'Platform Intern')
  await user.click(within(dialog).getByRole('button', { name: 'Add opportunity' }))
  expect(await screen.findByRole('heading', { name: 'Platform Intern' })).not.toBeNull()
  expect(saved).toMatchObject({ title: 'Platform Intern', company: 'Example Co', applicationUrl })
  expect(fetchMock).toHaveBeenCalledWith(`/api/posting-preview?url=${encodeURIComponent(applicationUrl)}`, undefined)
})

it('allows manual entry when Greenhouse lookup fails', async () => {
  const user = userEvent.setup()
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    if (path.startsWith('/api/posting-preview?')) throw new Error('Offline')
    return reply(200, [])
  }))

  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Find' }))
  await user.type(screen.getByLabelText('Posting link'), 'https://boards.greenhouse.io/example/jobs/123')
  await user.click(screen.getByRole('button', { name: 'Review for board' }))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText(/Could not look up this posting/)).not.toBeNull()
  expect(within(dialog).getByLabelText('Role title')).toHaveProperty('value', '')
  expect(within(dialog).getByLabelText('Company')).toHaveProperty('value', '')
})

it('edits a card and shows the existing card on a duplicate URL', async () => {
  const user = userEvent.setup()
  const cards: Opportunity[] = [
    { id: 1, title: 'Software Intern', company: 'Example Co', applicationUrl: 'https://example.com/one', stage: 'APPLIED' },
    { id: 2, title: 'Research Intern', company: 'Other Co', applicationUrl: 'https://example.com/two', stage: 'SAVED' },
  ]
  const fetchMock = vi.fn(async (_path: string, options?: RequestInit) => {
    if (!options?.method) return reply(200, cards)
    if (options.method === 'PATCH') {
      const updated = JSON.parse(String(options.body))
      const duplicate = cards.find((card) => card.id !== 1 && card.applicationUrl === updated.applicationUrl)
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
  await user.clear(within(dialog).getByLabelText('Application URL'))
  await user.type(within(dialog).getByLabelText('Application URL'), 'https://example.com/two')
  await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
  expect(await within(dialog).findByText('Already on your board')).not.toBeNull()
  expect(cards[0].applicationUrl).toBe('https://example.com/one')
})

it('confirms deletion, remembers the choice, and lets the user restore confirmations', async () => {
  const user = userEvent.setup()
  let cards: Opportunity[] = [
    { id: 1, title: 'First Intern', company: 'Example Co', applicationUrl: 'https://example.com/one', stage: 'SAVED' },
    { id: 2, title: 'Second Intern', company: 'Other Co', applicationUrl: 'https://example.com/two', stage: 'APPLIED' },
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
