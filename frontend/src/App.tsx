import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from 'react'
import {
  createOpportunity,
  deleteOpportunity,
  DuplicateOpportunityError,
  listOpportunities,
  previewPosting,
  STAGES,
  updateStage,
  updateOpportunity,
  type NewOpportunity,
  type BrowserDraft,
  type Opportunity,
  type Stage,
} from './api'

const stageDetails: Record<Stage, { label: string; description: string; color: string }> = {
  SAVED: { label: 'Saved', description: 'Worth a closer look', color: 'sand' },
  APPLIED: { label: 'Applied', description: 'Application sent', color: 'blue' },
  INTERVIEWING: { label: 'Interviewing', description: 'Conversations underway', color: 'violet' },
  OFFER: { label: 'Offer', description: 'Good news arrived', color: 'green' },
  CLOSED: { label: 'Closed', description: 'The process is complete', color: 'gray' },
}

const SKIP_DELETE_CONFIRMATION_KEY = 'internshipHub.skipDeleteConfirmation'
const LINKEDIN_JOBS_URL = 'https://www.linkedin.com/jobs/'
const MY_GREENHOUSE_URL = 'https://my.greenhouse.io/'

function postingLink(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null
  } catch {
    return null
  }
}

function postingHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function isGreenhouseJobLink(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
      && ['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(parsed.hostname.toLowerCase())
      && /^\/[a-zA-Z0-9_-]+\/jobs\/\d+\/?$/.test(parsed.pathname)
  } catch {
    return false
  }
}

function isDiscoveryLink(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host === 'linkedin.com' || host.endsWith('.linkedin.com')
      || host === 'joinhandshake.com' || host.endsWith('.joinhandshake.com')
  } catch { return false }
}

function OpportunityCard({
  opportunity,
  moving,
  onMove,
  onEdit,
  onDelete,
}: {
  opportunity: Opportunity
  moving: boolean
  onMove: (id: number, stage: Stage) => void
  onEdit: (opportunity: Opportunity) => void
  onDelete: (opportunity: Opportunity) => void
}) {
  const primaryUrl = opportunity.stage === 'SAVED'
    ? (opportunity.applicationUrl ?? opportunity.discoveryUrl ?? opportunity.statusUrl)
    : (opportunity.statusUrl ?? opportunity.applicationUrl ?? opportunity.discoveryUrl)
  const link = primaryUrl ? postingLink(primaryUrl) : null
  const linkLabel = opportunity.stage === 'SAVED' && opportunity.applicationUrl === primaryUrl
    ? 'Apply' : opportunity.stage !== 'SAVED' && opportunity.statusUrl === primaryUrl ? 'Status' : 'Open link'

  function startDrag(event: DragEvent<HTMLElement>) {
    event.dataTransfer.setData('application/x-internship-opportunity', String(opportunity.id))
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <article
      className={`opportunity-card card-${stageDetails[opportunity.stage].color}`}
      data-opportunity-id={opportunity.id}
      draggable={!moving}
      onDragStart={startDrag}
    >
      <div className="card-heading">
        <div className="company-mark" aria-hidden="true">
          {opportunity.company.trim().charAt(0).toUpperCase()}
        </div>
        <span className="card-company">{opportunity.company}</span>
        <div className="card-actions">
          <button type="button" className="card-action" aria-label={`Edit ${opportunity.title}`} title="Edit" onClick={() => onEdit(opportunity)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
          </button>
          <button type="button" className="card-action" aria-label={`Delete ${opportunity.title}`} title="Delete" onClick={() => onDelete(opportunity)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v7m4-7v7" /></svg>
          </button>
        </div>
      </div>
      <h3>{opportunity.title}</h3>
      {link ? (
        <a className="posting-link" href={link} target="_blank" rel="noreferrer">
          {linkLabel}: {postingHost(primaryUrl!)} <span aria-hidden="true">↗</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <span className="posting-link">No link available</span>
      )}
      <div className="card-footer">
        <label htmlFor={`stage-${opportunity.id}`}>Move to</label>
        <select
          id={`stage-${opportunity.id}`}
          value={opportunity.stage}
          disabled={moving}
          onChange={(event) => onMove(opportunity.id, event.target.value as Stage)}
        >
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>{stageDetails[stage].label}</option>
          ))}
        </select>
      </div>
    </article>
  )
}

