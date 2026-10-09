import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  LoaderCircle,
  Plane,
  RefreshCw,
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
  contractors?: { name?: string } | null
  placements?: { maid_reference_code?: string | null } | null
}

type MilestoneEvent = { actor?: string; notes?: string; completedAt?: string }
type Placement = {
  id: string; maid_reference_code: string | null; notes?: string | null; flight_booked: boolean; medical_completed: boolean; sip_completed: boolean; handover_completed: boolean
  milestone_events?: Partial<Record<'flight' | 'medical' | 'sip' | 'handover', MilestoneEvent | null>>
}

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
  note,
  savingId,
  noteSaved,
  onNoteChange,
  onSaveNote,
  onComplete,
}: {
  placement: Placement
  note: string
  savingId: string | null
  noteSaved: boolean
  onNoteChange: (value: string) => void
  onSaveNote: () => void
  onComplete: (milestone: 'flight' | 'medical' | 'handover') => void
}) {
  const milestones = [
    ['flight', 'Flight booked', placement.flight_booked],
    ['medical', 'Medical exam done', placement.medical_completed],
    ['handover', 'Handover completed', placement.handover_completed],
  ] as const

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-black">{placement.maid_reference_code || placement.id}</h3>
      <p className="mt-1 text-sm text-black">Add a note, then mark each finished step.</p>
      <label className="mt-4 block text-sm font-semibold text-black" htmlFor={`placement-note-${placement.id}`}>
        Staff note <span className="font-normal text-black">(optional)</span>
      </label>
      <textarea
        id={`placement-note-${placement.id}`}
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Example: Flight confirmed on 12 Oct; medical passed; handover documents signed"
        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-black placeholder:text-black outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onSaveNote}
          disabled={savingId === `${placement.id}-note`}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingId === `${placement.id}-note` ? 'Saving note…' : 'Save note'}
        </button>
        {noteSaved && <span role="status" className="text-sm font-medium text-emerald-700">Note saved.</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {milestones.map(([key, label, done]) => {
          const actionId = `${placement.id}-${key}`
          return (
            <button
              key={key}
              type="button"
              disabled={done || savingId === actionId}
              onClick={() => onComplete(key)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${done ? 'cursor-default bg-emerald-100 text-emerald-800' : 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60'}`}
            >
              {done ? `✓ ${label}` : savingId === actionId ? 'Saving…' : `Mark ${label}`}
            </button>
          )
        })}
      </div>
    </article>
  )
}

export default function ContractorTasksPage({ onPlacementChange }: { onPlacementChange?: () => Promise<void> }) {
  const [tasks, setTasks] = useState<ContractorTask[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [placementNotes, setPlacementNotes] = useState<Record<string, string>>({})
  const [savedNoteIds, setSavedNoteIds] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const placementsWithoutTasks = placements.filter(
    (placement) => !tasks.some((task) => task.placement_id === placement.id),
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [taskData, placementData] = await Promise.all([
        request<{ tasks?: ContractorTask[] }>('/api/contractor/tasks'),
        request<{ placements?: Placement[] }>('/api/operations-board'),
      ])
      setTasks(taskData.tasks || [])
      setPlacements(placementData.placements || [])
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

  const completePlacementMilestone = async (placement: Placement, milestone: 'flight' | 'medical' | 'handover') => {
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
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Agency portal · Operations center</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Placement checklist</h2>
          <p className="mt-1 max-w-2xl text-sm text-black">Use this page to mark each step as done. The overview screen updates automatically.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-black transition hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Refresh page
        </button>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-black"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading placement tasks…</div>
      ) : placements.length === 0 && tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ClipboardList className="mx-auto h-8 w-8 text-black" /><h3 className="mt-3 font-semibold text-black">No active placements yet</h3><p className="mt-2 text-sm text-black">Once a worker is assigned, this checklist will appear here.</p></div>
      ) : (
        <div className="space-y-5">
          {placementsWithoutTasks.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-black">These placements do not have an assigned task list yet. Mark each step here when it is finished.</p>
              <div className="grid gap-4 xl:grid-cols-2">
                {placementsWithoutTasks.map((placement) => (
                  <PlacementMilestoneCard
                    key={placement.id}
                    placement={placement}
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
            </div>
          )}
          {tasks.length > 0 && <div className="grid gap-4 xl:grid-cols-2">
          {tasks.map((task) => {
            const milestone = milestoneForTask(task.task_type)
            const MilestoneIcon = milestone.icon
            const isComplete = task.status.toUpperCase() === 'COMPLETED'
            const completedBy = task.completed_by?.replace(/^user:/, '') || 'Agency staff'
            return (
              <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><MilestoneIcon className="h-5 w-5" /></div>
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-black">Placement milestone</p><h3 className="mt-0.5 font-bold text-black">{milestone.label}</h3></div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{isComplete ? 'Completed' : 'Action needed'}</span>
                </div>
                <p className="mt-4 text-sm text-black">{isComplete ? 'This milestone is recorded in the placement overview.' : 'Completing this updates the placement progress in Operations Center.'}</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-y border-slate-100 py-4 text-sm">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-black">Placement</dt><dd className="mt-1 font-medium text-black">{task.placements?.maid_reference_code || task.placement_id}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-black">Assigned to</dt><dd className="mt-1 font-medium text-black">{task.contractors?.name || 'Agency staff'}</dd></div>
                  <div className="col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-black">Due</dt><dd className="mt-1 font-medium text-black">{showDate(task.due_at)}</dd></div>
                </dl>
                {isComplete ? (
                  <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm"><p className="font-semibold text-emerald-900">Completed {showDate(task.completed_at)}</p><p className="mt-1 text-emerald-800">Marked by: {completedBy}</p>{task.completion_notes && <p className="mt-2 whitespace-pre-wrap text-emerald-800">{task.completion_notes}</p>}</div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <label className="block text-sm font-semibold text-black" htmlFor={`task-notes-${task.id}`}>Completion notes <span className="font-normal text-black">(optional)</span></label>
                    <textarea id={`task-notes-${task.id}`} value={notes[task.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="Add booking reference, medical result, handover details, or any issue…" rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-black placeholder:text-black outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                    <button type="button" onClick={() => void complete(task)} disabled={savingId === task.id} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
                      {savingId === task.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Mark {milestone.label}
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
