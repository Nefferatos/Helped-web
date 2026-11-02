import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  LoaderCircle,
  Plane,
  RefreshCw,
  Search,
  Stethoscope,
} from 'lucide-react'
import { getAgencyAdminAuthHeaders } from '@/lib/agencyAdminAuth'

type ContractorTask = {
  id: string
  placement_id: string
  task_type: string
  status: string
  due_at: string | null
  completed_at: string | null
  completion_notes: string | null
  completed_by?: string | null
  assigned_by?: string
  assignment_note?: string
  acknowledged_at?: string | null
  acknowledged_by?: string | null
  acknowledgement_note?: string
  acknowledgement_token_expires_at?: string | null
  completion_reported_at?: string | null
  completion_report_note?: string
  completion_reported_by?: string | null
  contractors?: { name?: string } | null
  placements?: { maid_reference_code?: string | null } | null
}
type Contractor = { id: string; name: string; phone: string; active: boolean }

type MilestoneEvent = { actor?: string; notes?: string; completedAt?: string }
type Placement = {
  id: string; maid_reference_code: string | null; notes?: string | null; flight_booked: boolean; medical_completed: boolean; sip_completed: boolean; handover_completed: boolean
  milestone_events?: Partial<Record<'flight' | 'medical' | 'sip' | 'handover', MilestoneEvent | null>>
}
type MaidSummary = { fullName?: string; photoDataUrl?: string; photoDataUrls?: string[] }

const milestoneForTask = (taskType: string) => {
  const value = taskType.toLowerCase()
  if (value.includes('flight')) return { label: 'Flight booked', icon: Plane }
  if (value.includes('medical')) return { label: 'Medical completed', icon: Stethoscope }
  if (value.includes('handover')) return { label: 'Handover completed', icon: HeartHandshake }
  if (value.includes('sip')) return { label: 'SIP completed', icon: CheckCircle2 }
  return { label: 'Arrival task completed', icon: ClipboardList }
}

const request = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...getAgencyAdminAuthHeaders(),
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to update placement task')
  return body
}

const showDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not set'

function PlacementMilestoneCard({
  placement,
  maidName,
  maidPhotoUrl,
  note,
  savingId,
  noteSaved,
  onNoteChange,
  onSaveNote,
  onComplete,
}: {
  placement: Placement
  maidName?: string
  maidPhotoUrl?: string
  note: string
  savingId: string | null
  noteSaved: boolean
  onNoteChange: (value: string) => void
  onSaveNote: () => void
  onComplete: (milestone: 'flight' | 'medical' | 'sip' | 'handover') => void
}) {
  const milestones = [
    ['flight', 'Flight', placement.flight_booked],
    ['medical', 'Medical', placement.medical_completed],
    ['sip', 'SIP', placement.sip_completed],
    ['handover', 'Handover', placement.handover_completed],
  ] as const

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-sm font-semibold text-emerald-800">
          {maidPhotoUrl ? <img src={maidPhotoUrl} alt={maidName || 'Maid profile'} className="h-full w-full object-cover" loading="lazy" /> : (maidName || placement.maid_reference_code || placement.id).split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-black">{maidName || placement.maid_reference_code || 'Maid profile'}</h3>
          <p className="truncate text-xs text-black">{placement.maid_reference_code || placement.id}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-black">Add a note, then mark each finished step. SIP means Settling-In Programme.</p>
      <label className="mt-2 block text-xs font-semibold text-black" htmlFor={`placement-note-${placement.id}`}>
        Staff note <span className="font-normal text-black">(optional)</span>
      </label>
      <textarea
        id={`placement-note-${placement.id}`}
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        rows={1}
        maxLength={2000}
        placeholder="Add a brief placement update"
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-black placeholder:text-black outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
      <div className="mt-1.5 flex items-center gap-3">
        <button
          type="button"
          onClick={onSaveNote}
          disabled={savingId === `${placement.id}-note`}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingId === `${placement.id}-note` ? 'Saving note…' : 'Save note'}
        </button>
        {noteSaved && <span role="status" className="text-sm font-medium text-emerald-700">Note saved.</span>}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {milestones.map(([key, label, done]) => {
          const actionId = `${placement.id}-${key}`
          return (
            <button
              key={key}
              type="button"
              disabled={done || savingId === actionId}
              onClick={() => onComplete(key)}
              title={key === 'sip' ? 'SIP means Settling-In Programme' : undefined}
              className={`min-h-8 rounded-lg px-2 py-1.5 text-xs font-semibold ${done ? 'cursor-default bg-emerald-100 text-emerald-800' : 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60'}`}
            >
              {done ? `✓ ${label === 'SIP' ? 'SIP complete' : `${label} done`}` : savingId === actionId ? 'Saving…' : `Mark ${label} done`}
            </button>
          )
        })}
      </div>
    </article>
  )
}

