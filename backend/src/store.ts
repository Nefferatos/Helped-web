import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

export interface CompanyProfileRecord {
  id: number
  company_name: string
  short_name: string
  license_no: string
  address_line1: string
  address_line2?: string
  postal_code: string
  country: string
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  contact_fax?: string
  contact_website?: string
  office_hours_regular?: string
  office_hours_other?: string
  social_facebook?: string
  social_whatsapp_number?: string
  social_whatsapp_message?: string
  branding_theme_color?: string
  branding_button_color?: string
  created_at: string
  updated_at: string
}

export interface MOMPersonnelRecord {
  id: number
  company_id: number
  name: string
  registration_number: string
  created_at: string
}

export interface TestimonialRecord {
  id: number
  company_id: number
  message: string
  author: string
  created_at: string
}

export interface MaidRecord {
  id: number
  fullName: string
  referenceCode: string
  type: string
  nationality: string
  dateOfBirth: string
  placeOfBirth: string
  height: number
  weight: number
  religion: string
  maritalStatus: string
  numberOfChildren: number
  numberOfSiblings: number
  homeAddress: string
  airportRepatriation: string
  educationLevel: string
  languageSkills: Record<string, string>
  skillsPreferences: Record<string, unknown>
  workAreas: Record<string, unknown>
  employmentHistory: Array<Record<string, unknown>>
  introduction: Record<string, unknown>
  agencyContact: Record<string, unknown>
  isPublic: boolean
  hasPhoto: boolean
  createdAt: string
  updatedAt: string
}

export interface EnquiryRecord {
  id: number
  username: string
  date: string
  email: string
  phone: string
  message: string
  createdAt: string
}

interface AppData {
  companyProfile: CompanyProfileRecord
  momPersonnel: MOMPersonnelRecord[]
  testimonials: TestimonialRecord[]
  maids: MaidRecord[]
  enquiries: EnquiryRecord[]
  counters: {
    momPersonnel: number
    testimonials: number
    maids: number
    enquiries: number
  }
}

const now = () => new Date().toISOString()

const defaultData = (): AppData => ({
  companyProfile: {
    id: 1,
    company_name: 'At The Agency (formerly Rinzin Agency Pte. Ltd.)',
    short_name: 'At The Agency',
    license_no: '2503114',
    address_line1: 'Singapore',
    address_line2: '',
    postal_code: '000000',
    country: 'Singapore',
    contact_person: 'Bala',
    contact_phone: '80730757',
    contact_email: 'info@theagency.sg',
    contact_fax: '',
    contact_website: '',
    office_hours_regular: 'Mon-Sat: 9:00am to 7:30pm',
    office_hours_other: '',
    social_facebook: '',
    social_whatsapp_number: '80730757',
    social_whatsapp_message: 'Hello, I am interested in your agency profile.',
    branding_theme_color: '',
    branding_button_color: '',
    created_at: now(),
    updated_at: now(),
  },
  momPersonnel: [],
  testimonials: [],
  maids: [],
  enquiries: [
    {
      id: 1,
      username: 'Rajni',
      date: '23 March 2026, 12:58',
      email: 'rajnirose305@gmail.com',
      phone: '+918872486884',
      message:
        'M best in cooking.\n\nEmployer Requirement:\nNationality: Indian\nType: Ex-Singapore Maid\nAge: 41 and above\nDuty: Taking care of infant\nLanguage: English',
      createdAt: now(),
    },
    {
      id: 2,
      username: 'Devina',
      date: '23 March 2026, 12:57',
      email: 'devinachew@gmail.com',
      phone: '81381569',
      message:
        'Employer Requirement:\nNationality: Indonesian\nType: Transfer Maid\nAge: 31 to 35',
      createdAt: now(),
    },
    {
      id: 3,
      username: 'Shaiful',
      date: '23 March 2026, 12:00',
      email: 'hirqa@yahoo.com.sg',
      phone: '98214800',
      message:
        'urgently need a helper who is above 1.65m tall. must be strong & hygienic. can take care of elderly & disabled.',
      createdAt: now(),
    },
    {
      id: 4,
      username: 'Jit',
      date: '22 March 2026, 3:59',
      email: 'jitchu@yahoo.com',
      phone: '90275978',
      message:
        'Employer Requirement:\nNationality: Indonesian\nAge: 31 to 35\nDuty: Taking care of elderly / bedridden\nLanguage: English',
      createdAt: now(),
    },
    {
      id: 5,
      username: 'William Lawton',
      date: '22 March 2026, 3:59',
      email: 'William.Lawton100@gmail.com',
      phone: '19107283080',
      message:
        'Live in Spain, will have own apartment, cook, clean, market, massage therapist background as well would be amazing.\n\nEmployer Requirement:\nNationality: Filipino\nAge: 41 and above\nDuty: General Housekeeping\nLanguage: English\nOff-day: No Off-day',
      createdAt: now(),
    },
  ],
  counters: {
    momPersonnel: 1,
    testimonials: 1,
    maids: 1,
    enquiries: 6,
  },
})

