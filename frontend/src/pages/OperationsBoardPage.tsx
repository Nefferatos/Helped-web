import { useEffect, useState } from 'react'

type Placement = {
  id: string; maid_reference_code: string | null; employer_id: string | null; status: string
  target_start_date: string | null; last_status_at: string; last_actor: string
  flight_booked: boolean; medical_completed: boolean; sip_completed: boolean; handover_completed: boolean
}

const milestones: Array<[keyof Placement, string]> = [
  ['flight_booked', 'Flight'], ['medical_completed', 'Medical'], ['sip_completed', 'SIP'], ['handover_completed', 'Handover'],
]

export default function OperationsBoardPage() {
  const [placements, setPlacements] = useState<Placement[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    fetch('/api/operations-board', { credentials: 'include' })
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Unable to load operations'); return data })
      .then(data => setPlacements(data.placements ?? []))
      .catch(e => setError(e instanceof Error ? e.message : 'Unable to load operations'))
  }, [])
  return <main className="space-y-6 p-4 md:p-8">
    <header><p className="text-sm text-muted-foreground">Placement lifecycle</p><h1 className="text-3xl font-bold">Operations board</h1></header>
    {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {!error && placements.length === 0 && <p className="rounded-lg border p-6 text-muted-foreground">No active placements yet.</p>}
    {placements.length > 0 && <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[850px] text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">Candidate</th><th className="p-3">Employer</th><th className="p-3">Current state</th>{milestones.map(([, label]) => <th key={label} className="p-3">{label}</th>)}<th className="p-3">Last update</th></tr></thead><tbody>{placements.map(p => <tr key={p.id} className="border-t"><td className="p-3 font-medium">{p.maid_reference_code || 'Unassigned'}</td><td className="p-3">{p.employer_id || 'Unassigned'}</td><td className="p-3"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{p.status.replaceAll('_', ' ')}</span></td>{milestones.map(([key, label]) => <td key={label} className="p-3">{p[key] ? 'Complete' : 'Pending'}</td>)}<td className="p-3 text-muted-foreground">{new Date(p.last_status_at).toLocaleString()}<br />{p.last_actor}</td></tr>)}</tbody></table></div>}
  </main>
}