export default function ContractorTasksPage({ onPlacementChange }: { onPlacementChange?: () => Promise<void> }) {
  const [tasks, setTasks] = useState<ContractorTask[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [assignmentDraft, setAssignmentDraft] = useState({ placementId: '', contractorId: '', taskType: '', dueAt: '', note: '' })
  const [placements, setPlacements] = useState<Placement[]>([])
  const [maidSummaries, setMaidSummaries] = useState<Record<string, MaidSummary>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [placementNotes, setPlacementNotes] = useState<Record<string, string>>({})
  const [savedNoteIds, setSavedNoteIds] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [acknowledgementLinks, setAcknowledgementLinks] = useState<Record<string, { url: string; expiresAt: string }>>({})
  const [error, setError] = useState('')
  const [placementSearch, setPlacementSearch] = useState('')
  const [placementPage, setPlacementPage] = useState(1)
  const placementsPerPage = 6
  const placementsWithoutTasks = placements.filter(
    (placement) => !tasks.some((task) => task.placement_id === placement.id),
  )
  const filteredPlacementRows = placementsWithoutTasks.filter((placement) =>
    `${placement.maid_reference_code ?? ''} ${placement.id}`.toLowerCase().includes(placementSearch.trim().toLowerCase()),
  )
  const placementPageCount = Math.max(1, Math.ceil(filteredPlacementRows.length / placementsPerPage))
  const visiblePlacementRows = filteredPlacementRows.slice((placementPage - 1) * placementsPerPage, placementPage * placementsPerPage)
  const visiblePlacementRefKey = visiblePlacementRows.map((placement) => placement.maid_reference_code || '').filter(Boolean).join('|')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [taskData, placementData, contractorData] = await Promise.all([
        request<{ tasks?: ContractorTask[] }>('/api/contractor/tasks'),
        request<{ placements?: Placement[] }>('/api/operations-board'),
        request<{ contractors?: Contractor[] }>('/api/contractor/contractors'),
      ])
      setTasks(taskData.tasks || [])
      setPlacements(placementData.placements || [])
      setContractors(contractorData.contractors || [])
      setPlacementNotes((current) => Object.fromEntries(
        (placementData.placements || []).map((placement) => [placement.id, current[placement.id] ?? placement.notes ?? '']),
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load placement tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (assignmentDraft.placementId || !placements.length) return
    setAssignmentDraft((current) => ({ ...current, placementId: placements[0].id }))
  }, [assignmentDraft.placementId, placements])
  useEffect(() => { setPlacementPage((current) => Math.min(current, placementPageCount)) }, [placementPageCount])
  useEffect(() => {
    const references = visiblePlacementRefKey.split('|').filter(Boolean)
    const missingReferences = references.filter((reference) => !maidSummaries[reference])
    if (!missingReferences.length) return
    let cancelled = false
    void Promise.all(missingReferences.map(async (reference) => {
      try {
        const result = await request<{ maid?: MaidSummary }>(`/api/maids/${encodeURIComponent(reference)}`)
        return [reference, result.maid ?? {}] as const
      } catch {
        return [reference, {}] as const
      }
    })).then((entries) => {
      if (!cancelled) setMaidSummaries((current) => ({ ...current, ...Object.fromEntries(entries) }))
    })
    return () => { cancelled = true }
  }, [visiblePlacementRefKey, maidSummaries])

  const complete = async (task: ContractorTask) => {
    setSavingId(task.id)
    setError('')
    try {
      const data = await request<{ task?: ContractorTask }>(`/api/contractor/tasks/${task.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ notes: notes[task.id] || '' }),
      })
      if (data.task) setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, ...data.task } : item)))
      else await load()
      await onPlacementChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete placement task')
    } finally {
      setSavingId(null)
    }
  }

  const assignContractorTask = async () => {
    if (!assignmentDraft.placementId || !assignmentDraft.contractorId || !assignmentDraft.taskType.trim()) {
      setError('Choose a placement and contractor, then enter the task to assign.')
      return
    }
    setSavingId('new-contractor-task')
    setError('')
    try {
      const result = await request<{ task: ContractorTask; acknowledgementUrl: string; acknowledgementExpiresAt: string }>(`/api/contractor/placements/${encodeURIComponent(assignmentDraft.placementId)}/tasks`, {
        method: 'POST', body: JSON.stringify({ contractorId: assignmentDraft.contractorId, taskType: assignmentDraft.taskType, dueAt: assignmentDraft.dueAt || undefined, note: assignmentDraft.note }),
      })
      setAcknowledgementLinks((current) => ({ ...current, [result.task.id]: { url: result.acknowledgementUrl, expiresAt: result.acknowledgementExpiresAt } }))
      setAssignmentDraft((current) => ({ ...current, taskType: '', dueAt: '', note: '' }))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to assign contractor task')
    } finally { setSavingId(null) }
  }

  const createAcknowledgementLink = async (task: ContractorTask) => {
    setSavingId(`${task.id}-link`)
    setError('')
    try {
      const result = await request<{ acknowledgementUrl: string; acknowledgementExpiresAt: string }>(`/api/contractor/tasks/${encodeURIComponent(task.id)}/acknowledgement-link`, { method: 'POST', body: JSON.stringify({}) })
      setAcknowledgementLinks((current) => ({ ...current, [task.id]: { url: result.acknowledgementUrl, expiresAt: result.acknowledgementExpiresAt } }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create acknowledgement link')
    } finally { setSavingId(null) }
  }

  const copyAcknowledgementLink = async (taskId: string) => {
    const link = acknowledgementLinks[taskId]?.url
    if (!link) return
    try { await navigator.clipboard.writeText(link) }
    catch { setError('Could not copy the link automatically. Select and copy it from the link field.') }
  }

  const recordAcknowledgement = async (task: ContractorTask) => {
    setSavingId(`${task.id}-ack`)
    setError('')
    try {
      const result = await request<{ task?: ContractorTask }>(`/api/contractor/tasks/${encodeURIComponent(task.id)}/acknowledge`, {
        method: 'POST', body: JSON.stringify({ note: notes[task.id] || '' }),
      })
      if (result.task) setTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...result.task } : item))
      else await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record contractor acknowledgement')
    } finally { setSavingId(null) }
  }

  const completePlacementMilestone = async (placement: Placement, milestone: 'flight' | 'medical' | 'sip' | 'handover') => {
    setSavingId(`${placement.id}-${milestone}`)
    setError('')
    try {
      await request(`/api/contractor/placements/${placement.id}/milestones/${milestone}`, {
        method: 'POST', body: JSON.stringify({ notes: placementNotes[placement.id] || '' }),
      })
      await Promise.all([load(), onPlacementChange?.()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update placement milestone')
    } finally { setSavingId(null) }
  }

  const savePlacementNote = async (placement: Placement) => {
    setSavingId(`${placement.id}-note`)
    setError('')
    setSavedNoteIds((current) => {
      const next = new Set(current)
      next.delete(placement.id)
      return next
    })
    try {
      const result = await request<{ placement: { notes: string | null } }>(`/api/operations-board/placements/${placement.id}/notes`, {
        method: 'PUT',
        body: JSON.stringify({ notes: placementNotes[placement.id] || '' }),
      })
      setPlacementNotes((current) => ({ ...current, [placement.id]: result.placement.notes || '' }))
      setSavedNoteIds((current) => new Set(current).add(placement.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save staff note')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Agency portal · Operations center</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Placement checklist</h2>
          <p className="mt-1 max-w-2xl text-xs text-black">Mark each completed step. The overview updates automatically.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-black transition hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh page
        </button>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {placements.length > 0 && <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm"><h3 className="font-bold text-black">Assign contractor task</h3><p className="mt-1 text-xs text-slate-700">Each assignment creates a secure seven-day link for acknowledgement and a later completion report. Staff must verify reported work.</p>{contractors.length === 0 ? <p className="mt-3 text-sm text-amber-800">Add an active contractor record for this agency before assigning tasks.</p> : <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5"><select aria-label="Placement" value={assignmentDraft.placementId} onChange={(event) => setAssignmentDraft((current) => ({ ...current, placementId: event.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm text-black">{placements.map((placement) => <option key={placement.id} value={placement.id}>{placement.maid_reference_code || placement.id}</option>)}</select><select aria-label="Contractor" value={assignmentDraft.contractorId} onChange={(event) => setAssignmentDraft((current) => ({ ...current, contractorId: event.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm text-black"><option value="">Choose contractor</option>{contractors.map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.name}</option>)}</select><input aria-label="Task to assign" value={assignmentDraft.taskType} onChange={(event) => setAssignmentDraft((current) => ({ ...current, taskType: event.target.value }))} placeholder="Task description" maxLength={120} className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-black" /><input aria-label="Task due date" type="datetime-local" value={assignmentDraft.dueAt} onChange={(event) => setAssignmentDraft((current) => ({ ...current, dueAt: event.target.value }))} className="h-10 rounded-lg border border-slate-300 px-2 text-sm text-black" /><button type="button" onClick={() => void assignContractorTask()} disabled={savingId === 'new-contractor-task'} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-bold text-white disabled:opacity-60">{savingId === 'new-contractor-task' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}Assign task</button><textarea aria-label="Assignment note" value={assignmentDraft.note} onChange={(event) => setAssignmentDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Assignment details (optional)" maxLength={2000} rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-black md:col-span-2 xl:col-span-5" /></div>}</div>}

      {Object.entries(acknowledgementLinks).map(([taskId, link]) => <div key={taskId} className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm"><p className="font-bold text-sky-950">Share this secure link directly with the assigned contractor</p><p className="mt-1 text-xs text-sky-900">It expires {showDate(link.expiresAt)}. The contractor can acknowledge the assignment and later report completion. Staff must verify reported work.</p><div className="mt-2 flex gap-2"><input readOnly aria-label="Contractor acknowledgement link" value={link.url} className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs text-black" /><button type="button" onClick={() => void copyAcknowledgementLink(taskId)} className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-950">Copy link</button></div></div>)}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-black"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading placement tasks…</div>
      ) : placements.length === 0 && tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ClipboardList className="mx-auto h-8 w-8 text-black" /><h3 className="mt-3 font-semibold text-black">No active placements yet</h3><p className="mt-2 text-sm text-black">Once a worker is assigned, this checklist will appear here.</p></div>
      ) : (
        <div className="space-y-3">
          {placementsWithoutTasks.length > 0 && (
            <div className="space-y-2">
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-black">Placement steps</h3>
                  <p className="mt-1 text-xs text-black">Search by maid reference, then update milestones.</p>
                </div>
                <label className="relative block w-full sm:max-w-sm">
                  <span className="sr-only">Search placements</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input value={placementSearch} onChange={(event) => { setPlacementSearch(event.target.value); setPlacementPage(1) }} placeholder="Search maid reference…" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-black outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                </label>
              </div>
              <div className="grid gap-2">
                {visiblePlacementRows.map((placement) => (
                  <PlacementMilestoneCard
                    key={placement.id}
                    placement={placement}
                    maidName={maidSummaries[placement.maid_reference_code || '']?.fullName}
                    maidPhotoUrl={maidSummaries[placement.maid_reference_code || '']?.photoDataUrls?.[0] || maidSummaries[placement.maid_reference_code || '']?.photoDataUrl}
                    note={placementNotes[placement.id] || ''}
                    savingId={savingId}
                    noteSaved={savedNoteIds.has(placement.id)}
                    onNoteChange={(value) => {
                      setPlacementNotes((current) => ({ ...current, [placement.id]: value }))
                      setSavedNoteIds((current) => {
                        const next = new Set(current)
                        next.delete(placement.id)
                        return next
                      })
                    }}
                    onSaveNote={() => void savePlacementNote(placement)}
                    onComplete={(milestone) => void completePlacementMilestone(placement, milestone)}
                  />
                ))}
              </div>
              {filteredPlacementRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-black">No placements match “{placementSearch}”.</div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm font-medium text-black">Showing {((placementPage - 1) * placementsPerPage) + 1}–{Math.min(placementPage * placementsPerPage, filteredPlacementRows.length)} of {filteredPlacementRows.length} placements</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPlacementPage((page) => Math.max(1, page - 1))} disabled={placementPage <= 1} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-black transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45">Previous</button>
                    <span aria-live="polite" className="min-w-16 text-center text-sm font-semibold text-black">{placementPage} / {placementPageCount}</span>
                    <button type="button" onClick={() => setPlacementPage((page) => Math.min(placementPageCount, page + 1))} disabled={placementPage >= placementPageCount} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-black transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {tasks.length > 0 && <div className="grid gap-4 xl:grid-cols-2">
          {tasks.map((task) => {
            const milestone = milestoneForTask(task.task_type)
            const MilestoneIcon = milestone.icon
            const isComplete = task.status.toUpperCase() === 'COMPLETED'
            const isCompletionReported = task.status.toUpperCase() === 'COMPLETION_REPORTED' || Boolean(task.completion_reported_at)
            const isAcknowledged = Boolean(task.acknowledged_at)
            const completedBy = task.completed_by?.replace(/^user:/, '') || 'Agency staff'
            return (
              <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><MilestoneIcon className="h-5 w-5" /></div>
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-black">Placement milestone</p><h3 className="mt-0.5 font-bold text-black">{milestone.label}</h3></div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isComplete ? 'bg-emerald-100 text-emerald-800' : isCompletionReported ? 'bg-amber-100 text-amber-900' : isAcknowledged ? 'bg-sky-100 text-sky-900' : 'bg-amber-100 text-amber-800'}`}>{isComplete ? 'Verified complete' : isCompletionReported ? 'Reported · staff review' : isAcknowledged ? 'Acknowledged' : 'Action needed'}</span>
                </div>
                <p className="mt-4 text-sm text-black">{isComplete ? 'This milestone is recorded in the placement overview.' : 'Completing this updates the placement progress in Operations Center.'}</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-y border-slate-100 py-4 text-sm">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-black">Placement</dt><dd className="mt-1 font-medium text-black">{task.placements?.maid_reference_code || task.placement_id}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-black">Assigned to</dt><dd className="mt-1 font-medium text-black">{task.contractors?.name || 'Agency staff'}</dd>{task.assigned_by && <dd className="mt-1 text-xs text-slate-700">Assigned by {task.assigned_by}</dd>}</div>
                  <div className="col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-black">Due</dt><dd className="mt-1 font-medium text-black">{showDate(task.due_at)}</dd></div>
                </dl>
                {!isCompletionReported && !isAcknowledged && !isComplete && <div className="mb-3">{acknowledgementLinks[task.id] ? <div className="flex gap-2"><input readOnly aria-label="Contractor acknowledgement link" value={acknowledgementLinks[task.id].url} className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-black" /><button type="button" onClick={() => void copyAcknowledgementLink(task.id)} className="rounded-lg border border-sky-300 px-3 text-xs font-bold">Copy link</button></div> : <button type="button" onClick={() => void createAcknowledgementLink(task)} disabled={savingId === `${task.id}-link`} className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-900 disabled:opacity-60">{savingId === `${task.id}-link` ? 'Creating link…' : 'Create contractor acknowledgement link'}</button>}</div>}
                {isComplete ? (
                  <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm"><p className="font-semibold text-emerald-900">Completed {showDate(task.completed_at)}</p><p className="mt-1 text-emerald-800">Marked by: {completedBy}</p>{task.completion_notes && <p className="mt-2 whitespace-pre-wrap text-emerald-800">{task.completion_notes}</p>}</div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {isAcknowledged ? <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-950">Acknowledgement recorded by {task.acknowledged_by || 'Agency staff'} · {showDate(task.acknowledged_at)}{task.acknowledgement_note ? ` · ${task.acknowledgement_note}` : ''}</p> : <button type="button" onClick={() => void recordAcknowledgement(task)} disabled={savingId === `${task.id}-ack`} className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-900 disabled:opacity-60">{savingId === `${task.id}-ack` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Record contractor acknowledgement</button>}
                    {isCompletionReported && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">Contractor reported completion {showDate(task.completion_reported_at ?? null)}{task.completion_report_note ? ` · ${task.completion_report_note}` : ''}. Review the report before verifying.</p>}
                    <label className="block text-sm font-semibold text-black" htmlFor={`task-notes-${task.id}`}>{isCompletionReported ? 'Staff verification note (required)' : 'Completion notes'} {!isCompletionReported && <span className="font-normal text-black">(optional)</span>}</label>
                    <textarea id={`task-notes-${task.id}`} value={notes[task.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [task.id]: event.target.value }))} placeholder={isCompletionReported ? 'Record what you reviewed to verify the work' : 'Add booking reference, medical result, handover details, or any issue…'} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-black placeholder:text-black outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                    <button type="button" onClick={() => void complete(task)} disabled={savingId === task.id} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
                      {savingId === task.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {isCompletionReported ? `Verify and mark ${milestone.label}` : `Mark ${milestone.label}`}
                    </button>
                  </div>
                )}
              </article>
            )
          })}
          </div>}
        </div>
      )}
    </section>
  )
}
