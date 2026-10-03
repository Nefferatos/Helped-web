import { FormEvent, useEffect, useState } from 'react'
import { ArrowRight, BookOpen, CheckCircle2, FileAudio, FolderSync, Search, ShieldCheck, Sparkles, UsersRound, Plane, Stethoscope, HeartHandshake, ClipboardList } from 'lucide-react'
import { getAgencyAdminAuthHeaders } from '@/lib/agencyAdminAuth'
import ContractorTasksPage from '@/pages/ContractorTasksPage'

type Placement = { id: string; maid_reference_code: string | null; status: string; flight_booked: boolean; medical_completed: boolean; sip_completed: boolean; handover_completed: boolean }
type KnowledgeSnippet = { id: string; title: string; category: string; content: string; similarity: number }
type Requirements = { service_type?: string; location?: string; max_monthly_salary?: number; availability?: string; preferred_nationalities?: string[]; preferred_languages?: string[]; minimum_experience_years?: number; notes?: string }
type MatchCandidate = { maidId: number; maidReferenceCode: string; maidName: string; score: number; reasons: string[] }
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
const fieldClass = 'w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-shadow focus:ring-2 focus:ring-primary/40'
const labelClass = 'mb-1.5 block text-sm font-medium text-muted-foreground'

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
    <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
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
  { key: 'overview' as const, label: 'Overview', icon: ClipboardList },
  { key: 'matching' as const, label: 'Employer matching', icon: UsersRound },
  { key: 'contractor' as const, label: 'Contractor tasks', icon: ClipboardList },
  { key: 'knowledge' as const, label: 'Knowledge library', icon: BookOpen },
  { key: 'integrations' as const, label: 'Integrations', icon: FolderSync },
]
type TabKey = (typeof TABS)[number]['key']

