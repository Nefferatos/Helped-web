import { FormEvent, useEffect, useState } from 'react'
import { BookOpen, FileAudio, FolderSync, Search, Settings2, ShieldCheck, UsersRound } from 'lucide-react'
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

const inputClass = 'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary'
const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)

export default function AgencyOperationsCenterPage() {
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

  return <main className="space-y-6 p-4 md:p-8">
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-muted-foreground">Agency administration</p><h1 className="text-3xl font-bold">Operations Center</h1><p className="mt-1 text-sm text-muted-foreground">Manage placement work, employer matching preferences, knowledge, and secure integrations.</p></div><button onClick={loadPlacements} className="rounded-md border px-3 py-2 text-sm font-medium">Refresh data</button></header>
    {notice && <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">{notice}</p>}

    <section className="grid gap-4 md:grid-cols-4">
      {[['Active placements', placements.length, Settings2], ['Flight complete', placements.filter((p) => p.flight_booked).length, FolderSync], ['Medical complete', placements.filter((p) => p.medical_completed).length, ShieldCheck], ['Handover complete', placements.filter((p) => p.handover_completed).length, UsersRound]].map(([label, value, Icon]) => <article key={String(label)} className="rounded-lg border bg-card p-4 shadow-sm"><div className="flex items-center justify-between text-muted-foreground"><span className="text-sm">{String(label)}</span><Icon className="h-4 w-4" /></div><p className="mt-2 text-3xl font-bold">{String(value)}</p></article>)}
    </section>

    <section className="grid gap-6 xl:grid-cols-2">
      <form onSubmit={saveRequirements} className="space-y-3 rounded-lg border bg-card p-5"><h2 className="flex items-center gap-2 text-lg font-semibold"><UsersRound className="h-5 w-5" /> Employer requirements</h2><p className="text-sm text-muted-foreground">Saved preferences are applied automatically when matching helpers for this employer.</p><div className="flex gap-2"><input value={employerId} onChange={(e) => setEmployerId(e.target.value)} className={inputClass} placeholder="Employer ID" /><button type="button" onClick={loadRequirements} className="rounded-md border px-3 text-sm">Load</button></div><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} placeholder="Service type" value={requirements.service_type ?? ''} onChange={(e) => setRequirements({ ...requirements, service_type: e.target.value })} /><input className={inputClass} placeholder="Location" value={requirements.location ?? ''} onChange={(e) => setRequirements({ ...requirements, location: e.target.value })} /><input className={inputClass} placeholder="Maximum monthly salary" type="number" value={requirements.max_monthly_salary ?? ''} onChange={(e) => setRequirements({ ...requirements, max_monthly_salary: e.target.value ? Number(e.target.value) : undefined })} /><input className={inputClass} placeholder="Minimum experience (years)" type="number" value={requirements.minimum_experience_years ?? ''} onChange={(e) => setRequirements({ ...requirements, minimum_experience_years: e.target.value ? Number(e.target.value) : undefined })} /><input className={inputClass} placeholder="Nationalities (comma separated)" value={(requirements.preferred_nationalities ?? []).join(', ')} onChange={(e) => setRequirements({ ...requirements, preferred_nationalities: splitList(e.target.value) })} /><input className={inputClass} placeholder="Languages (comma separated)" value={(requirements.preferred_languages ?? []).join(', ')} onChange={(e) => setRequirements({ ...requirements, preferred_languages: splitList(e.target.value) })} /></div><textarea className={inputClass} rows={3} placeholder="Notes" value={requirements.notes ?? ''} onChange={(e) => setRequirements({ ...requirements, notes: e.target.value })} /><button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save requirements</button></form>

      <form onSubmit={indexKnowledge} className="space-y-3 rounded-lg border bg-card p-5"><h2 className="flex items-center gap-2 text-lg font-semibold"><BookOpen className="h-5 w-5" /> Knowledge library</h2><p className="text-sm text-muted-foreground">Index SOPs, FAQs, and MOM procedures for the receptionist.</p><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} placeholder="Stable source key, e.g. sop-arrival" value={knowledge.sourceKey} onChange={(e) => setKnowledge({ ...knowledge, sourceKey: e.target.value })} /><input className={inputClass} placeholder="Document title" value={knowledge.title} onChange={(e) => setKnowledge({ ...knowledge, title: e.target.value })} /></div><select className={inputClass} value={knowledge.category} onChange={(e) => setKnowledge({ ...knowledge, category: e.target.value })}><option value="SOP">SOP</option><option value="FAQ">FAQ</option><option value="MOM">MOM procedure</option></select><textarea className={inputClass} rows={5} placeholder="Paste approved knowledge content…" value={knowledge.content} onChange={(e) => setKnowledge({ ...knowledge, content: e.target.value })} /><button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Index knowledge</button><div className="flex gap-2 border-t pt-3"><input className={inputClass} placeholder="Search indexed knowledge" value={knowledgeQuery} onChange={(e) => setKnowledgeQuery(e.target.value)} /><button type="button" onClick={searchKnowledge} className="rounded-md border px-3"><Search className="h-4 w-4" /></button></div>{snippets.map((snippet) => <article key={snippet.id} className="rounded border p-2 text-sm"><b>{snippet.title}</b><span className="ml-2 text-xs text-muted-foreground">{snippet.category}</span><p className="mt-1 line-clamp-2 text-muted-foreground">{snippet.content}</p></article>)}</form>
    </section>

    <section className="grid gap-6 xl:grid-cols-2"><form onSubmit={syncDrive} className="space-y-3 rounded-lg border bg-card p-5"><h2 className="flex items-center gap-2 text-lg font-semibold"><FolderSync className="h-5 w-5" /> Google Drive sync</h2><p className="text-sm text-muted-foreground">Send a private document to your Make-managed Google Drive workflow using a short-lived signed URL.</p><input className={inputClass} placeholder="storage://helped-private/..." value={drive.storageRef} onChange={(e) => setDrive({ ...drive, storageRef: e.target.value })} /><input className={inputClass} placeholder="File name" value={drive.fileName} onChange={(e) => setDrive({ ...drive, fileName: e.target.value })} /><input className={inputClass} placeholder="Optional Drive folder key" value={drive.folderKey} onChange={(e) => setDrive({ ...drive, folderKey: e.target.value })} /><button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Start Drive sync</button></form><section className="space-y-3 rounded-lg border bg-card p-5"><h2 className="flex items-center gap-2 text-lg font-semibold"><FileAudio className="h-5 w-5" /> Voice and media</h2><p className="text-sm text-muted-foreground">Transcribe a private WhatsApp audio or voice attachment through your Make media workflow.</p><input className={inputClass} placeholder="storage://helped-private/..." value={mediaRef} onChange={(e) => setMediaRef(e.target.value)} /><button onClick={transcribe} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Transcribe media</button><p className="text-xs text-muted-foreground">Media stays private; Make receives only an expiring signed URL.</p></section></section>
  </main>
}