const dataDir = path.resolve(__dirname, '../data')
const dataFile = path.join(dataDir, 'app-data.json')

let cache: AppData | null = null

const mergeAppData = (raw: Partial<AppData>): AppData => {
  const defaults = defaultData()

  return {
    companyProfile: {
      ...defaults.companyProfile,
      ...raw.companyProfile,
    },
    momPersonnel: raw.momPersonnel ?? defaults.momPersonnel,
    testimonials: raw.testimonials ?? defaults.testimonials,
    maids: raw.maids ?? defaults.maids,
    enquiries: raw.enquiries ?? defaults.enquiries,
    counters: {
      momPersonnel:
        raw.counters?.momPersonnel ??
        ((raw.momPersonnel?.length ?? 0) + 1 || defaults.counters.momPersonnel),
      testimonials:
        raw.counters?.testimonials ??
        ((raw.testimonials?.length ?? 0) + 1 ||
          defaults.counters.testimonials),
      maids:
        raw.counters?.maids ??
        ((raw.maids?.length ?? 0) + 1 || defaults.counters.maids),
      enquiries:
        raw.counters?.enquiries ??
        ((raw.enquiries?.length ?? defaults.enquiries.length) + 1),
    },
  }
}

const ensureDataFile = async () => {
  await mkdir(dataDir, { recursive: true })

  try {
    await readFile(dataFile, 'utf8')
  } catch {
    await writeFile(dataFile, JSON.stringify(defaultData(), null, 2), 'utf8')
  }
}

const loadData = async (): Promise<AppData> => {
  if (cache) {
    return cache
  }

  await ensureDataFile()
  const raw = await readFile(dataFile, 'utf8')
  cache = mergeAppData(JSON.parse(raw) as Partial<AppData>)
  await writeFile(dataFile, JSON.stringify(cache, null, 2), 'utf8')
  return cache
}

const saveData = async (data: AppData) => {
  cache = data
  await writeFile(dataFile, JSON.stringify(data, null, 2), 'utf8')
}

export const initializeStore = async () => {
  await ensureDataFile()
  await loadData()
}

export const getCompanyBundle = async () => {
  const data = await loadData()
  return {
    companyProfile: data.companyProfile,
    momPersonnel: data.momPersonnel,
    testimonials: data.testimonials,
  }
}

export const updateCompanyProfileStore = async (
  updates: Partial<CompanyProfileRecord>
) => {
  const data = await loadData()
  data.companyProfile = {
    ...data.companyProfile,
    ...updates,
    updated_at: now(),
  }
  await saveData(data)
  return data.companyProfile
}

export const addMomPersonnelStore = async (
  name: string,
  registrationNumber: string
) => {
  const data = await loadData()
  const record: MOMPersonnelRecord = {
    id: data.counters.momPersonnel++,
    company_id: 1,
    name,
    registration_number: registrationNumber,
    created_at: now(),
  }
  data.momPersonnel.push(record)
  await saveData(data)
  return record
}

export const updateMomPersonnelStore = async (
  id: number,
  updates: Partial<Pick<MOMPersonnelRecord, 'name' | 'registration_number'>>
) => {
  const data = await loadData()
  const index = data.momPersonnel.findIndex((item) => item.id === id)
  if (index === -1) return null
  data.momPersonnel[index] = { ...data.momPersonnel[index], ...updates }
  await saveData(data)
  return data.momPersonnel[index]
}

export const deleteMomPersonnelStore = async (id: number) => {
  const data = await loadData()
  const existing = data.momPersonnel.find((item) => item.id === id)
  if (!existing) return null
  data.momPersonnel = data.momPersonnel.filter((item) => item.id !== id)
  await saveData(data)
  return existing
}

