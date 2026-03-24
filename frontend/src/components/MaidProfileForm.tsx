import { useState, FormEvent } from 'react'

type LanguageRating = 'Poor' | 'Average' | 'Good' | 'Excellent'
type MaritalStatus = 'Single' | 'Married' | 'Widowed' | 'Other'
type MaidType = 'Ex-Middle East' | 'Local' | 'Other'

interface EmploymentHistoryEntry {
  id: string
  fromDate: string
  toDate: string
  country: string
  employer: string
  duties: string
}

interface MaidSkills {
  handlePork: boolean
  eatPork: boolean
  careDogCat: boolean
  sewing: boolean
  gardening: boolean
  washCar: boolean
  canWorkOffDays: boolean
  offDaysPerMonth: number
}

interface MaidProfileFormState {
  fullName: string
  referenceCode: string
  type: MaidType
  nationality: string
  dateOfBirth: string
  placeOfBirth: string
  heightCm: number
  weightKg: number
  religion: string
  maritalStatus: MaritalStatus
  numberOfChildren: number
  numberOfSiblings: number
  homeCountryAddress: string
  airportForRepatriation: string
  educationLevel: string
  languageSkills: {
    english: LanguageRating
    mandarin: LanguageRating
    indonesian: LanguageRating
    tamil: LanguageRating
    malayalam: LanguageRating
    telugu: LanguageRating
    karnataka: LanguageRating
    other: string
  }
  skills: MaidSkills
  workAreas: { label: string; rating: number }[]
  employmentHistory: EmploymentHistoryEntry[]
  publicIntroduction: {
    summaryTraits: string
    salary: number
    offDayCompensation: string
    medicalConditions: string
  }
  agencyContact: {
    agency: string
    licenseNo: string
    contactPerson: string
    phone: string
  }
}

const initialFormState: MaidProfileFormState = {
  fullName: '',
  referenceCode: '',
  type: 'Local',
  nationality: '',
  dateOfBirth: '',
  placeOfBirth: '',
  heightCm: 0,
  weightKg: 0,
  religion: '',
  maritalStatus: 'Single',
  numberOfChildren: 0,
  numberOfSiblings: 0,
  homeCountryAddress: '',
  airportForRepatriation: '',
  educationLevel: '',
  languageSkills: {
    english: 'Poor',
    mandarin: 'Poor',
    indonesian: 'Poor',
    tamil: 'Poor',
    malayalam: 'Poor',
    telugu: 'Poor',
    karnataka: 'Poor',
    other: '',
  },
  skills: {
    handlePork: false,
    eatPork: false,
    careDogCat: false,
    sewing: false,
    gardening: false,
    washCar: false,
    canWorkOffDays: false,
    offDaysPerMonth: 0,
  },
  workAreas: [
    { label: 'Care of infants/children', rating: 0 },
    { label: 'Care of elderly', rating: 0 },
    { label: 'Care of disabled', rating: 0 },
    { label: 'General housework', rating: 0 },
    { label: 'Cooking', rating: 0 },
    { label: 'Other Skills', rating: 0 },
  ],
  employmentHistory: [],
  publicIntroduction: {
    summaryTraits: '',
    salary: 0,
    offDayCompensation: '',
    medicalConditions: '',
  },
  agencyContact: {
    agency: '',
    licenseNo: '',
    contactPerson: '',
    phone: '',
  },
}

