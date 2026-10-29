import { FormEvent, useEffect, useState } from 'react'
import { ArrowRight, BookOpen, CheckCircle2, FileAudio, FolderSync, Search, ShieldCheck, Sparkles, UsersRound, Plane, Stethoscope, HeartHandshake, ClipboardList } from 'lucide-react'
import { getAgencyAdminAuthHeaders } from '@/lib/agencyAdminAuth'
import ContractorTasksPage from '@/pages/ContractorTasksPage'

type Placement = { id: string; maid_reference_code: string | null; status: string; flight_booked: boolean; medical_completed: boolean; sip_completed: boolean; handover_completed: boolean }
type KnowledgeSnippet = { id: string; title: string; category: string; content: string; similarity: number }
type Requirements = { service_type?: string; location?: string; max_monthly_salary?: number; availability?: string; preferred_nationalities?: string[]; preferred_languages?: string[]; minimum_experience_years?: number; notes?: string }
type MatchCandidate = { maidId: number; maidReferenceCode: string; maidName: string; score: number; reasons: string[]; manual?: boolean; photoDataUrl?: string }
type ManualMaidOption = { id: number; referenceCode: string; fullName: string; nationality?: string; status?: string; photoDataUrl?: string }
type MatchResponse = { data?: { matches?: MatchCandidate[]; aiUsed?: boolean; fallbackUsed?: boolean } }
type TranscriptResult = { fileName: string; transcript: string }

const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, { ...init, headers: { ...getAgencyAdminAuthHeaders(), ...(init?.headers ?? {}) } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data as T
}

const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)

const getPositiveEmployerId = (value: string): number | null => {
  const employerId = Number(value)
  return Number.isInteger(employerId) && employerId > 0 ? employerId : null
}

// One friendly, rounded field style shared by every input on the page — same
// tokens (background/border/primary) the rest of the app already uses.
const fieldClass = 'w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-black placeholder:text-black outline-none transition-shadow focus:ring-2 focus:ring-primary/40'
const labelClass = 'mb-1.5 block text-sm font-medium text-black'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  )
}

const primaryButton = 'rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90'
const secondaryButton = 'rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted'

// Every subject on the page is one of these — same soft shape, same accent, no clutter.
function Card({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-4 border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-5 sm:px-7">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-sm ring-1 ring-primary/15">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Operations workspace</p>
          <h2 className="mt-0.5 text-lg font-bold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-black">{description}</p>
        </div>
      </div>
      <div className="space-y-5 p-5 sm:p-7">{children}</div>
    </section>
  )
}

const STATS = [
  { key: 'active', label: 'Active placements', icon: ClipboardList },
  { key: 'flight', label: 'Flights booked', icon: Plane },
  { key: 'medical', label: 'Medicals done', icon: Stethoscope },
  { key: 'handover', label: 'Handovers done', icon: HeartHandshake },
] as const

// Layout note: the five sections below used to be stacked in one long
// scroll. They're grouped into tabs instead — Overview, Matching,
// Knowledge, Integrations — so staff land on the one thing they came to
// do instead of scrolling past the other four. The KPI strip and the
// notice banner stay visible above the tabs regardless of which tab is
// open, since those are useful no matter what task someone's doing.
// State, handlers, and API calls below are all unchanged.
const TABS = [
  { key: 'overview' as const, label: 'Overview', icon: ClipboardList, tone: 'text-teal-700 bg-teal-50', buttonTone: 'border-teal-200 bg-teal-50 hover:border-teal-300 hover:bg-teal-100' },
  { key: 'matching' as const, label: 'Match helper', icon: UsersRound, tone: 'text-violet-700 bg-violet-50', buttonTone: 'border-violet-200 bg-violet-50 hover:border-violet-300 hover:bg-violet-100' },
  { key: 'contractor' as const, label: 'Placement steps', icon: ClipboardList, tone: 'text-blue-700 bg-blue-50', buttonTone: 'border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100' },
  { key: 'knowledge' as const, label: 'Staff guide', icon: BookOpen, tone: 'text-amber-700 bg-amber-50', buttonTone: 'border-amber-200 bg-amber-50 hover:border-amber-300 hover:bg-amber-100' },
  { key: 'integrations' as const, label: 'Files & uploads', icon: FolderSync, tone: 'text-rose-700 bg-rose-50', buttonTone: 'border-rose-200 bg-rose-50 hover:border-rose-300 hover:bg-rose-100' },
]
type TabKey = (typeof TABS)[number]['key']

const placementSignal = (placement: Placement) => {
  const flags = [placement.flight_booked, placement.medical_completed, placement.sip_completed, placement.handover_completed]
  const status = placement.status.toLowerCase()
  if (/blocked|attention|overdue|issue|delayed|cancelled|canceled/.test(status)) return { label: 'Needs attention', light: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,.55)]', badge: 'border-red-200 bg-red-50 text-red-800' }
  if (flags.every(Boolean)) return { label: 'Completed', light: 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,.5)]', badge: 'border-green-200 bg-green-50 text-green-800' }
  if (flags.some(Boolean)) return { label: 'In progress', light: 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,.5)]', badge: 'border-blue-200 bg-blue-50 text-blue-800' }
  return { label: 'Not started', light: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,.5)]', badge: 'border-amber-200 bg-amber-50 text-amber-900' }
}

