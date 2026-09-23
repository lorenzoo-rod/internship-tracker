import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from 'react'
import {
  createOpportunity,
  deleteOpportunity,
  DuplicateOpportunityError,
  listOpportunities,
  STAGES,
  updateStage,
  updateOpportunity,
  type NewOpportunity,
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
  const link = postingLink(opportunity.postingUrl)

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
          {postingHost(opportunity.postingUrl)} <span aria-hidden="true">↗</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <span className="posting-link">{opportunity.postingUrl}</span>
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
}: {
  onClose: () => void
  onSaved: (opportunity: Opportunity) => void
  editing?: Opportunity
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
      postingUrl: String(form.get('postingUrl') ?? '').trim(),
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
        <form onSubmit={submit}>
          <label htmlFor="title">Role title</label>
          <input id="title" name="title" type="text" defaultValue={editing?.title} placeholder="e.g. Product Design Intern" maxLength={255} required autoFocus />
          <label htmlFor="company">Company</label>
          <input id="company" name="company" type="text" defaultValue={editing?.company} placeholder="e.g. Acme Studio" maxLength={255} required />
          <label htmlFor="postingUrl">Posting URL</label>
          <input id="postingUrl" name="postingUrl" type="url" defaultValue={editing?.postingUrl} placeholder="https://company.com/careers/internship" maxLength={2048} required />
          <p className="field-note">A matching URL will show the card you already saved.</p>

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
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [editing, setEditing] = useState<Opportunity | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<Opportunity | null>(null)
  const [skipDeleteConfirmation, setSkipDeleteConfirmation] = useState(() => window.localStorage.getItem(SKIP_DELETE_CONFIRMATION_KEY) === 'true')
  const [movingId, setMovingId] = useState<number | null>(null)
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null)

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
        <span className="workspace-label"><span className="workspace-dot" /> Local workspace</span>
      </header>

      <main>
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
            <button className="button button-primary add-button" type="button" onClick={() => setAdding(true)}>
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
            <div className="board" aria-label="Application stages">
              {STAGES.map((stage) => {
                const cards = opportunities.filter((item) => item.stage === stage)
                return (
                  <section
                    key={stage}
                    className={`board-column column-${stageDetails[stage].color} ${dragOverStage === stage ? 'drop-target' : ''}`}
                    aria-label={`${stageDetails[stage].label} stage`}
                    onDragOver={(event) => { event.preventDefault(); setDragOverStage(stage) }}
                    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverStage(null) }}
                    onDrop={(event) => drop(event, stage)}
                  >
                    <div className="column-heading">
                      <div className="column-title"><span className="stage-dot" /><h3>{stageDetails[stage].label}</h3><span className="stage-count">{cards.length}</span></div>
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
                  </section>
                )
              })}
            </div>
          </div>
        )}
      </main>

      <footer className="site-footer"><span>Internship Hub</span><span>Keep moving forward, one application at a time.</span></footer>
      {adding && <OpportunityFormDialog onClose={() => setAdding(false)} onSaved={(created) => {
        setOpportunities((items) => [...items, created])
        setAdding(false)
        setNotice(`${created.title} added to Saved.`)
      }} />}
      {editing && <OpportunityFormDialog key={editing.id} editing={editing} onClose={() => setEditing(null)} onSaved={(updated) => {
        setOpportunities((items) => items.map((item) => item.id === updated.id ? updated : item))
        setEditing(null)
        setNotice(`${updated.title} updated.`)
      }} />}
      {confirmingDelete && <DeleteOpportunityDialog opportunity={confirmingDelete} onClose={() => setConfirmingDelete(null)} onConfirm={(skip) => remove(confirmingDelete, skip)} />}
    </div>
  )
}

export default App
