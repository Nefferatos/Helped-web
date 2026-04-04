import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

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
  about_us?: string
  logo_data_url?: string
  gallery_image_data_urls?: string[]
  intro_video_data_url?: string
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
  status?: string
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
  photoDataUrls: string[]
  photoDataUrl: string
  videoDataUrl: string
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

export interface ClientRecord {
  id: number
  supabaseUserId?: string
  name: string
  company?: string
  phone?: string
  email: string
  password: string
  profileImageUrl?: string
  createdAt: string
}

export interface ClientSessionRecord {
  token: string
  clientId: number
  createdAt: string
}

export interface AgencyAdminRecord {
  id: number
  supabaseUserId?: string
  username: string
  password: string
  agencyName: string
  profileImageUrl?: string
  createdAt: string
}

export interface AgencyAdminSessionRecord {
  token: string
  adminId: number
  createdAt: string
}

export interface DirectSaleRecord {
  id: number
  maidReferenceCode: string
  maidName: string
  clientId: number
  clientName: string
  clientEmail: string
  clientPhone: string
  status: string
  requestDetails?: Record<string, string>
  createdAt: string
}

export interface ChatMessageRecord {
  id: number
  clientId: number
  conversationType: 'support' | 'agency'
  agencyId?: number
  agencyName?: string
  senderRole: 'client' | 'agency'
  senderName: string
  message: string
  createdAt: string
  readByAgency: boolean
  readByClient: boolean
}

interface AppData {
  companyProfile: CompanyProfileRecord
  momPersonnel: MOMPersonnelRecord[]
  testimonials: TestimonialRecord[]
  maids: MaidRecord[]
  enquiries: EnquiryRecord[]
  clients: ClientRecord[]
  clientSessions: ClientSessionRecord[]
  agencyAdmins: AgencyAdminRecord[]
  agencyAdminSessions: AgencyAdminSessionRecord[]
  directSales: DirectSaleRecord[]
  chatMessages: ChatMessageRecord[]
  counters: {
    momPersonnel: number
    testimonials: number
    maids: number
    enquiries: number
    clients: number
    agencyAdmins: number
    directSales: number
    chatMessages: number
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
    about_us: '',
    logo_data_url: '',
    gallery_image_data_urls: [],
    intro_video_data_url: '',
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
  clients: [],
  clientSessions: [],
  agencyAdmins: [
    {
      id: 1,
      username: 'attheagency',
      password: '@atagency2026',
      agencyName: 'Main Agency',
      createdAt: now(),
    },
  ],
  agencyAdminSessions: [],
  directSales: [],
  chatMessages: [],
  counters: {
    momPersonnel: 1,
    testimonials: 1,
    maids: 1,
    enquiries: 6,
    clients: 1,
    agencyAdmins: 2,
    directSales: 1,
    chatMessages: 1,
  },
})

const dataDir = path.resolve(__dirname, '../data')
const dataFile = path.join(dataDir, 'app-data.json')

let cache: AppData | null = null

const stripBom = (value: string) => value.replace(/^\uFEFF/, '')