export default function AgencyOperationsCenterPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [placements, setPlacements] = useState<Placement[]>([])
  const [removingPlacementId, setRemovingPlacementId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [employerId, setEmployerId] = useState('')
  const [requirements, setRequirements] = useState<Requirements>({ preferred_nationalities: [], preferred_languages: [] })
  const [matches, setMatches] = useState<MatchCandidate[] | null>(null)
  const [isMatching, setIsMatching] = useState(false)
  const [knowledge, setKnowledge] = useState({ sourceKey: '', title: '', category: 'SOP', content: '' })
  const [knowledgeQuery, setKnowledgeQuery] = useState('')
  const [snippets, setSnippets] = useState<KnowledgeSnippet[]>([])
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
      const result = await api<MatchResponse>('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employerId: numericEmployerId }),
      })
      const shortlist = result.data?.matches ?? []
      setMatches(shortlist)
      setNotice(shortlist.length ? `Found ${shortlist.length} matching profile${shortlist.length === 1 ? '' : 's'}. Review before contacting an employer.` : 'No matching profiles found. Adjust the saved requirements or review available maid profiles.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to find matching profiles')
    } finally {
      setIsMatching(false)
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
    active: placements.length,
    flight: placements.filter((p) => p.flight_booked).length,
    medical: placements.filter((p) => p.medical_completed).length,
    handover: placements.filter((p) => p.handover_completed).length,
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl space-y-6 p-4 py-8 md:p-8">
        {/* ── Page header ───────────────────────────────────────────── */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Operations Center</h1>
            <p className="mt-1 text-sm text-muted-foreground">Everything for running today's placements, in one place.</p>
          </div>
          <button onClick={loadPlacements} className={secondaryButton}>
            Refresh
          </button>
        </header>

        {notice && (
          <p aria-live="polite" className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3 text-sm text-foreground">{notice}</p>
        )}

        <section className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
          <p className="text-sm font-semibold text-primary">Start here</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">What would you like to do today?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose a task below. You can come back here anytime to check placement progress.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={() => setActiveTab('matching')} className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow">
              <UsersRound className="h-5 w-5 text-primary" />
              <p className="mt-3 font-semibold text-foreground">Find a helper</p>
              <p className="mt-1 text-xs text-muted-foreground">Save an employer's needs and see suitable profiles.</p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary">Start matching <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
            </button>
            <button type="button" onClick={() => setActiveTab('contractor')} className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow">
              <ClipboardList className="h-5 w-5 text-primary" />
              <p className="mt-3 font-semibold text-foreground">Manage placement tasks</p>
              <p className="mt-1 text-xs text-muted-foreground">Mark flight, medical, SIP, and handover milestones complete.</p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary">Open task queue <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
            </button>
            <button type="button" onClick={() => setActiveTab('knowledge')} className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow">
              <BookOpen className="h-5 w-5 text-primary" />
              <p className="mt-3 font-semibold text-foreground">Improve AI answers</p>
              <p className="mt-1 text-xs text-muted-foreground">Add an approved FAQ or procedure for the receptionist.</p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary">Open knowledge library <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
            </button>
          </div>
        </section>

        {/* ── KPI strip — always visible, whatever tab is open ────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
              <Icon className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-2 text-2xl font-semibold text-foreground">{statValues[key]}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Tab navigation ───────────────────────────────────────── */}
        <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card p-1.5">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ─────────────────────────────────────────── */}
        {activeTab === 'overview' ? (
          <Card icon={ClipboardList} title="Placement overview" description="How things are moving right now">
            {placements.length === 0 ? (
              <div className="rounded-2xl bg-muted p-5 text-sm">
                <p className="font-medium text-foreground">No active placements yet.</p>
                <p className="mt-1 text-muted-foreground">Once a candidate is selected and the placement process starts, progress will appear here automatically.</p>
                <button type="button" onClick={() => setActiveTab('matching')} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Find a helper for an employer <ArrowRight className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="space-y-2">
                {placements.map((placement) => (
                  <div key={placement.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted px-4 py-3 text-sm">
                    <span className="font-medium text-foreground">{placement.maid_reference_code || placement.id}</span>
                    <span className="text-xs text-muted-foreground">{placement.status}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Plane className="h-3.5 w-3.5" />{placement.flight_booked ? 'Booked' : 'Pending'}</span>
                      <span className="flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" />{placement.medical_completed ? 'Done' : 'Pending'}</span>
                      <span className="flex items-center gap-1"><HeartHandshake className="h-3.5 w-3.5" />{placement.handover_completed ? 'Done' : 'Pending'}</span>
                    </div>
                    <button type="button" onClick={() => setActiveTab('contractor')} className="text-xs font-semibold text-primary hover:underline">Manage tasks</button>
                    {isSamplePlacement(placement) ? <button type="button" onClick={() => void removeSamplePlacement(placement)} disabled={removingPlacementId === placement.id} className="text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50">{removingPlacementId === placement.id ? 'Removing…' : 'Remove sample'}</button> : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : null}

        {/* ── Matching tab ─────────────────────────────────────────── */}
        {activeTab === 'matching' ? (
          <Card icon={UsersRound} title="Find a helper for an employer" description="Save the employer's needs, then generate a shortlist for staff review.">
            <form onSubmit={saveRequirements} className="space-y-4">
              <div className="grid gap-2 rounded-2xl bg-muted p-4 text-sm sm:grid-cols-3">
                <p className="flex gap-2 text-muted-foreground"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span><span><b className="block text-foreground">Choose employer</b>Enter their numeric ID.</span></p>
                <p className="flex gap-2 text-muted-foreground"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span><span><b className="block text-foreground">Save needs</b>Add preferences below.</span></p>
                <p className="flex gap-2 text-muted-foreground"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span><span><b className="block text-foreground">Review profiles</b>Check availability before sharing.</span></p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Field label="Employer number">
                    <input value={employerId} onChange={(e) => { setEmployerId(e.target.value); setMatches(null) }} className={fieldClass} inputMode="numeric" pattern="[0-9]*" placeholder="For example: 1042" />
                  </Field>
                </div>
                <button type="button" onClick={loadRequirements} className={`${secondaryButton} shrink-0`}>
                  Load saved needs
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Use the positive number on the employer record, not a code such as EMP-1042.</p>

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
              </div>

              <p className="text-xs text-muted-foreground">Save employer needs first. The shortlist uses the saved preferences for this employer.</p>

              {matches && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><CheckCircle2 className="h-4 w-4 text-primary" />Suggested profiles</p>
                  <p className="mt-1 text-xs text-muted-foreground">These are recommendations only. Confirm availability and review the full profile before sharing it.</p>
                  {matches.length ? (
                    <div className="mt-3 space-y-2">
                      {matches.map((match) => (
                        <article key={match.maidId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-3 shadow-sm">
                          <div>
                            <p className="font-medium text-foreground">{match.maidName}</p>
                            <p className="text-xs text-muted-foreground">{match.maidReferenceCode}{match.reasons.length ? ` - ${match.reasons.slice(0, 2).join(' - ')}` : ''}</p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{match.score}% match</span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-xl bg-card p-3 text-sm text-muted-foreground">No suitable profiles were found for the saved requirements.</p>
                  )}
                </div>
              )}
            </form>
          </Card>
        ) : null}

        {/* ── Knowledge tab ────────────────────────────────────────── */}
        {activeTab === 'contractor' ? <ContractorTasksPage /> : null}

        {activeTab === 'knowledge' ? (
          <Card icon={BookOpen} title="Knowledge library" description="What your receptionist can look up">
            <form onSubmit={indexKnowledge} className="space-y-4">
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
                <span className="mb-2 block text-sm font-medium text-muted-foreground">Search what's already indexed</span>
                <div className="flex gap-2">
                  <input className={`${fieldClass} bg-card`} placeholder="Search…" value={knowledgeQuery} onChange={(e) => setKnowledgeQuery(e.target.value)} />
                  <button type="button" onClick={searchKnowledge} className="shrink-0 rounded-2xl bg-card px-4 text-primary shadow-sm hover:bg-background">
                    <Search className="h-4 w-4" />
                  </button>
                </div>
                {snippets.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {snippets.map((snippet) => (
                      <article key={snippet.id} className="rounded-xl bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <b className="text-sm text-foreground">{snippet.title}</b>
                          <span className="shrink-0 text-xs text-muted-foreground">{snippet.category}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{snippet.content}</p>
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
                {driveFile && <p className="text-sm text-muted-foreground">Selected: {driveFile.name} ({Math.ceil(driveFile.size / 1024)} KB)</p>}
                <p className="text-xs text-muted-foreground">Your document stays private. A short-lived link is sent to Make only for the upload.</p>
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
                {mediaFile && <p className="text-sm text-muted-foreground">Selected: {mediaFile.name} ({Math.ceil(mediaFile.size / 1024)} KB)</p>}
                <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">1. Choose a voice note or video. 2. Select its spoken language. 3. Select Transcribe. Files must be 25 MB or smaller.</p>
                <button type="button" onClick={() => void transcribe()} disabled={isTranscribing} className={primaryButton}>{isTranscribing ? 'Transcribing...' : 'Transcribe file'}</button>
                {transcriptResult && (
                  <section aria-live="polite" className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><CheckCircle2 className="h-4 w-4 text-primary" />Transcript</p>
                    <p className="mt-1 text-xs text-muted-foreground">{transcriptResult.fileName}</p>
                    <textarea readOnly value={transcriptResult.transcript} rows={8} className="mt-3 w-full resize-y rounded-xl border border-border bg-card p-3 text-sm leading-6 text-foreground outline-none" aria-label="Transcript output" />
                  </section>
                )}
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