export default function AgencyOperationsCenterPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [placements, setPlacements] = useState<Placement[]>([])
  const [removingPlacementId, setRemovingPlacementId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [employerId, setEmployerId] = useState('')
  const [requirements, setRequirements] = useState<Requirements>({ preferred_nationalities: [], preferred_languages: [] })
  const [matches, setMatches] = useState<MatchCandidate[] | null>(null)
  const [manualMaids, setManualMaids] = useState<ManualMaidOption[]>([])
  const [manualMaidSearch, setManualMaidSearch] = useState('')
  const [manualMaidLoading, setManualMaidLoading] = useState(false)
  const [manualMaidError, setManualMaidError] = useState('')
  const [manualPickerOpen, setManualPickerOpen] = useState(false)
  const [isMatching, setIsMatching] = useState(false)
  const [placementCandidate, setPlacementCandidate] = useState<MatchCandidate | null>(null)
  const [startingPlacementId, setStartingPlacementId] = useState<number | null>(null)
  const [knowledge, setKnowledge] = useState({ sourceKey: '', title: '', category: 'SOP', content: '' })
  const [knowledgeQuery, setKnowledgeQuery] = useState('')
  const [snippets, setSnippets] = useState<KnowledgeSnippet[]>([])
  const [expandedKnowledgeSnippetId, setExpandedKnowledgeSnippetId] = useState<string | null>(null)
  const [driveFile, setDriveFile] = useState<File | null>(null)
  const [driveFolderKey, setDriveFolderKey] = useState('')
  const [driveSyncing, setDriveSyncing] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaLanguage, setMediaLanguage] = useState('en-US')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptResult, setTranscriptResult] = useState<TranscriptResult | null>(null)

  const loadPlacements = async () => {
    try {
      const data = await api<{ placements: Placement[] }>('/api/operations-board')
      setPlacements(data.placements ?? [])
      setNotice('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load operations board')
    }
  }
  useEffect(() => { void loadPlacements() }, [])

  const removeSamplePlacement = async (placement: Placement) => {
    const reference = placement.maid_reference_code || placement.id
    if (!window.confirm(`Remove sample placement ${reference}? This cannot be undone.`)) return
    setRemovingPlacementId(placement.id)
    try {
      await api(`/api/operations-board/placements/${placement.id}/sample`, { method: 'DELETE' })
      setPlacements((current) => current.filter((item) => item.id !== placement.id))
      setNotice(`Removed sample placement ${reference}.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to remove sample placement')
    } finally { setRemovingPlacementId(null) }
  }

  const isSamplePlacement = (placement: Placement) => /^(TEST-|LOCAL-OPS-TEST-)/.test(placement.maid_reference_code || '')

  const loadRequirements = async () => {
    const numericEmployerId = getPositiveEmployerId(employerId)
    if (!numericEmployerId) return setNotice('Enter a positive numeric Employer ID, for example 1042.')
    try {
      const data = await api<{ requirements: Requirements | null }>(`/api/employers/${numericEmployerId}/requirements`)
      setRequirements(data.requirements ?? { preferred_nationalities: [], preferred_languages: [] })
      setNotice(data.requirements ? 'Employer requirements loaded.' : 'No saved requirements yet.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to load requirements') }
  }

  const saveRequirements = async (event: FormEvent) => {
    event.preventDefault()
    const numericEmployerId = getPositiveEmployerId(employerId)
    if (!numericEmployerId) return setNotice('Enter a positive numeric Employer ID, for example 1042.')
    try {
      await api(`/api/employers/${numericEmployerId}/requirements`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        serviceType: requirements.service_type, location: requirements.location, maxMonthlySalary: requirements.max_monthly_salary,
        availability: requirements.availability, preferredNationalities: requirements.preferred_nationalities,
        preferredLanguages: requirements.preferred_languages, minimumExperienceYears: requirements.minimum_experience_years, notes: requirements.notes,
      }) })
      setNotice('Employer requirements saved. Future matches will use them.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to save requirements') }
  }

  const findMatches = async () => {
    const numericEmployerId = getPositiveEmployerId(employerId)
    if (!numericEmployerId) return setNotice('Enter a positive numeric Employer ID, then save the requirements first.')
    setIsMatching(true)
    setMatches(null)
    try {
      const result = await api<MatchResponse>('/api/operations-board/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employerId: numericEmployerId }),
      })
      const shortlist = result.data?.matches ?? []
      const matchesWithPhotos = await Promise.all(shortlist.map(async (match) => {
        try {
          const details = await api<{ maid?: { photoDataUrl?: string; photoDataUrls?: string[] } }>(`/api/maids/${encodeURIComponent(match.maidReferenceCode)}`)
          return { ...match, photoDataUrl: details.maid?.photoDataUrls?.[0] || details.maid?.photoDataUrl || '' }
        } catch {
          return match
        }
      }))
      setMatches(matchesWithPhotos)
      setNotice(shortlist.length ? `Found ${shortlist.length} matching profile${shortlist.length === 1 ? '' : 's'}. Review before contacting an employer.` : 'No matching profiles found. Adjust the saved requirements or review available maid profiles.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to find matching profiles')
    } finally {
      setIsMatching(false)
    }
  }

  const openManualMaidPicker = async () => {
    setManualPickerOpen((open) => !open)
    if (manualMaids.length || manualMaidLoading) return
    setManualMaidLoading(true)
    setManualMaidError('')
    try {
      const result = await api<{ maids?: ManualMaidOption[] }>('/api/maids?visibility=public&page=1&pageSize=500')
      const options = (result.maids ?? []).filter((maid) => maid.id && maid.referenceCode && maid.fullName)
      setManualMaids(options)
      if (!options.length) setManualMaidError('No public maid profiles are available to select.')
    } catch (error) {
      setManualMaidError(error instanceof Error ? error.message : 'Unable to load maid profiles')
    } finally { setManualMaidLoading(false) }
  }

  const addManualMatch = (maid: ManualMaidOption) => {
    setMatches((current) => {
      const next = current ?? []
      return next.some((match) => match.maidId === maid.id)
        ? next.filter((match) => match.maidId !== maid.id)
        : [...next, { maidId: maid.id, maidReferenceCode: maid.referenceCode, maidName: maid.fullName, score: 0, reasons: ['Manually selected'], manual: true, photoDataUrl: maid.photoDataUrl }]
    })
  }

  const filteredManualMaids = manualMaids.filter((maid) =>
    `${maid.fullName} ${maid.referenceCode} ${maid.nationality ?? ''}`.toLowerCase().includes(manualMaidSearch.trim().toLowerCase()),
  )

  const startPlacement = async (candidate: MatchCandidate) => {
    const numericEmployerId = getPositiveEmployerId(employerId)
    if (!numericEmployerId) {
      setNotice('Enter a valid employer number before starting placement steps.')
      return
    }

    setStartingPlacementId(candidate.maidId)
    try {
      await api('/api/operations-board/placements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maidId: candidate.maidId, employerId: numericEmployerId }),
      })
      await loadPlacements()
      setPlacementCandidate(null)
      setNotice(`Placement started for ${candidate.maidName}. The checklist is ready for staff updates.`)
      setActiveTab('contractor')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to start placement')
    } finally {
      setStartingPlacementId(null)
    }
  }

  const indexKnowledge = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await api('/api/knowledge/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(knowledge) })
      setKnowledge({ sourceKey: '', title: '', category: 'SOP', content: '' }); setNotice('Knowledge document indexed for receptionist search.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to index knowledge') }
  }

  const searchKnowledge = async () => {
    if (!knowledgeQuery.trim()) return
    try { setSnippets((await api<{ snippets: KnowledgeSnippet[] }>(`/api/knowledge/search?q=${encodeURIComponent(knowledgeQuery)}`)).snippets ?? []) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to search knowledge') }
  }

  const syncDrive = async (event: FormEvent) => {
    event.preventDefault()
    if (!driveFile) return setNotice('Choose a document first.')
    setDriveSyncing(true)
    try { const body = new FormData(); body.append('file', driveFile); if (driveFolderKey.trim()) body.append('folderKey', driveFolderKey.trim()); const data = await api<{ jobId: string; result?: { webViewLink?: string } }>('/api/integrations/google-drive/upload-and-sync', { method: 'POST', body }); setNotice(data.result?.webViewLink ? `Uploaded to Google Drive. Open it: ${data.result.webViewLink}` : `Uploaded ${driveFile.name} and started Google Drive sync (${data.jobId}).`); setDriveFile(null) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to start Drive sync') }
    finally { setDriveSyncing(false) }
  }

  const transcribe = async () => {
    if (!mediaFile) return setNotice('Choose an audio or video file first.')
    setIsTranscribing(true)
    setTranscriptResult(null)
    try {
      const body = new FormData()
      body.append('file', mediaFile)
      body.append('language', mediaLanguage)
      const data = await api<{ transcript?: string; jobId: string }>('/api/integrations/media/upload-and-transcribe', { method: 'POST', body })
      if (data.transcript) {
        setTranscriptResult({ fileName: mediaFile.name, transcript: data.transcript })
        setNotice('Transcription complete. Your transcript is shown below.')
      } else {
        setNotice(`Transcription started for ${mediaFile.name}. (${data.jobId})`)
      }
      setMediaFile(null)
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to transcribe media') }
    finally { setIsTranscribing(false) }
  }

  const statValues: Record<string, number> = {
    active: placements.filter((placement) =>
      !['COMPLETED', 'CANCELLED', 'WITHDRAWN'].includes(placement.status.trim().toUpperCase()),
    ).length,
    flight: placements.filter((p) => p.flight_booked).length,
    medical: placements.filter((p) => p.medical_completed).length,
    handover: placements.filter((p) => p.handover_completed).length,
  }

  return (
    <main className={embedded ? "bg-transparent" : "min-h-screen bg-background"}>
      <div className={embedded ? "operations-center operations-center-embedded mx-auto max-w-6xl space-y-6" : "operations-center mx-auto max-w-5xl space-y-6 p-4 py-8 md:p-8"}>
        {embedded && <style>{`
          .operations-center-embedded{color:#000!important;font-size:16px}
          .operations-center-embedded :is(p,span,label,li,button,a,input,textarea,select,option,strong,h1,h2,h3,h4,small){color:#000!important}
          .operations-center-embedded :is(.text-xs,.text-sm){font-size:16px!important;line-height:1.5!important}
          .operations-center-embedded .text-base{font-size:16px!important;line-height:1.5!important}
          .operations-center-embedded .text-lg{font-size:20px!important;line-height:1.35!important}
          .operations-center-embedded .text-xl{font-size:24px!important;line-height:1.3!important}
          .operations-center-embedded .text-2xl{font-size:32px!important;line-height:1.2!important}
          .operations-center-embedded .text-3xl{font-size:36px!important;line-height:1.15!important}
          .operations-center-embedded :is(.text-white,.text-primary-foreground){color:#fff!important}
          .operations-center-embedded [role=tab][aria-selected=true],.operations-center-embedded [role=tab][aria-selected=true] span{color:#fff!important}
          .operations-center-embedded :is(input,textarea,select){font-size:16px!important;border-radius:12px}
          .operations-center-embedded button{min-height:44px;transition:transform .15s,box-shadow .15s,border-color .15s}
          .operations-center-embedded button:hover:not(:disabled){box-shadow:0 4px 14px rgba(15,23,42,.09)}
          .operations-center-embedded .placement-empty-cta{background-color:#0D6E56!important;color:#fff!important;box-shadow:0 2px 6px rgba(13,110,86,.18)!important}
          .operations-center-embedded .placement-empty-cta:hover{background-color:#0b5a46!important;box-shadow:0 5px 14px rgba(13,110,86,.24)!important}
          .operations-center-embedded .placement-empty-cta:focus-visible{outline:3px solid rgba(13,110,86,.35);outline-offset:2px}
          .operations-center-embedded section{border-color:#dbe4f0;box-shadow:0 5px 18px rgba(15,23,42,.045)}
          .operations-center-embedded h1,.operations-center-embedded h2,.operations-center-embedded h3{color:#000!important}
          .operations-center :is(input,textarea,select){transition:border-color .18s,box-shadow .18s,background-color .18s}
          .operations-center :is(input,textarea,select):focus{border-color:#14b8a6;box-shadow:0 0 0 4px rgba(20,184,166,.13)}
          .operations-center [role=tablist] button[aria-selected=true]{box-shadow:0 5px 15px rgba(15,23,42,.13)}
          .operations-center [role=tablist] button:focus-visible{outline:3px solid rgba(20,184,166,.45);outline-offset:2px}
          .operations-center article{transition:transform .16s,border-color .16s,box-shadow .16s}
          .operations-center article:hover{border-color:#cbd5e1;box-shadow:0 10px 24px rgba(15,23,42,.08)}
          @media(max-width:640px){.operations-center-embedded .text-2xl{font-size:28px!important}.operations-center-embedded .text-3xl{font-size:32px!important}}
        `}</style>}
        {/* ── Page header ───────────────────────────────────────────── */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Operations Center</h1>
            <p className="mt-1 text-sm text-black">Everything for running today's placements, in one place.</p>
          </div>
          <button onClick={loadPlacements} className={secondaryButton}>
            Refresh
          </button>
        </header>

        {notice && (
          <p aria-live="polite" className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3 text-sm text-foreground">{notice}</p>
        )}

        <section className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
          <p className="text-sm font-semibold text-primary">Simple steps</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">What do you need to do today?</h2>
          <p className="mt-1 text-sm text-black">Follow the steps below in order. Each button takes you to the part of the page you need.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={() => setActiveTab('matching')} className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow">
              <UsersRound className="h-5 w-5 text-primary" />
              <p className="mt-3 text-base font-semibold text-foreground">Match a helper</p>
              <p className="mt-1 text-xs leading-5 text-black">Save the employer's needs and see the best worker matches.</p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary">Start here <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
            </button>
            <button type="button" onClick={() => setActiveTab('contractor')} className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow">
              <ClipboardList className="h-5 w-5 text-primary" />
              <p className="mt-3 text-base font-semibold text-foreground">Check placement steps</p>
              <p className="mt-1 text-xs leading-5 text-black">Mark flight, medical, and handover tasks as complete.</p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary">Open checklist <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
            </button>
            <button type="button" onClick={() => setActiveTab('knowledge')} className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow">
              <BookOpen className="h-5 w-5 text-primary" />
              <p className="mt-3 text-base font-semibold text-foreground">Read the staff guide</p>
              <p className="mt-1 text-xs leading-5 text-black">Use approved answers and instructions before replying to staff or clients.</p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary">Open guide <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
            </button>
          </div>
        </section>

        <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
          <p className="font-semibold text-primary">How to use this page</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-black">
            <li>Look at the overview card to see current placement status.</li>
            <li>Click “Match helper” when you need to find a good worker for an employer.</li>
            <li>Use “Placement steps” to update travel, medical, and handover milestones.</li>
          </ol>
        </div>

        {/* ── KPI strip — always visible, whatever tab is open ────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
              <div><p className="text-2xl font-bold leading-none text-foreground">{statValues[key]}</p><p className="mt-1 text-xs font-medium text-black">{label}</p></div>
            </div>
          ))}
        </div>

        {/* ── Tab navigation ───────────────────────────────────────── */}
        <div role="tablist" aria-label="Operations Center sections" className="grid grid-cols-2 gap-2 rounded-[26px] border border-border bg-muted/60 p-2 sm:grid-cols-3 lg:grid-cols-5">
          {TABS.map(({ key, label, icon: Icon, tone, buttonTone }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              role="tab"
              aria-selected={activeTab === key}
              className={`flex min-h-[60px] items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold transition-all ${activeTab === key ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : `${buttonTone} text-black shadow-sm hover:-translate-y-0.5 hover:shadow-md`}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activeTab === key ? 'bg-white/15 text-white' : tone}`}><Icon className="h-4 w-4" /></span>
              <span className="leading-tight">{label}<span className={`mt-0.5 hidden text-xs font-normal sm:block ${activeTab === key ? 'text-white/75' : 'text-black'}`}>{key === 'overview' ? 'Live activity' : key === 'matching' ? 'Find candidates' : key === 'contractor' ? 'Track milestones' : key === 'knowledge' ? 'Agency resources' : 'Manage files'}</span></span>
            </button>
          ))}
        </div>

        {/* ── Overview tab ─────────────────────────────────────────── */}
        {activeTab === 'overview' ? (
          <Card icon={ClipboardList} title="Placement monitoring" description="Signal lights show each deployment's progress through key milestones.">
            {placements.length === 0 ? (
              <div className="rounded-2xl bg-muted p-5 text-sm">
                <p className="font-medium text-foreground">No active placements yet.</p>
                <p className="mt-1 text-black">When a placement begins, its progress will appear here automatically.</p>
                <button type="button" onClick={() => setActiveTab('matching')} className="placement-empty-cta group mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2">Start a new match <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></button>
              </div>
            ) : (
              <>
              <div className="mb-4 flex flex-wrap gap-2" aria-label="Placement signal legend">
                {[
                  ['bg-green-500', 'Completed'], ['bg-blue-500', 'In progress'], ['bg-amber-500', 'Not started'], ['bg-red-500', 'Needs attention'],
                ].map(([color, label]) => <span key={label} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-black"><span className={`h-3 w-3 rounded-full ${color}`} />{label}</span>)}
              </div>
              <div className="space-y-2">
                {placements.map((placement) => (
                  <div key={placement.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted px-4 py-3 text-sm">
                    <span className="flex items-center gap-2 font-medium text-foreground"><span aria-label={placementSignal(placement).label} className={`h-3.5 w-3.5 rounded-full ring-4 ring-white ${placementSignal(placement).light}`} />{placement.maid_reference_code || placement.id}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${placementSignal(placement).badge}`}>{placementSignal(placement).label}</span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-black">
                      <span className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1"><span className={`h-2.5 w-2.5 rounded-full ${placement.flight_booked ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,.5)]' : 'bg-slate-300'}`} /><Plane className="h-3.5 w-3.5" />Flight {placement.flight_booked ? 'done' : 'pending'}</span>
                      <span className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1"><span className={`h-2.5 w-2.5 rounded-full ${placement.medical_completed ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,.5)]' : 'bg-slate-300'}`} /><Stethoscope className="h-3.5 w-3.5" />Medical {placement.medical_completed ? 'done' : 'pending'}</span>
                      <span className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1"><span className={`h-2.5 w-2.5 rounded-full ${placement.sip_completed ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,.5)]' : 'bg-slate-300'}`} /><ShieldCheck className="h-3.5 w-3.5" />SIP {placement.sip_completed ? 'done' : 'pending'}</span>
                      <span className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1"><span className={`h-2.5 w-2.5 rounded-full ${placement.handover_completed ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,.5)]' : 'bg-slate-300'}`} /><HeartHandshake className="h-3.5 w-3.5" />Handover {placement.handover_completed ? 'done' : 'pending'}</span>
                    </div>
                    <button type="button" onClick={() => setActiveTab('contractor')} className="text-xs font-semibold text-primary hover:underline">Update steps</button>
                    {isSamplePlacement(placement) ? <button type="button" onClick={() => void removeSamplePlacement(placement)} disabled={removingPlacementId === placement.id} className="text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50">{removingPlacementId === placement.id ? 'Removing…' : 'Remove sample'}</button> : null}
                  </div>
                ))}
              </div>
              </>
            )}
          </Card>
        ) : null}

        {/* ── Matching tab ─────────────────────────────────────────── */}
        {activeTab === 'matching' ? (
          <Card icon={UsersRound} title="Find a helper for an employer" description="Save the employer's needs, then generate a shortlist for staff review.">
            <form onSubmit={saveRequirements} className="space-y-4">
              <div className="grid gap-2 rounded-2xl bg-muted p-4 text-sm sm:grid-cols-3">
                <p className="flex gap-2 text-black"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span><span><b className="block text-black">Choose employer</b>Enter their numeric ID.</span></p>
                <p className="flex gap-2 text-black"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span><span><b className="block text-black">Save needs</b>Add preferences below.</span></p>
                <p className="flex gap-2 text-black"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span><span><b className="block text-black">Review profiles</b>Check availability before sharing.</span></p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Field label="Employer number">
                    <input value={employerId} onChange={(e) => { setEmployerId(e.target.value); setMatches(null); setPlacementCandidate(null) }} className={fieldClass} inputMode="numeric" pattern="[0-9]*" placeholder="For example: 1042" />
                  </Field>
                </div>
                <button type="button" onClick={loadRequirements} className={`${secondaryButton} shrink-0`}>
                  Load saved needs
                </button>
              </div>
              <p className="text-xs text-black">Use the positive number on the employer record, not a code such as EMP-1042.</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Service type">
                  <input className={fieldClass} placeholder="e.g. Full-time live-in" value={requirements.service_type ?? ''} onChange={(e) => setRequirements({ ...requirements, service_type: e.target.value })} />
                </Field>
                <Field label="Location">
                  <input className={fieldClass} placeholder="e.g. Bukit Timah" value={requirements.location ?? ''} onChange={(e) => setRequirements({ ...requirements, location: e.target.value })} />
                </Field>
                <Field label="Maximum monthly salary">
                  <input className={fieldClass} type="number" placeholder="e.g. 650" value={requirements.max_monthly_salary ?? ''} onChange={(e) => setRequirements({ ...requirements, max_monthly_salary: e.target.value ? Number(e.target.value) : undefined })} />
                </Field>
                <Field label="Minimum experience (years)">
                  <input className={fieldClass} type="number" placeholder="e.g. 2" value={requirements.minimum_experience_years ?? ''} onChange={(e) => setRequirements({ ...requirements, minimum_experience_years: e.target.value ? Number(e.target.value) : undefined })} />
                </Field>
                <Field label="Nationalities">
                  <input className={fieldClass} placeholder="comma separated" value={(requirements.preferred_nationalities ?? []).join(', ')} onChange={(e) => setRequirements({ ...requirements, preferred_nationalities: splitList(e.target.value) })} />
                </Field>
                <Field label="Languages">
                  <input className={fieldClass} placeholder="comma separated" value={(requirements.preferred_languages ?? []).join(', ')} onChange={(e) => setRequirements({ ...requirements, preferred_languages: splitList(e.target.value) })} />
                </Field>
              </div>

              <Field label="Notes">
                <textarea className={fieldClass} rows={3} placeholder="Anything else the matching process should know…" value={requirements.notes ?? ''} onChange={(e) => setRequirements({ ...requirements, notes: e.target.value })} />
              </Field>

              <div className="flex flex-wrap gap-3">
                <button className={primaryButton}>Save employer needs</button>
                <button type="button" onClick={() => void findMatches()} disabled={isMatching} className={secondaryButton}>
                  <Sparkles className="mr-1 inline h-4 w-4" />{isMatching ? 'Finding matches...' : 'Show matching profiles'}
                </button>
                <button type="button" onClick={() => void openManualMaidPicker()} className={secondaryButton}>
                  <Search className="mr-1 inline h-4 w-4" />{manualPickerOpen ? 'Hide manual selection' : 'Choose maids manually'}
                </button>
              </div>

              {manualPickerOpen && (
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="font-semibold text-black">Manually select profiles</p>
                  <p className="mt-1 text-sm text-black">Choose one or more maids to add to the shortlist. Their availability is not changed.</p>
                  <input value={manualMaidSearch} onChange={(event) => setManualMaidSearch(event.target.value)} className={`${fieldClass} mt-3`} placeholder="Search name, nationality, or reference" aria-label="Search maid profiles" />
                  {manualMaidLoading ? <p className="py-5 text-center text-sm text-black">Loading maid profiles…</p> : manualMaidError ? <p className="py-4 text-sm text-black">{manualMaidError}</p> : (
                    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                      {filteredManualMaids.map((maid) => {
                        const selected = Boolean(matches?.some((match) => match.maidId === maid.id && match.manual))
                        return <label key={maid.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/40">
                          <input type="checkbox" checked={selected} onChange={() => addManualMatch(maid)} className="h-4 w-4 accent-primary" />
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {maid.photoDataUrl ? <img src={maid.photoDataUrl} alt={maid.fullName} className="h-full w-full object-cover" loading="lazy" /> : maid.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-black">{maid.fullName}</span><span className="block truncate text-sm text-black">{maid.referenceCode}{maid.nationality ? ` · ${maid.nationality}` : ''} · {maid.status || 'Status unavailable'}</span></span>
                        </label>
                      })}
                      {!filteredManualMaids.length && <p className="py-4 text-center text-sm text-black">No maid profiles match your search.</p>}
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-black">Save employer needs first. The shortlist uses the saved preferences for this employer.</p>

              {matches && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><CheckCircle2 className="h-4 w-4 text-primary" />Suggested profiles</p>
                  <p className="mt-1 text-xs text-black">These are recommendations only. Confirm availability and review the full profile before sharing it.</p>
                  {matches.length ? (
                    <div className="mt-3 space-y-2">
                      {matches.map((match) => (
                        <article key={match.maidId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-3 shadow-sm">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {match.photoDataUrl ? <img src={match.photoDataUrl} alt={match.maidName} className="h-full w-full object-cover" loading="lazy" /> : match.maidName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{match.maidName}</p>
                              <p className="text-xs text-black">{match.maidReferenceCode}{match.reasons.length ? ` - ${match.reasons.slice(0, 2).join(' - ')}` : ''}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{match.manual ? 'Manual selection' : `${match.score}% match`}</span>
                            <button type="button" onClick={() => setPlacementCandidate(placementCandidate?.maidId === match.maidId ? null : match)} className={secondaryButton}>
                              Employer chose this helper
                            </button>
                          </div>
                          {placementCandidate?.maidId === match.maidId && (
                            <div className="w-full rounded-xl border border-primary/20 bg-primary/5 p-4">
                              <p className="font-semibold text-black">Has the employer confirmed this helper?</p>
                              <p className="mt-1 text-sm text-black">Only continue after the employer has chosen this profile. This creates the placement record and opens its checklist.</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button type="button" onClick={() => void startPlacement(match)} disabled={startingPlacementId === match.maidId} className={primaryButton}>
                                  {startingPlacementId === match.maidId ? 'Starting placement…' : 'Yes, start placement steps'}
                                </button>
                                <button type="button" onClick={() => setPlacementCandidate(null)} disabled={startingPlacementId === match.maidId} className={secondaryButton}>Not yet</button>
                              </div>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-xl bg-card p-3 text-sm text-black">No suitable profiles were found for the saved requirements.</p>
                  )}
                </div>
              )}
            </form>
          </Card>
        ) : null}

        {/* ── Knowledge tab ────────────────────────────────────────── */}
        {activeTab === 'contractor' ? <ContractorTasksPage onPlacementChange={loadPlacements} /> : null}

        {activeTab === 'knowledge' ? (
          <Card icon={BookOpen} title="Knowledge library" description="What your receptionist can look up">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-black">
              <p className="font-semibold">How this guide works</p>
              <p className="mt-1">Add an approved procedure or FAQ, then select <strong>Index knowledge</strong> to make it searchable. Search below to check what was indexed. Loading an example only fills the form; it does not save or index anything.</p>
            </div>
            <form onSubmit={indexKnowledge} className="space-y-4">
              <button
                type="button"
                onClick={() => setKnowledge({
                  sourceKey: 'arrival-day-checklist',
                  title: 'New helper airport arrival checklist',
                  category: 'SOP',
                  content: 'Before arrival: confirm the flight details, arrival date and time, employer contact, and agreed pickup arrangements.\n\nOn arrival: confirm the helper has been met by the agreed contact. If the flight is delayed or the pickup plan changes, contact the agency supervisor and employer using the approved contact process.\n\nAfter arrival: record the arrival outcome and any follow-up needed in the agency system. Follow current agency procedures for identity checks, transport, and escalation.',
                })}
                className={secondaryButton}
              >
                Load example
              </button>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Source key">
                  <input className={fieldClass} placeholder="e.g. sop-arrival" value={knowledge.sourceKey} onChange={(e) => setKnowledge({ ...knowledge, sourceKey: e.target.value })} />
                </Field>
                <Field label="Document title">
                  <input className={fieldClass} placeholder="e.g. Airport arrival checklist" value={knowledge.title} onChange={(e) => setKnowledge({ ...knowledge, title: e.target.value })} />
                </Field>
              </div>
              <Field label="Category">
                <select className={fieldClass} value={knowledge.category} onChange={(e) => setKnowledge({ ...knowledge, category: e.target.value })}>
                  <option value="SOP">SOP</option>
                  <option value="FAQ">FAQ</option>
                  <option value="MOM">MOM procedure</option>
                </select>
              </Field>
              <Field label="Content">
                <textarea className={fieldClass} rows={4} placeholder="Paste approved knowledge content…" value={knowledge.content} onChange={(e) => setKnowledge({ ...knowledge, content: e.target.value })} />
              </Field>
              <button className={primaryButton}>Index knowledge</button>

              <div className="rounded-2xl bg-muted p-4">
                <span className="mb-2 block text-sm font-medium text-black">Search what's already indexed</span>
                <div className="flex gap-2">
                  <input className={`${fieldClass} bg-card`} placeholder="Search…" value={knowledgeQuery} onChange={(e) => setKnowledgeQuery(e.target.value)} />
                  <button type="button" onClick={searchKnowledge} className="shrink-0 rounded-2xl bg-card px-4 text-primary shadow-sm hover:bg-background">
                    <Search className="h-4 w-4" />
                  </button>
                </div>
                {snippets.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {snippets.map((snippet, index) => (
                      <article key={`${snippet.id}-${index}`} className="rounded-xl bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <b className="text-sm text-foreground">{snippet.title}</b>
                          <span className="shrink-0 text-xs text-black">{snippet.category}</span>
                        </div>
                        <p className={`mt-1 text-sm text-black ${expandedKnowledgeSnippetId === `${snippet.id}-${index}` ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>{snippet.content}</p>
                        {snippet.content.length > 180 && (
                          <button
                            type="button"
                            aria-expanded={expandedKnowledgeSnippetId === `${snippet.id}-${index}`}
                            onClick={() => setExpandedKnowledgeSnippetId(expandedKnowledgeSnippetId === `${snippet.id}-${index}` ? null : `${snippet.id}-${index}`)}
                            className="mt-2 text-sm font-semibold text-primary underline-offset-2 hover:underline"
                          >
                            {expandedKnowledgeSnippetId === `${snippet.id}-${index}` ? 'Read less' : 'Read full'}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </Card>
        ) : null}

        {/* ── Integrations tab ─────────────────────────────────────── */}
        {activeTab === 'integrations' ? (
          <div className="space-y-6">
            <Card icon={FolderSync} title="Google Drive sync" description="Send a private document to your Drive workflow">
              <form onSubmit={syncDrive} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Choose document">
                    <input className={fieldClass} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png" onChange={(e) => setDriveFile(e.target.files?.[0] ?? null)} />
                  </Field>
                  <Field label="Drive folder key (optional)">
                    <input className={fieldClass} value={driveFolderKey} onChange={(e) => setDriveFolderKey(e.target.value)} placeholder="Uses your scenario default when blank" />
                  </Field>
                </div>
                {driveFile && <p className="text-sm text-black">Selected: {driveFile.name} ({Math.ceil(driveFile.size / 1024)} KB)</p>}
                <p className="text-xs text-black">Your document stays private. A short-lived link is sent to Make only for the upload.</p>
                <button className={primaryButton} disabled={driveSyncing}>{driveSyncing ? 'Uploading securely…' : 'Upload to Google Drive'}</button>
              </form>
            </Card>

            <Card icon={FileAudio} title="Transcribe a voice note" description="Choose an audio or video file. We upload it privately and return the text here.">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Choose audio or video">
                    <input className={fieldClass} type="file" accept="audio/*,video/*,.m4a,.mp3,.wav,.aac,.mp4,.mov" onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)} />
                  </Field>
                  <Field label="Spoken language">
                    <select className={fieldClass} value={mediaLanguage} onChange={(e) => setMediaLanguage(e.target.value)}>
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="id-ID">Indonesian</option>
                      <option value="zh-CN">Chinese (Mandarin)</option>
                      <option value="hi-IN">Hindi</option>
                      <option value="ja-JP">Japanese</option>
                      <option value="ko-KR">Korean</option>
                      <option value="es-ES">Spanish</option>
                      <option value="fr-FR">French</option>
                    </select>
                  </Field>
                </div>
                {mediaFile && <p className="text-sm text-black">Selected: {mediaFile.name} ({Math.ceil(mediaFile.size / 1024)} KB)</p>}
                <p className="rounded-xl bg-muted p-3 text-xs text-black">1. Choose a voice note or video. 2. Select its spoken language. 3. Select Transcribe. Files must be 25 MB or smaller.</p>
                <button type="button" onClick={() => void transcribe()} disabled={isTranscribing} className={primaryButton}>{isTranscribing ? 'Transcribing...' : 'Transcribe file'}</button>
                {transcriptResult && (
                  <section aria-live="polite" className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><CheckCircle2 className="h-4 w-4 text-primary" />Transcript</p>
                    <p className="mt-1 text-xs text-black">{transcriptResult.fileName}</p>
                    <textarea readOnly value={transcriptResult.transcript} rows={8} className="mt-3 w-full resize-y rounded-xl border border-border bg-card p-3 text-sm leading-6 text-foreground outline-none" aria-label="Transcript output" />
                  </section>
                )}
                <p className="flex items-center gap-1.5 text-xs text-black">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  Media stays private — only a short-lived link is ever shared.
                </p>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </main>
  )
}