export default function MaidProfileForm() {
  const [form, setForm] = useState<MaidProfileFormState>(initialFormState)

  const setFormField = <K extends keyof MaidProfileFormState>(field: K, value: MaidProfileFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const addEmploymentEntry = () => {
    setForm((prev) => ({
      ...prev,
      employmentHistory: [
        ...prev.employmentHistory,
        { id: crypto.randomUUID(), fromDate: '', toDate: '', country: '', employer: '', duties: '' },
      ],
    }))
  }

  const updateEmploymentEntry = (id: string, key: keyof EmploymentHistoryEntry, value: string) => {
    setForm((prev) => ({
      ...prev,
      employmentHistory: prev.employmentHistory.map((record) =>
        record.id === id ? { ...record, [key]: value } : record
      ),
    }))
  }

  const removeEmploymentEntry = (id: string) => {
    setForm((prev) => ({
      ...prev,
      employmentHistory: prev.employmentHistory.filter((record) => record.id !== id),
    }))
  }

  const submitProfile = async (e: FormEvent) => {
    e.preventDefault()
    const response = await fetch('/api/maids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!response.ok) {
      console.error('Failed to submit form', await response.text())
      return
    }
    alert('Maid profile submitted')
    setForm(initialFormState)
  }

  return (
    <form onSubmit={submitProfile} style={{ display: 'grid', gap: '1rem' }}>
      <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: 8 }}>
        <h3>Personal Information</h3>
        <input value={form.fullName} onChange={(e) => setFormField('fullName', e.target.value)} placeholder="Full Name" required />
        <input value={form.referenceCode} onChange={(e) => setFormField('referenceCode', e.target.value)} placeholder="Reference Code" />
        <select value={form.type} onChange={(e) => setFormField('type', e.target.value as MaidType)}>
          <option value="Ex-Middle East">Ex-Middle East</option>
          <option value="Local">Local</option>
          <option value="Other">Other</option>
        </select>
        <input value={form.nationality} onChange={(e) => setFormField('nationality', e.target.value)} placeholder="Nationality" />
        <input type="date" value={form.dateOfBirth} onChange={(e) => setFormField('dateOfBirth', e.target.value)} />
        <input value={form.placeOfBirth} onChange={(e) => setFormField('placeOfBirth', e.target.value)} placeholder="Place of Birth" />
        <input type="number" value={form.heightCm} onChange={(e) => setFormField('heightCm', Number(e.target.value))} placeholder="Height (cm)" />
        <input type="number" value={form.weightKg} onChange={(e) => setFormField('weightKg', Number(e.target.value))} placeholder="Weight (kg)" />
        <input value={form.religion} onChange={(e) => setFormField('religion', e.target.value)} placeholder="Religion" />
        <select value={form.maritalStatus} onChange={(e) => setFormField('maritalStatus', e.target.value as MaritalStatus)}>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
          <option value="Widowed">Widowed</option>
          <option value="Other">Other</option>
        </select>
        <input type="number" value={form.numberOfChildren} onChange={(e) => setFormField('numberOfChildren', Number(e.target.value))} placeholder="Number of Children" />
        <input type="number" value={form.numberOfSiblings} onChange={(e) => setFormField('numberOfSiblings', Number(e.target.value))} placeholder="Number of Siblings" />
        <textarea value={form.homeCountryAddress} onChange={(e) => setFormField('homeCountryAddress', e.target.value)} placeholder="Home Country Address" />
        <input value={form.airportForRepatriation} onChange={(e) => setFormField('airportForRepatriation', e.target.value)} placeholder="Airport for Repatriation" />
      </section>

      <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: 8 }}>
        <h3>Education & Language Skills</h3>
        <input value={form.educationLevel} onChange={(e) => setFormField('educationLevel', e.target.value)} placeholder="Education Level" />
        {(['english', 'mandarin', 'indonesian', 'tamil', 'malayalam', 'telugu'] as const).map((lang) => (
          <div key={lang}>
            <label>{lang}</label>
            <select
              value={form.languageSkills[lang]}
              onChange={(e) =>
                setFormField('languageSkills', {
                  ...form.languageSkills,
                  [lang]: e.target.value as LanguageRating,
                })
              }
            >
              <option value="Poor">Poor</option>
              <option value="Average">Average</option>
              <option value="Good">Good</option>
              <option value="Excellent">Excellent</option>
            </select>
          </div>
        ))}
        <input
          value={form.languageSkills.other}
          onChange={(e) =>
            setFormField('languageSkills', { ...form.languageSkills, other: e.target.value })
          }
          placeholder="Other Language"
        />
      </section>

      <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: 8 }}>
        <h3>Maid Skills & Preferences</h3>
        {Object.entries(form.skills).map(([key, value]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type={key === 'offDaysPerMonth' ? 'number' : 'checkbox'}
              checked={typeof value === 'boolean' ? value : false}
              value={String(value)}
              onChange={(e) => {
                if (key === 'offDaysPerMonth') {
                  setFormField('skills', { ...form.skills, offDaysPerMonth: Number(e.target.value) })
                } else {
                  setFormField('skills', { ...form.skills, [key]: e.target.checked })
                }
              }}
            />
            <span>{key}</span>
          </div>
        ))}
      </section>

      <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: 8 }}>
        <h3>Areas of Work & Experience</h3>
        {form.workAreas.map((entry, idx) => (
          <div key={entry.label} style={{ marginBottom: '0.5rem' }}>
            <label>{entry.label}</label>
            <input
              type="number"
              min={0}
              max={10}
              value={entry.rating}
              onChange={(e) => {
                const next = [...form.workAreas]
                next[idx].rating = Number(e.target.value)
                setForm((prev) => ({ ...prev, workAreas: next }))
              }}
            />
          </div>
        ))}
      </section>

      <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: 8 }}>
        <h3>Employment History</h3>
        {form.employmentHistory.map((entry) => (
          <div key={entry.id} style={{ border: '1px solid #ccc', borderRadius: 6, padding: 8, marginBottom: 8 }}>
            <input type="date" value={entry.fromDate} onChange={(e) => updateEmploymentEntry(entry.id, 'fromDate', e.target.value)} />
            <input type="date" value={entry.toDate} onChange={(e) => updateEmploymentEntry(entry.id, 'toDate', e.target.value)} />
            <input value={entry.country} placeholder="Country" onChange={(e) => updateEmploymentEntry(entry.id, 'country', e.target.value)} />
            <input value={entry.employer} placeholder="Employer" onChange={(e) => updateEmploymentEntry(entry.id, 'employer', e.target.value)} />
            <textarea value={entry.duties} placeholder="Duties / Remarks" onChange={(e) => updateEmploymentEntry(entry.id, 'duties', e.target.value)} />
            <button type="button" onClick={() => removeEmploymentEntry(entry.id)}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={addEmploymentEntry}>Add Employment</button>
      </section>

      <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: 8 }}>
        <h3>Public Introduction</h3>
        <textarea
          value={form.publicIntroduction.summaryTraits}
          onChange={(e) =>
            setFormField('publicIntroduction', { ...form.publicIntroduction, summaryTraits: e.target.value })
          }
          placeholder="Summary / Traits"
        />
        <input
          type="number"
          value={form.publicIntroduction.salary}
          onChange={(e) =>
            setFormField('publicIntroduction', { ...form.publicIntroduction, salary: Number(e.target.value) })
          }
          placeholder="Salary"
        />
        <textarea
          value={form.publicIntroduction.offDayCompensation}
          onChange={(e) =>
            setFormField('publicIntroduction', { ...form.publicIntroduction, offDayCompensation: e.target.value })
          }
          placeholder="Off-day compensation"
        />
        <textarea
          value={form.publicIntroduction.medicalConditions}
          onChange={(e) =>
            setFormField('publicIntroduction', { ...form.publicIntroduction, medicalConditions: e.target.value })
          }
          placeholder="Medical conditions"
        />
      </section>

      <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: 8 }}>
        <h3>Agency Contact Information</h3>
        <input value={form.agencyContact.agency} placeholder="Agency" onChange={(e) => setFormField('agencyContact', { ...form.agencyContact, agency: e.target.value })} />
        <input value={form.agencyContact.licenseNo} placeholder="License No." onChange={(e) => setFormField('agencyContact', { ...form.agencyContact, licenseNo: e.target.value })} />
        <input value={form.agencyContact.contactPerson} placeholder="Contact Person" onChange={(e) => setFormField('agencyContact', { ...form.agencyContact, contactPerson: e.target.value })} />
        <input value={form.agencyContact.phone} placeholder="Phone" onChange={(e) => setFormField('agencyContact', { ...form.agencyContact, phone: e.target.value })} />
      </section>

      <button type="submit" style={{ padding: '12px 20px', fontWeight: 'bold' }}>Submit Maid Profile</button>
    </form>
  )
}