const mergeAppData = (raw: Partial<AppData>): AppData => {
  const defaults = defaultData()

  return {
    companyProfile: {
      ...defaults.companyProfile,
      ...raw.companyProfile,
      gallery_image_data_urls:
        Array.isArray(raw.companyProfile?.gallery_image_data_urls)
          ? raw.companyProfile.gallery_image_data_urls
          : defaults.companyProfile.gallery_image_data_urls,
    },
    momPersonnel: raw.momPersonnel ?? defaults.momPersonnel,
    testimonials: raw.testimonials ?? defaults.testimonials,
    maids: (raw.maids ?? defaults.maids).map((maid) => {
      const normalizedPhotos = Array.isArray(maid.photoDataUrls)
        ? maid.photoDataUrls.filter((item) => typeof item === 'string' && item.trim())
        : maid.photoDataUrl
        ? [maid.photoDataUrl]
        : []
      return {
        ...maid,
        status: maid.status ?? 'available',
        photoDataUrls: normalizedPhotos.slice(0, 5),
        photoDataUrl: normalizedPhotos[0] ?? maid.photoDataUrl ?? '',
        videoDataUrl: maid.videoDataUrl ?? '',
        hasPhoto: normalizedPhotos.length > 0,
      }
    }),
    enquiries: raw.enquiries ?? defaults.enquiries,
    clients: (raw.clients ?? defaults.clients).map((client) => ({
      ...client,
      supabaseUserId: client.supabaseUserId || undefined,
      name: client.name ?? '',
      company: client.company ?? '',
      phone: client.phone ?? '',
      email: client.email ?? '',
      profileImageUrl: client.profileImageUrl ?? '',
      createdAt: client.createdAt ?? now(),
    })),
    clientSessions: raw.clientSessions ?? defaults.clientSessions,
    agencyAdmins: (raw.agencyAdmins ?? defaults.agencyAdmins).map((admin) => ({
      ...admin,
      supabaseUserId: admin.supabaseUserId || undefined,
    })),
    agencyAdminSessions:
      raw.agencyAdminSessions ?? defaults.agencyAdminSessions,
    directSales: raw.directSales ?? defaults.directSales,
    chatMessages:
      raw.chatMessages?.map((message) => ({
        ...message,
        conversationType: message.conversationType ?? 'support',
        agencyId: message.agencyId,
        agencyName: message.agencyName ?? '',
      })) ?? defaults.chatMessages,
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
      clients:
        raw.counters?.clients ??
        ((raw.clients?.length ?? 0) + 1 || defaults.counters.clients),
      agencyAdmins:
        raw.counters?.agencyAdmins ??
        ((raw.agencyAdmins?.length ?? 0) + 1 || defaults.counters.agencyAdmins),
      directSales:
        raw.counters?.directSales ??
        ((raw.directSales?.length ?? 0) + 1 || defaults.counters.directSales),
      chatMessages:
        raw.counters?.chatMessages ??
        ((raw.chatMessages?.length ?? 0) + 1 || defaults.counters.chatMessages),
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
  cache = mergeAppData(JSON.parse(stripBom(raw)) as Partial<AppData>)
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
    status: maid.status ?? 'available',
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

export const updateMaidPhotoStore = async (
  referenceCode: string,
  photoDataUrl: string
) => {
  const data = await loadData()
  const index = data.maids.findIndex((maid) => maid.referenceCode === referenceCode)
  if (index === -1) return null
  data.maids[index] = {
    ...data.maids[index],
    photoDataUrls: photoDataUrl ? [photoDataUrl] : [],
    photoDataUrl,
    hasPhoto: Boolean(photoDataUrl),
    updatedAt: now(),
  }
  await saveData(data)
  return data.maids[index]
}

export const addMaidPhotoStore = async (
  referenceCode: string,
  photoDataUrl: string
) => {
  const data = await loadData()
  const index = data.maids.findIndex((maid) => maid.referenceCode === referenceCode)
  if (index === -1) return null
  const currentPhotos = Array.isArray(data.maids[index].photoDataUrls)
    ? data.maids[index].photoDataUrls
    : data.maids[index].photoDataUrl
    ? [data.maids[index].photoDataUrl]
    : []
  const nextPhotos = [...currentPhotos]
  if (photoDataUrl) {
    if (nextPhotos.length >= 5) {
      throw new Error('PHOTO_LIMIT_REACHED')
    }
    nextPhotos.push(photoDataUrl)
  }
  data.maids[index] = {
    ...data.maids[index],
    photoDataUrls: nextPhotos,
    photoDataUrl: nextPhotos[0] ?? '',
    hasPhoto: nextPhotos.length > 0,
    updatedAt: now(),
  }
  await saveData(data)
  return data.maids[index]
}

export const updateMaidVideoStore = async (
  referenceCode: string,
  videoDataUrl: string
) => {
  const data = await loadData()
  const index = data.maids.findIndex((maid) => maid.referenceCode === referenceCode)
  if (index === -1) return null
  data.maids[index] = {
    ...data.maids[index],
    videoDataUrl,
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

export const getClientsStore = async () => {
  const data = await loadData()
  return [...data.clients].sort((a, b) => b.id - a.id)
}

export const registerAgencyAdminStore = async (payload: {
  username: string
  password: string
  agencyName: string
}) => {
  const data = await loadData()
  const existing = data.agencyAdmins.find(
    (admin) => admin.username.toLowerCase() === payload.username.toLowerCase()
  )

  if (existing) {
    throw new Error('AGENCY_ADMIN_USERNAME_EXISTS')
  }

  const record: AgencyAdminRecord = {
    id: data.counters.agencyAdmins++,
    username: payload.username,
    password: payload.password,
    agencyName: payload.agencyName,
    createdAt: now(),
  }

  data.agencyAdmins.unshift(record)
  await saveData(data)
  return record
}

export const authenticateAgencyAdminStore = async (
  username: string,
  password: string
) => {
  const data = await loadData()
  return (
    data.agencyAdmins.find(
      (admin) =>
        admin.username.toLowerCase() === username.toLowerCase() &&
        admin.password === password
    ) ?? null
  )
}

export const createAgencyAdminSessionStore = async (adminId: number) => {
  const data = await loadData()
  data.agencyAdminSessions = data.agencyAdminSessions.filter(
    (session) => session.adminId !== adminId
  )

  const session: AgencyAdminSessionRecord = {
    token: randomBytes(24).toString('hex'),
    adminId,
    createdAt: now(),
  }

  data.agencyAdminSessions.unshift(session)
  await saveData(data)
  return session
}

export const deleteAgencyAdminSessionStore = async (token: string) => {
  const data = await loadData()
  const existing = data.agencyAdminSessions.find(
    (session) => session.token === token
  )
  if (!existing) return null
  data.agencyAdminSessions = data.agencyAdminSessions.filter(
    (session) => session.token !== token
  )
  await saveData(data)
  return existing
}

export const getAgencyAdminByTokenStore = async (token: string) => {
  const data = await loadData()
  const session = data.agencyAdminSessions.find((item) => item.token === token)
  if (!session) return null
  return data.agencyAdmins.find((item) => item.id === session.adminId) ?? null
}

export const registerClientStore = async (payload: {
  name: string
  company?: string
  phone?: string
  email: string
  password: string
}) => {
  const data = await loadData()
  const existing = data.clients.find(
    (client) => client.email.toLowerCase() === payload.email.toLowerCase()
  )

  if (existing) {
    throw new Error('CLIENT_EMAIL_EXISTS')
  }

  const record: ClientRecord = {
    id: data.counters.clients++,
    name: payload.name,
    company: payload.company ?? '',
    phone: payload.phone ?? '',
    email: payload.email,
    password: payload.password,
    profileImageUrl: '',
    createdAt: now(),
  }

  data.clients.unshift(record)
  await saveData(data)
  return record
}

export const authenticateClientStore = async (
  email: string,
  password: string
) => {
  const data = await loadData()
  return (
    data.clients.find(
      (client) =>
        client.email.toLowerCase() === email.toLowerCase() &&
        client.password === password
    ) ?? null
  )
}

export const createClientSessionStore = async (clientId: number) => {
  const data = await loadData()
  data.clientSessions = data.clientSessions.filter(
    (session) => session.clientId !== clientId
  )
  const session: ClientSessionRecord = {
    token: randomBytes(24).toString('hex'),
    clientId,
    createdAt: now(),
  }
  data.clientSessions.unshift(session)
  await saveData(data)
  return session
}

export const deleteClientSessionStore = async (token: string) => {
  const data = await loadData()
  const existing = data.clientSessions.find((session) => session.token === token)
  if (!existing) return null
  data.clientSessions = data.clientSessions.filter(
    (session) => session.token !== token
  )
  await saveData(data)
  return existing
}

export const getClientByTokenStore = async (token: string) => {
  const data = await loadData()
  const session = data.clientSessions.find((item) => item.token === token)
  if (!session) return null
  const client = data.clients.find((item) => item.id === session.clientId)
  if (!client) return null
  return client
}

// Supabase Auth bridge:
// When frontend uses Supabase social/phone login, it sends Supabase JWT as Bearer token.
// This helper maps the Supabase user to a local client record (creating one if needed).
export const getOrCreateClientBySupabaseUserStore = async (user: {
  id: string
  email?: string
  phone?: string
  user_metadata?: Record<string, unknown>
}) => {
  const data = await loadData()
  const normalizedEmail = (user.email ?? '').trim().toLowerCase()

  const existing =
    data.clients.find((item) => item.supabaseUserId === user.id) ??
    (normalizedEmail
      ? data.clients.find(
          (item) => (item.email ?? '').trim().toLowerCase() === normalizedEmail
        )
      : null) ??
    (user.phone
      ? data.clients.find((item) => (item.phone ?? '').trim() === user.phone!.trim())
      : null)

  if (existing) {
    if (!existing.supabaseUserId) {
      existing.supabaseUserId = user.id
      await saveData(data)
    }
    return existing
  }

  const nameFromMeta =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    ''

  const client: ClientRecord = {
    id: data.counters.clients++,
    supabaseUserId: user.id,
    name: nameFromMeta || (user.email ? user.email.split('@')[0] : 'Client'),
    company: '',
    phone: user.phone ?? '',
    email: user.email ?? '',
    password: '',
    profileImageUrl: '',
    createdAt: now(),
  }

  data.clients.unshift(client)
  await saveData(data)
  return client
}

export const updateClientStore = async (
  clientId: number,
  updates: {
    name?: string
    company?: string
    phone?: string
    email?: string
    profileImageUrl?: string
  }
) => {
  const data = await loadData()
  const index = data.clients.findIndex((client) => client.id === clientId)
  if (index === -1) {
    return null
  }

  if (
    updates.email?.trim() &&
    data.clients.some(
      (client) =>
        client.id !== clientId &&
        client.email.toLowerCase() === updates.email!.trim().toLowerCase()
    )
  ) {
    throw new Error('CLIENT_EMAIL_EXISTS')
  }

  data.clients[index] = {
    ...data.clients[index],
    name: updates.name?.trim() || data.clients[index].name,
    company:
      typeof updates.company === 'string'
        ? updates.company.trim()
        : data.clients[index].company,
    phone:
      typeof updates.phone === 'string'
        ? updates.phone.trim()
        : (data.clients[index].phone ?? ''),
    email: updates.email?.trim() || data.clients[index].email,
    profileImageUrl:
      typeof updates.profileImageUrl === 'string'
        ? updates.profileImageUrl
        : data.clients[index].profileImageUrl,
  }

  data.directSales = data.directSales.map((sale) =>
    sale.clientId === clientId
      ? {
          ...sale,
          clientName: data.clients[index].name,
          clientEmail: data.clients[index].email,
          clientPhone: data.clients[index].phone || '',
        }
      : sale
  )

  await saveData(data)
  return data.clients[index]
}

export const getClientOptionsStore = async () => {
  const clients = await getClientsStore()
  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email,
    company: client.company || '',
    phone: client.phone || '',
    enquiryDate: client.createdAt,
  }))
}

export const getDirectSalesStore = async () => {
  const data = await loadData()
  return [...data.directSales].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export const getChatMessagesForClientStore = async (
  clientId: number,
  conversationType: 'support' | 'agency' = 'support',
  agencyId?: number
) => {
  const data = await loadData()
  const client = data.clients.find((item) => item.id === clientId)
  if (!client) {
    throw new Error('CLIENT_NOT_FOUND')
  }

  return data.chatMessages
    .filter(
      (message) =>
        message.clientId === clientId &&
        message.conversationType === conversationType &&
        (conversationType === 'support' || message.agencyId === agencyId)
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export const getChatConversationsStore = async () => {
  const data = await loadData()
  const conversations = new Map<
    string,
    {
      key: string
      clientId: number
      conversationType: 'support' | 'agency'
      agencyId?: number
      agencyName?: string
      clientName: string
      clientEmail: string
      clientCompany: string
      lastMessage: string
      lastMessageAt: string
      unreadCount: number
    }
  >()

  data.chatMessages.forEach((message) => {
    const client = data.clients.find((item) => item.id === message.clientId)
    if (!client) return

    const key = `${message.clientId}:${message.conversationType}:${message.agencyId ?? 0}`
    const existing = conversations.get(key)
    const unreadIncrement =
      message.senderRole === 'client' && !message.readByAgency ? 1 : 0

    if (!existing) {
      conversations.set(key, {
        key,
        clientId: client.id,
        conversationType: message.conversationType,
        agencyId: message.agencyId,
        agencyName: message.agencyName || '',
        clientName: client.name,
        clientEmail: client.email,
        clientCompany: client.company || '',
        lastMessage: message.message,
        lastMessageAt: message.createdAt,
        unreadCount: unreadIncrement,
      })
      return
    }

    existing.unreadCount += unreadIncrement
    if (
      new Date(message.createdAt).getTime() >=
      new Date(existing.lastMessageAt).getTime()
    ) {
      existing.lastMessage = message.message
      existing.lastMessageAt = message.createdAt
    }
  })

  return Array.from(conversations.values()).sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  )
}

export const createChatMessageStore = async (payload: {
  clientId: number
  conversationType: 'support' | 'agency'
  agencyId?: number
  agencyName?: string
  senderRole: 'client' | 'agency'
  senderName: string
  message: string
}) => {
  const data = await loadData()
  const client = data.clients.find((item) => item.id === payload.clientId)
  if (!client) {
    throw new Error('CLIENT_NOT_FOUND')
  }

  const record: ChatMessageRecord = {
    id: data.counters.chatMessages++,
    clientId: payload.clientId,
    conversationType: payload.conversationType,
    agencyId: payload.agencyId,
    agencyName: payload.agencyName ?? '',
    senderRole: payload.senderRole,
    senderName: payload.senderName,
    message: payload.message,
    createdAt: now(),
    readByAgency: payload.senderRole === 'agency',
    readByClient: payload.senderRole === 'client',
  }

  data.chatMessages.push(record)
  await saveData(data)
  return record
}

export const markChatMessagesReadForAgencyStore = async (
  clientId: number,
  conversationType: 'support' | 'agency' = 'support',
  agencyId?: number
) => {
  const data = await loadData()
  data.chatMessages = data.chatMessages.map((message) =>
    message.clientId === clientId &&
    message.senderRole === 'client' &&
    message.conversationType === conversationType &&
    (conversationType === 'support' || message.agencyId === agencyId)
      ? { ...message, readByAgency: true }
      : message
  )
  await saveData(data)
}

export const markChatMessagesReadForClientStore = async (
  clientId: number,
  conversationType: 'support' | 'agency' = 'support',
  agencyId?: number
) => {
  const data = await loadData()
  data.chatMessages = data.chatMessages.map((message) =>
    message.clientId === clientId &&
    message.senderRole === 'agency' &&
    message.conversationType === conversationType &&
    (conversationType === 'support' || message.agencyId === agencyId)
      ? { ...message, readByClient: true }
      : message
  )
  await saveData(data)
}

export const getUnreadAgencyChatCountStore = async () => {
  const data = await loadData()
  return data.chatMessages.filter(
    (message) => message.senderRole === 'client' && !message.readByAgency
  ).length
}

export const createDirectSaleStore = async (
  maidReferenceCode: string,
  clientId: number,
  status: string = 'pending',
  requestDetails?: Record<string, string>
) => {
  const data = await loadData()
  const maidIndex = data.maids.findIndex(
    (maid) => maid.referenceCode === maidReferenceCode
  )
  if (maidIndex === -1) {
    throw new Error('MAID_NOT_FOUND')
  }

  const client = data.clients.find((item) => item.id === clientId)
  if (!client) {
    throw new Error('CLIENT_NOT_FOUND')
  }

  const record: DirectSaleRecord = {
    id: data.counters.directSales++,
    maidReferenceCode,
    maidName: data.maids[maidIndex].fullName,
    clientId: client.id,
    clientName: client.name,
    clientEmail: client.email,
    clientPhone: client.phone || '',
    status,
    requestDetails,
    createdAt: now(),
  }

  data.directSales.unshift(record)
  data.maids[maidIndex] = {
    ...data.maids[maidIndex],
    status:
      status === 'interested'
        ? 'interested'
        : status === 'direct_hire'
        ? 'reserved'
        : status === 'rejected'
        ? 'rejected'
        : 'sent',
    updatedAt: now(),
  }

  await saveData(data)

  return {
    directSale: record,
    maid: data.maids[maidIndex],
  }
}

export const updateDirectSaleStatusStore = async (
  id: number,
  status: string
) => {
  const data = await loadData()
  const directSaleIndex = data.directSales.findIndex((item) => item.id === id)
  if (directSaleIndex === -1) {
    return null
  }

  data.directSales[directSaleIndex] = {
    ...data.directSales[directSaleIndex],
    status,
  }

  const maidIndex = data.maids.findIndex(
    (maid) =>
      maid.referenceCode === data.directSales[directSaleIndex].maidReferenceCode
  )

  if (maidIndex !== -1) {
    data.maids[maidIndex] = {
      ...data.maids[maidIndex],
      status:
        status === 'interested'
          ? 'interested'
          : status === 'direct_hire'
          ? 'reserved'
          : status === 'rejected'
          ? 'rejected'
          : 'sent',
      updatedAt: now(),
    }
  }

  await saveData(data)

  return {
    directSale: data.directSales[directSaleIndex],
    maid: maidIndex !== -1 ? data.maids[maidIndex] : null,
  }
}

export const getAssignedMaidsForClientStore = async (clientId: number) => {
  const data = await loadData()

  return data.directSales
    .filter((sale) => sale.clientId === clientId)
    .map((sale) => ({
      directSale: sale,
      maid:
        data.maids.find(
          (maid) => maid.referenceCode === sale.maidReferenceCode
        ) ?? null,
    }))
    .filter(
      (item): item is { directSale: DirectSaleRecord; maid: MaidRecord } =>
        Boolean(item.maid)
    )
}

export const getChatConversationsForClientStore = async (clientId: number) => {
  const data = await loadData()
  const client = data.clients.find((item) => item.id === clientId)
  if (!client) {
    throw new Error('CLIENT_NOT_FOUND')
  }

  const conversations = new Map<
    string,
    {
      key: string
      clientId: number
      conversationType: 'support' | 'agency'
      agencyId?: number
      agencyName?: string
      title: string
      description: string
      lastMessage: string
      lastMessageAt: string
      unreadCount: number
    }
  >()

  data.chatMessages
    .filter((message) => message.clientId === clientId)
    .forEach((message) => {
      const key = `${message.conversationType}:${message.agencyId ?? 0}`
      const existing = conversations.get(key)
      const unreadIncrement =
        message.senderRole === 'agency' && !message.readByClient ? 1 : 0
      const title =
        message.conversationType === 'agency'
          ? message.agencyName || 'Agency'
          : 'Agency Support'
      const description =
        message.conversationType === 'agency'
          ? 'Direct chat with agency'
          : 'General help, follow-up, and request support'

      if (!existing) {
        conversations.set(key, {
          key,
          clientId,
          conversationType: message.conversationType,
          agencyId: message.agencyId,
          agencyName: message.agencyName || '',
          title,
          description,
          lastMessage: message.message,
          lastMessageAt: message.createdAt,
          unreadCount: unreadIncrement,
        })
        return
      }

      existing.unreadCount += unreadIncrement
      if (
        new Date(message.createdAt).getTime() >=
        new Date(existing.lastMessageAt).getTime()
      ) {
        existing.lastMessage = message.message
        existing.lastMessageAt = message.createdAt
      }
    })

  if (!conversations.has('support:0')) {
    conversations.set('support:0', {
      key: 'support:0',
      clientId,
      conversationType: 'support',
      title: 'Agency Support',
      description: 'General help, follow-up, and request support',
      lastMessage: '',
      lastMessageAt: client.createdAt,
      unreadCount: 0,
    })
  }

  return Array.from(conversations.values()).sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  )
}

export const getUnreadChatCountForAdminStore = async () => {
  const conversations = await getChatConversationsStore()
  return conversations.reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0
  )
}

export const getUnreadChatCountForClientStore = async (clientId: number) => {
  const conversations = await getChatConversationsForClientStore(clientId)
  return conversations.reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0
  )
}

export const getClientHistoryStore = async (clientId: number) => {
  const data = await loadData()

  return data.directSales
    .filter((sale) => sale.clientId === clientId)
    .map((sale) => ({
      directSale: sale,
      maid:
        data.maids.find(
          (maid) => maid.referenceCode === sale.maidReferenceCode
        ) ?? null,
    }))
    .sort(
      (a, b) =>
        new Date(b.directSale.createdAt).getTime() -
        new Date(a.directSale.createdAt).getTime()
    )
}

export const updateDirectSaleStatusForClientStore = async (
  id: number,
  clientId: number,
  status: string
) => {
  const data = await loadData()
  const sale = data.directSales.find((item) => item.id === id)
  if (!sale || sale.clientId !== clientId) {
    return null
  }

  return updateDirectSaleStatusStore(id, status)
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
