import { FormEvent, useEffect, useState } from 'react'
import { BookOpen, FileAudio, FolderSync, Search, ShieldCheck, UsersRound, Plane, Stethoscope, HeartHandshake, ClipboardList } from 'lucide-react'
import { getAgencyAdminAuthHeaders } from '@/lib/agencyAdminAuth'

type Placement = { id: string; maid_reference_code: string | null; status: string; flight_booked: boolean; medical_completed: boolean; sip_completed: boolean; handover_completed: boolean }
type KnowledgeSnippet = { id: string; title: string; category: string; content: string; similarity: number }
type Requirements = { service_type?: string; location?: string; max_monthly_salary?: number; availability?: string; preferred_nationalities?: string[]; preferred_languages?: string[]; minimum_experience_years?: number; notes?: string }

const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, { ...init, headers: { ...getAgencyAdminAuthHeaders(), ...(init?.headers ?? {}) } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data as T
}

const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)

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
  { key: 'knowledge' as const, label: 'Knowledge library', icon: BookOpen },
  { key: 'integrations' as const, label: 'Integrations', icon: FolderSync },
]
type TabKey = (typeof TABS)[number]['key']

export default function AgencyOperationsCenterPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [placements, setPlacements] = useState<Placement[]>([])
  const [notice, setNotice] = useState('')
  const [employerId, setEmployerId] = useState('')
  const [requirements, setRequirements] = useState<Requirements>({ preferred_nationalities: [], preferred_languages: [] })
  const [knowledge, setKnowledge] = useState({ sourceKey: '', title: '', category: 'SOP', content: '' })
  const [knowledgeQuery, setKnowledgeQuery] = useState('')
  const [snippets, setSnippets] = useState<KnowledgeSnippet[]>([])
  const [drive, setDrive] = useState({ storageRef: '', fileName: '', folderKey: '' })
  const [mediaRef, setMediaRef] = useState('')

  const loadPlacements = () => api<{ placements: Placement[] }>('/api/operations-board').then((data) => setPlacements(data.placements ?? [])).catch((error) => setNotice(error.message))
  useEffect(() => { void loadPlacements() }, [])

  const loadRequirements = async () => {
    if (!employerId.trim()) return setNotice('Enter an employer ID first.')
    try {
      const data = await api<{ requirements: Requirements | null }>(`/api/employers/${encodeURIComponent(employerId)}/requirements`)
      setRequirements(data.requirements ?? { preferred_nationalities: [], preferred_languages: [] })
      setNotice(data.requirements ? 'Employer requirements loaded.' : 'No saved requirements yet.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to load requirements') }
  }

  const saveRequirements = async (event: FormEvent) => {
    event.preventDefault()
    if (!employerId.trim()) return setNotice('Enter an employer ID first.')
    try {
      await api(`/api/employers/${encodeURIComponent(employerId)}/requirements`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        serviceType: requirements.service_type, location: requirements.location, maxMonthlySalary: requirements.max_monthly_salary,
        availability: requirements.availability, preferredNationalities: requirements.preferred_nationalities,
        preferredLanguages: requirements.preferred_languages, minimumExperienceYears: requirements.minimum_experience_years, notes: requirements.notes,
      }) })
      setNotice('Employer requirements saved. Future matches will use them.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to save requirements') }
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
    try { const data = await api<{ jobId: string }>('/api/integrations/google-drive/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(drive) }); setNotice(`Google Drive sync job ${data.jobId} submitted.`) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to start Drive sync') }
  }

  const transcribe = async () => {
    try { const data = await api<{ transcript: string }>('/api/integrations/media/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storageRef: mediaRef }) }); setNotice(data.transcript ? `Transcript: ${data.transcript}` : 'Transcription job submitted.') }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to transcribe media') }
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
          <p className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3 text-sm text-foreground">{notice}</p>
        )}

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
              <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                No active placements yet. New placements will show up here automatically.
              </p>
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
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : null}

        {/* ── Matching tab ─────────────────────────────────────────── */}
        {activeTab === 'matching' ? (
          <Card icon={UsersRound} title="Employer requirements" description="What each employer is looking for">
            <form onSubmit={saveRequirements} className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Field label="Employer ID">
                    <input value={employerId} onChange={(e) => setEmployerId(e.target.value)} className={fieldClass} placeholder="e.g. EMP-1042" />
                  </Field>
                </div>
                <button type="button" onClick={loadRequirements} className={`${secondaryButton} shrink-0`}>
                  Load
                </button>
              </div>

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

              <button className={primaryButton}>Save requirements</button>
            </form>
          </Card>
        ) : null}

        {/* ── Knowledge tab ────────────────────────────────────────── */}
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
                <Field label="Storage reference">
                  <input className={fieldClass} placeholder="storage://helped-private/..." value={drive.storageRef} onChange={(e) => setDrive({ ...drive, storageRef: e.target.value })} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="File name">
                    <input className={fieldClass} value={drive.fileName} onChange={(e) => setDrive({ ...drive, fileName: e.target.value })} />
                  </Field>
                  <Field label="Drive folder key (optional)">
                    <input className={fieldClass} value={drive.folderKey} onChange={(e) => setDrive({ ...drive, folderKey: e.target.value })} />
                  </Field>
                </div>
                <button className={primaryButton}>Start Drive sync</button>
              </form>
            </Card>

            <Card icon={FileAudio} title="Voice and media" description="Turn a voice note into text">
              <div className="space-y-4">
                <Field label="Storage reference">
                  <input className={fieldClass} placeholder="storage://helped-private/..." value={mediaRef} onChange={(e) => setMediaRef(e.target.value)} />
                </Field>
                <button onClick={transcribe} className={primaryButton}>Transcribe media</button>
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