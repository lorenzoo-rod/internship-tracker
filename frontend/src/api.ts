export const STAGES = ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER', 'CLOSED'] as const

export type Stage = (typeof STAGES)[number]

export type Opportunity = {
  id: number
  title: string
  company: string
  discoveryUrl?: string | null
  applicationUrl: string | null
  statusUrl?: string | null
  statusUrlMatchId?: number | null
  stage: Stage
}

export type NewOpportunity = Pick<Opportunity, 'title' | 'company'> & {
  discoveryUrl: string | null
  applicationUrl: string | null
  statusUrl: string | null
}
export type BrowserDraft = { applicationUrl: string; discoveryUrl?: string; title?: string; company?: string }

export type PostingPreview = { status: 'found' | 'unsupported' | 'unavailable'; title: string | null; company: string | null }

export class DuplicateOpportunityError extends Error {
  constructor(public existing: Opportunity) {
    super('This posting is already on your board.')
  }
}

declare global {
  interface Window {
    trackerApi?: {
      request: (path: string, method: string, body: string | null) => Promise<{ status: number; body: unknown }>
      backup: () => Promise<{ canceled: boolean; path?: string; bytes?: number }>
      onBrowserDraft?: (callback: (draft: BrowserDraft) => void) => () => void
    }
  }
}

async function request<T>(fullPath: string, options?: RequestInit): Promise<T> {
  let status: number
  let body: unknown
  try {
    if (window.trackerApi) {
      const result = await window.trackerApi.request(
        fullPath,
        options?.method ?? 'GET',
        typeof options?.body === 'string' ? options.body : null,
      )
      status = result.status
      body = result.body
    } else {
      const response = await fetch(fullPath, options)
      status = response.status
      body = status === 204 ? null : await response.json()
    }
  } catch {
    throw new Error('Cannot reach the tracker API. Check that the Spring Boot service is running.')
  }

  if (status === 409 && body && typeof body === 'object') {
    const conflict = body as { code?: string; existing?: Opportunity }
    if (conflict.code === 'DUPLICATE_POSTING_URL' && conflict.existing) {
      throw new DuplicateOpportunityError(conflict.existing)
    }
  }

  if (status < 200 || status >= 300) {
    throw new Error(`The tracker API returned ${status}. Please try again.`)
  }

  return body as T
}

const jsonHeaders = { 'Content-Type': 'application/json' }

export function listOpportunities(): Promise<Opportunity[]> {
  return request<Opportunity[]>('/api/opportunities')
}

export function createOpportunity(opportunity: NewOpportunity): Promise<Opportunity> {
  return request<Opportunity>('/api/opportunities', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(opportunity),
  })
}

export function updateStage(id: number, stage: Stage): Promise<Opportunity> {
  return request<Opportunity>(`/api/opportunities/${id}/stage`, {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify({ stage }),
  })
}

export function updateOpportunity(id: number, opportunity: NewOpportunity): Promise<Opportunity> {
  return request<Opportunity>(`/api/opportunities/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify(opportunity),
  })
}

export function deleteOpportunity(id: number): Promise<void> {
  return request<void>(`/api/opportunities/${id}`, { method: 'DELETE' })
}

export function previewPosting(url: string): Promise<PostingPreview> {
  return request<PostingPreview>(`/api/posting-preview?url=${encodeURIComponent(url)}`)
}