export const addTestimonialStore = async (message: string, author: string) => {
  const data = await loadData()
  const record: TestimonialRecord = {
    id: data.counters.testimonials++,
    company_id: 1,
    message,
    author,
    created_at: now(),
  }
  data.testimonials.unshift(record)
  await saveData(data)
  return record
}

export const deleteTestimonialStore = async (id: number) => {
  const data = await loadData()
  const existing = data.testimonials.find((item) => item.id === id)
  if (!existing) return null
  data.testimonials = data.testimonials.filter((item) => item.id !== id)
  await saveData(data)
  return existing
}

export const getMaidsStore = async (search?: string, visibility?: string) => {
  const data = await loadData()
  let maids = [...data.maids]

  if (search?.trim()) {
    const term = search.trim().toLowerCase()
    maids = maids.filter(
      (maid) =>
        maid.fullName.toLowerCase().includes(term) ||
        maid.referenceCode.toLowerCase().includes(term)
    )
  }

  if (visibility === 'public' || visibility === 'hidden') {
    const isPublic = visibility === 'public'
    maids = maids.filter((maid) => maid.isPublic === isPublic)
  }

  return maids.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export const getMaidByReferenceCodeStore = async (referenceCode: string) => {
  const data = await loadData()
  return data.maids.find((maid) => maid.referenceCode === referenceCode) ?? null
}

export const createMaidStore = async (
  maid: Omit<MaidRecord, 'id' | 'createdAt' | 'updatedAt'>
) => {
  const data = await loadData()
  const existing = data.maids.find(
    (item) => item.referenceCode === maid.referenceCode
  )
  if (existing) {
    throw new Error('REFERENCE_CODE_EXISTS')
  }

  const record: MaidRecord = {
    ...maid,
    id: data.counters.maids++,
    createdAt: now(),
    updatedAt: now(),
  }
  data.maids.unshift(record)
  await saveData(data)
  return record
}

export const updateMaidStore = async (
  referenceCode: string,
  updates: Omit<MaidRecord, 'id' | 'createdAt' | 'updatedAt'>
) => {
  const data = await loadData()
  const index = data.maids.findIndex((maid) => maid.referenceCode === referenceCode)
  if (index === -1) return null

  const duplicate = data.maids.find(
    (maid) =>
      maid.referenceCode === updates.referenceCode &&
      maid.referenceCode !== referenceCode
  )
  if (duplicate) {
    throw new Error('REFERENCE_CODE_EXISTS')
  }

  data.maids[index] = {
    ...data.maids[index],
    ...updates,
    updatedAt: now(),
  }
  await saveData(data)
  return data.maids[index]
}

export const updateMaidVisibilityStore = async (
  referenceCode: string,
  isPublic: boolean
) => {
  const data = await loadData()
  const index = data.maids.findIndex((maid) => maid.referenceCode === referenceCode)
  if (index === -1) return null
  data.maids[index] = {
    ...data.maids[index],
    isPublic,
    updatedAt: now(),
  }
  await saveData(data)
  return data.maids[index]
}

export const deleteMaidStore = async (referenceCode: string) => {
  const data = await loadData()
  const existing = data.maids.find((maid) => maid.referenceCode === referenceCode)
  if (!existing) return null
  data.maids = data.maids.filter((maid) => maid.referenceCode !== referenceCode)
  await saveData(data)
  return existing
}

export const getEnquiriesStore = async (search?: string) => {
  const data = await loadData()
  let enquiries = [...data.enquiries]

  if (search?.trim()) {
    const term = search.trim().toLowerCase()
    enquiries = enquiries.filter(
      (enquiry) =>
        enquiry.username.toLowerCase().includes(term) ||
        enquiry.email.toLowerCase().includes(term) ||
        enquiry.phone.toLowerCase().includes(term) ||
        enquiry.message.toLowerCase().includes(term)
    )
  }

  return enquiries.sort((a, b) => b.id - a.id)
}

export const addEnquiryStore = async (
  payload: Omit<EnquiryRecord, 'id' | 'createdAt'>
) => {
  const data = await loadData()
  const record: EnquiryRecord = {
    ...payload,
    id: data.counters.enquiries++,
    createdAt: now(),
  }
  data.enquiries.unshift(record)
  await saveData(data)
  return record
}

export const deleteEnquiryStore = async (id: number) => {
  const data = await loadData()
  const existing = data.enquiries.find((item) => item.id === id)
  if (!existing) return null
  data.enquiries = data.enquiries.filter((item) => item.id !== id)
  await saveData(data)
  return existing
}