function OpportunityFormDialog({
  onClose,
  onSaved,
  editing,
  initial,
  previewMessage,
}: {
  onClose: () => void
  onSaved: (opportunity: Opportunity) => void
  editing?: Opportunity
  initial?: Partial<NewOpportunity>
  previewMessage?: string
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<Opportunity | null>(null)

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setDuplicate(null)
    setSaving(true)

    const form = new FormData(event.currentTarget)
    const opportunity: NewOpportunity = {
      title: String(form.get('title') ?? '').trim(),
      company: String(form.get('company') ?? '').trim(),
      discoveryUrl: String(form.get('discoveryUrl') ?? '').trim() || null,
      applicationUrl: String(form.get('applicationUrl') ?? '').trim() || null,
      statusUrl: String(form.get('statusUrl') ?? '').trim() || null,
    }
    if (!opportunity.discoveryUrl && !opportunity.applicationUrl && !opportunity.statusUrl) {
      setError('Add at least one link before saving.')
      setSaving(false)
      return
    }

    try {
      onSaved(editing ? await updateOpportunity(editing.id, opportunity) : await createOpportunity(opportunity))
    } catch (failure) {
      if (failure instanceof DuplicateOpportunityError) {
        setDuplicate(failure.existing)
      } else {
        setError(failure instanceof Error ? failure.message : 'Could not save this opportunity.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-topline">
          <div className="dialog-icon" aria-hidden="true">+</div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <p className="eyebrow">{editing ? 'EDIT OPPORTUNITY' : 'NEW OPPORTUNITY'}</p>
        <h2 id="dialog-title">{editing ? 'Edit your card' : 'Add to your board'}</h2>
        <p className="dialog-intro">{editing ? 'Update the details for this opportunity.' : 'Keep the details you need to follow this internship from first look to final outcome.'}</p>
        {previewMessage && <p className="field-note" role="status">{previewMessage}</p>}
        <form onSubmit={submit}>
          <label htmlFor="title">Role title</label>
          <input id="title" name="title" type="text" defaultValue={editing?.title ?? initial?.title} placeholder="e.g. Product Design Intern" maxLength={255} required autoFocus />
          <label htmlFor="company">Company</label>
          <input id="company" name="company" type="text" defaultValue={editing?.company ?? initial?.company} placeholder="e.g. Acme Studio" maxLength={255} required />
          <label htmlFor="discoveryUrl">Discovery URL</label>
          <input id="discoveryUrl" name="discoveryUrl" type="url" defaultValue={editing?.discoveryUrl ?? initial?.discoveryUrl ?? ''} placeholder="https://www.linkedin.com/jobs/view/..." maxLength={2048} />
          <label htmlFor="applicationUrl">Application URL</label>
          <input id="applicationUrl" name="applicationUrl" type="url" defaultValue={editing?.applicationUrl ?? initial?.applicationUrl ?? ''} placeholder="https://company.com/careers/internship" maxLength={2048} />
          <label htmlFor="statusUrl">Application status URL</label>
          <input id="statusUrl" name="statusUrl" type="url" defaultValue={editing?.statusUrl ?? initial?.statusUrl ?? ''} placeholder="https://company.com/candidate/dashboard" maxLength={2048} />
          <p className="field-note">Add at least one link. An application link already on another card is a duplicate. Discovery-only cards also cannot share a discovery link. Status links may be shared.</p>

          {duplicate && (
            <div className="form-message duplicate-message" role="alert">
              <strong>Already on your board</strong>
              <span>{duplicate.title} at {duplicate.company} is in {stageDetails[duplicate.stage].label}.</span>
              <button type="button" onClick={onClose}>Back to board</button>
            </div>
          )}
          {error && <div className="form-message error-message" role="alert">{error}</div>}

          <div className="dialog-actions">
            <button className="button button-quiet" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add opportunity'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function DeleteOpportunityDialog({ opportunity, onClose, onConfirm }: {
  opportunity: Opportunity
  onClose: () => void
  onConfirm: (skipFutureConfirmations: boolean) => Promise<void>
}) {
  const [skipFutureConfirmations, setSkipFutureConfirmations] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deleting) onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [deleting, onClose])

  async function confirm() {
    setDeleting(true)
    setError(null)
    try {
      await onConfirm(skipFutureConfirmations)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not delete this card.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="dialog-backdrop">
      <section className="dialog delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
        <p className="eyebrow">DELETE OPPORTUNITY</p>
        <h2 id="delete-dialog-title">Delete this card?</h2>
        <p className="dialog-intro"><strong>{opportunity.title}</strong> at {opportunity.company} will be permanently deleted. This cannot be undone.</p>
        <label className="confirmation-choice">
          <input type="checkbox" checked={skipFutureConfirmations} onChange={(event) => setSkipFutureConfirmations(event.target.checked)} />
          Don't ask again on this device
        </label>
        {error && <div className="form-message error-message" role="alert">{error}</div>}
        <div className="dialog-actions">
          <button className="button button-quiet" type="button" disabled={deleting} onClick={onClose}>Cancel</button>
          <button className="button button-danger" type="button" disabled={deleting} onClick={() => void confirm()}>{deleting ? 'Deleting…' : 'Delete card'}</button>
        </div>
      </section>
    </div>
  )
}

function App() {
  const [view, setView] = useState<'board' | 'find'>('board')
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [addDraft, setAddDraft] = useState<Partial<NewOpportunity> | null>(null)
  const [findError, setFindError] = useState<string | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [previewMessage, setPreviewMessage] = useState<string | null>(null)
  const [backingUp, setBackingUp] = useState(false)
  const [editing, setEditing] = useState<Opportunity | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<Opportunity | null>(null)
  const [skipDeleteConfirmation, setSkipDeleteConfirmation] = useState(() => window.localStorage.getItem(SKIP_DELETE_CONFIRMATION_KEY) === 'true')
  const [movingId, setMovingId] = useState<number | null>(null)
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null)
  const [focusedStage, setFocusedStage] = useState<Stage | null>(null)

  useEffect(() => {
    if (!window.trackerApi?.onBrowserDraft) return
    return window.trackerApi.onBrowserDraft((draft: BrowserDraft) => {
      setView('board')
      setEditing(null)
      setAddDraft({
        applicationUrl: draft.applicationUrl,
        discoveryUrl: draft.discoveryUrl ?? null,
        title: draft.title ?? '',
        company: draft.company ?? '',
      })
      setPreviewMessage('Captured from Chrome. Review the application link, title, and company before saving.')
      if (isGreenhouseJobLink(draft.applicationUrl)) {
        void previewPosting(draft.applicationUrl).then((preview) => {
          if (preview.status === 'found') {
            setAddDraft((current) => current?.applicationUrl === draft.applicationUrl
              ? { ...current, title: preview.title || current.title, company: preview.company || current.company }
              : current)
            setPreviewMessage('Details found on Greenhouse. Review and edit them before saving.')
          }
        }).catch(() => {})
      }
    })
  }, [])

  useEffect(() => {
    if (!focusedStage || view !== 'board' || addDraft || editing || confirmingDelete) return
    function leaveFocus(event: KeyboardEvent) {
      if (event.key === 'Escape') setFocusedStage(null)
    }
    window.addEventListener('keydown', leaveFocus)
    return () => window.removeEventListener('keydown', leaveFocus)
  }, [focusedStage, view, addDraft, editing, confirmingDelete])

  function toggleColumnFocus(stage: Stage) {
    setFocusedStage((current) => current === stage ? null : stage)
  }

  async function saveBackup() {
    if (!window.trackerApi?.backup) return
    setBackingUp(true)
    setError(null)
    setNotice(null)
    try {
      const result = await window.trackerApi.backup()
      if (!result.canceled && result.path) setNotice(`Backup saved to ${result.path}`)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save the backup.')
    } finally {
      setBackingUp(false)
    }
  }

  async function remove(opportunity: Opportunity, skipFutureConfirmations = false) {
    await deleteOpportunity(opportunity.id)
    setOpportunities((items) => items.filter((item) => item.id !== opportunity.id))
    setConfirmingDelete(null)
    setNotice(`${opportunity.title} deleted.`)
    if (skipFutureConfirmations) {
      window.localStorage.setItem(SKIP_DELETE_CONFIRMATION_KEY, 'true')
      setSkipDeleteConfirmation(true)
    }
  }

  function requestDelete(opportunity: Opportunity) {
    setNotice(null)
    setError(null)
    if (skipDeleteConfirmation) {
      void remove(opportunity).catch((failure) => setError(failure instanceof Error ? failure.message : 'Could not delete this card.'))
    } else {
      setConfirmingDelete(opportunity)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOpportunities(await listOpportunities())
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not load your board.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function move(id: number, stage: Stage) {
    const current = opportunities.find((item) => item.id === id)
    if (!current || current.stage === stage || movingId !== null) return

    setMovingId(id)
    setError(null)
    setNotice(null)
    try {
      const updated = await updateStage(id, stage)
      setOpportunities((items) => items.map((item) => item.id === id ? updated : item))
      setNotice(`${updated.title} moved to ${stageDetails[stage].label}.`)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not move this card.')
    } finally {
      setMovingId(null)
    }
  }

  function drop(event: DragEvent<HTMLElement>, stage: Stage) {
    event.preventDefault()
    setDragOverStage(null)
    const id = Number(event.dataTransfer.getData('application/x-internship-opportunity'))
    if (Number.isInteger(id) && id > 0) void move(id, stage)
  }

  async function reviewPosting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const url = String(form.get('postingUrl') ?? '').trim()
    const validUrl = postingLink(url)
    if (!validUrl) {
      setFindError('Enter a valid http or https posting link.')
      return
    }
    setFindError(null)
    setLookingUp(true)
    let draft: Partial<NewOpportunity> = isDiscoveryLink(url) ? { discoveryUrl: url } : { applicationUrl: url }
    let message = 'Enter the title and company before saving.'
    try {
      if (isGreenhouseJobLink(url)) {
        const preview = await previewPosting(url)
        if (preview.status === 'found' && preview.title && preview.company) {
          draft = { ...draft, title: preview.title, company: preview.company }
          message = 'Details found on Greenhouse. Review and edit them before saving.'
        } else {
          message = 'Greenhouse details are unavailable. Enter the title and company manually.'
        }
      }
    } catch {
      message = 'Could not look up this posting. Enter the title and company manually.'
    } finally {
      setLookingUp(false)
    }
    setPreviewMessage(message)
    setAddDraft(draft)
  }

  const total = opportunities.length
  const active = opportunities.filter((item) => item.stage !== 'CLOSED').length
  const offers = opportunities.filter((item) => item.stage === 'OFFER').length

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">ih<span>.</span></span>
          <span className="brand-name">internship hub</span>
        </div>
        <nav className="site-nav" aria-label="Main navigation">
          <button type="button" className={view === 'board' ? 'active' : ''} aria-current={view === 'board' ? 'page' : undefined} onClick={() => setView('board')}>Board</button>
          <button type="button" className={view === 'find' ? 'active' : ''} aria-current={view === 'find' ? 'page' : undefined} onClick={() => setView('find')}>Find</button>
        </nav>
        <span className="workspace-label"><span className="workspace-dot" /> Local workspace</span>
      </header>

      <main>
        {view === 'find' ? (
          <section className="find-page" aria-labelledby="find-title">
            <p className="eyebrow">FIND INTERNSHIPS</p>
            <h1 id="find-title">Find your next opportunity<span className="heading-period">.</span></h1>
            <p className="page-subtitle">Browse job boards, then bring the postings you want to track back to Internship Hub.</p>
            <div className="find-grid">
              <section className="find-panel" aria-labelledby="browse-title">
                <span className="find-step">01 / BROWSE</span>
                <h2 id="browse-title">Browse job boards</h2>
                <p>Search LinkedIn or MyGreenhouse in your browser. MyGreenhouse may ask you to sign in. On a company application page, use the Chrome Add to saved extension to send the link here for review, or paste it below.</p>
                <div className="find-links">
                  <a className="button button-primary find-link" href={LINKEDIN_JOBS_URL} target="_blank" rel="noreferrer">Browse LinkedIn Jobs <span aria-hidden="true">↗</span></a>
                  <a className="button button-secondary find-link" href={MY_GREENHOUSE_URL} target="_blank" rel="noreferrer">Browse MyGreenhouse Jobs <span aria-hidden="true">↗</span></a>
                </div>
              </section>
              <section className="find-panel" aria-labelledby="save-posting-title">
                <span className="find-step">02 / SAVE</span>
                <h2 id="save-posting-title">Bring a posting to your board</h2>
                <p>Copy a posting link from your browser. LinkedIn and Handshake links become discovery links; company pages become application links. Review every detail before saving.</p>
                <form className="find-form" onSubmit={reviewPosting}>
                  <label htmlFor="find-posting-url">Posting link</label>
                  <div className="find-form-row">
                    <input id="find-posting-url" name="postingUrl" type="url" placeholder="https://www.linkedin.com/jobs/view/..." maxLength={2048} required disabled={lookingUp} onChange={() => setFindError(null)} />
                    <button className="button button-secondary" type="submit" disabled={lookingUp}>{lookingUp ? 'Looking up details…' : 'Review for board'}</button>
                  </div>
                  {findError && <p className="find-error" role="alert">{findError}</p>}
                </form>
              </section>
            </div>
            <p className="find-note">Your board stays here while you browse. Return anytime to paste a link or check your saved cards.</p>
          </section>
        ) : (
        <>
        <section className="page-heading">
          <div>
            <p className="eyebrow">YOUR APPLICATION TRACKER</p>
            <h1>Keep every opportunity in sight<span className="heading-period">.</span></h1>
            <p className="page-subtitle">One place to save the roles you find and follow each application as it moves forward.</p>
          </div>
          <div className="page-actions">
            {window.trackerApi?.backup && (
              <button className="button button-secondary backup-button" type="button" disabled={backingUp} onClick={() => void saveBackup()}>
                {backingUp ? 'Saving backup…' : 'Save backup'}
              </button>
            )}
            <button className="button button-primary add-button" type="button" onClick={() => setAddDraft({})}>
              <span aria-hidden="true">+</span> Add opportunity
            </button>
          </div>
        </section>

        <section className="overview" aria-label="Board overview">
          <div className="overview-item"><span>Total opportunities</span><strong>{total}</strong></div>
          <div className="overview-item"><span>In progress</span><strong>{active}</strong></div>
          <div className="overview-item"><span>Offers</span><strong>{offers}</strong></div>
          <div className="overview-note"><span className="overview-note-icon" aria-hidden="true">↗</span><span>Move cards as your applications progress.</span></div>
        </section>

        <div className="board-heading">
          <div>
            <p className="eyebrow">PIPELINE</p>
            <h2>Application board</h2>
          </div>
          <div className="board-heading-actions">
            {focusedStage && <button type="button" className="text-button" onClick={() => setFocusedStage(null)}>Show full board</button>}
            {skipDeleteConfirmation && (
              <button type="button" className="text-button" onClick={() => {
                window.localStorage.removeItem(SKIP_DELETE_CONFIRMATION_KEY)
                setSkipDeleteConfirmation(false)
                setNotice('Delete confirmations are on.')
              }}>Turn delete confirmations on</button>
            )}
            <span className="board-help">Drag a card or use its stage menu to move it.</span>
          </div>
        </div>

        {error && (
          <div className="status-banner error-banner" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void load()}>Retry</button>
          </div>
        )}
        {notice && <div className="status-banner success-banner" role="status">{notice}</div>}

        {loading ? (
          <div className="loading-state" role="status">Loading your board…</div>
        ) : (
          <div className="board-scroll">
            <div
              className={`board ${focusedStage ? 'board-focused' : ''}`}
              aria-label="Application stages"
              style={focusedStage ? { gridTemplateColumns: STAGES.map((stage) => stage === focusedStage ? 'minmax(320px, 1fr)' : '88px').join(' ') } : undefined}
            >
              {STAGES.map((stage) => {
                const cards = opportunities.filter((item) => item.stage === stage)
                const collapsed = focusedStage !== null && focusedStage !== stage
                return (
                  <section
                    key={stage}
                    className={`board-column column-${stageDetails[stage].color} ${collapsed ? 'board-column-collapsed' : ''} ${focusedStage === stage ? 'board-column-focused' : ''} ${dragOverStage === stage ? 'drop-target' : ''}`}
                    aria-label={`${stageDetails[stage].label} stage`}
                    aria-description={focusedStage === stage ? 'Press Enter or Space to show the full board' : 'Press Enter or Space to focus this stage'}
                    tabIndex={0}
                    onClick={(event) => {
                      if (!(event.target instanceof Element) || event.target.closest('button, a, input, select, textarea, .opportunity-card')) return
                      toggleColumnFocus(stage)
                    }}
                    onKeyDown={(event) => {
                      if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault()
                        toggleColumnFocus(stage)
                      }
                    }}
                    onDragOver={(event) => { event.preventDefault(); setDragOverStage(stage) }}
                    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverStage(null) }}
                    onDrop={(event) => drop(event, stage)}
                  >
                    {collapsed ? (
                      <button type="button" className="column-tab" aria-label={`Focus ${stageDetails[stage].label} stage, ${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`} onClick={() => setFocusedStage(stage)}>
                        <span className="stage-dot" aria-hidden="true" />
                        <span className="column-tab-label">{stageDetails[stage].label}</span>
                        <span className="stage-count">{cards.length}</span>
                      </button>
                    ) : (
                      <>
                        <div className="column-heading">
                          <div className="column-title">
                            <span className="stage-dot" aria-hidden="true" />
                            <h3>{stageDetails[stage].label}</h3>
                            <span className="stage-count">{cards.length}</span>
                          </div>
                          <p>{stageDetails[stage].description}</p>
                        </div>
                        <div className="column-content">
                          {cards.length === 0 ? (
                            <div className="empty-column">
                              <span className="empty-symbol" aria-hidden="true">＋</span>
                              <span>{stage === 'SAVED' ? 'New opportunities start here' : 'Drop a card here'}</span>
                            </div>
                          ) : cards.map((card) => (
                            <OpportunityCard key={card.id} opportunity={card} moving={movingId === card.id} onMove={(id, target) => void move(id, target)} onEdit={setEditing} onDelete={requestDelete} />
                          ))}
                        </div>
                      </>
                    )}
                  </section>
                )
              })}
            </div>
          </div>
        )}
        </>
        )}
      </main>

      <footer className="site-footer"><span>Internship Hub</span><span>Keep moving forward, one application at a time.</span></footer>
      {addDraft && <OpportunityFormDialog key={JSON.stringify(addDraft)} initial={addDraft} previewMessage={previewMessage ?? undefined} onClose={() => { setAddDraft(null); setPreviewMessage(null) }} onSaved={(created) => {
        setOpportunities((items) => [...items, created])
        setAddDraft(null)
        setPreviewMessage(null)
        setView('board')
        setNotice(created.statusUrlMatchId ? `${created.title} added to Saved. Its status link also appears on card #${created.statusUrlMatchId}.` : `${created.title} added to Saved.`)
      }} />}
      {editing && <OpportunityFormDialog key={editing.id} editing={editing} onClose={() => setEditing(null)} onSaved={(updated) => {
        setOpportunities((items) => items.map((item) => item.id === updated.id ? updated : item))
        setEditing(null)
        setNotice(updated.statusUrlMatchId ? `${updated.title} updated. Its status link also appears on card #${updated.statusUrlMatchId}.` : `${updated.title} updated.`)
      }} />}
      {confirmingDelete && <DeleteOpportunityDialog opportunity={confirmingDelete} onClose={() => setConfirmingDelete(null)} onConfirm={(skip) => remove(confirmingDelete, skip)} />}
    </div>
  )
}

export default App
