import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ExecutionContext, KVNamespace } from '@cloudflare/workers-types'

type AssetsBinding = {
  fetch: (request: Request) => Promise<Response>
}

interface MaidRecord {
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

interface CompanyProfileRecord {
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

interface MOMPersonnelRecord {
  id: number
  company_id: number
  name: string
  registration_number: string
  created_at: string
}

interface TestimonialRecord {
  id: number
  company_id: number
  message: string
  author: string
  created_at: string
}

interface EnquiryRecord {
  id: number
  username: string
  date: string
  email: string
  phone: string
  message: string
  createdAt: string
}

interface ClientRecord {
  id: number
  name: string
  company?: string
  email: string
  password: string
  phone?: string
  profileImageUrl?: string
  createdAt: string
}

interface ClientSessionRecord {
  token: string
  clientId: number
  createdAt: string
}

interface AgencyAdminRecord {
  id: number
  username: string
  password: string
  agencyName: string
  profileImageUrl?: string
  createdAt: string
}

interface AgencyAdminSessionRecord {
  token: string
  adminId: number
  createdAt: string
}

interface DirectSaleRecord {
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

interface ChatMessageRecord {
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

type Bindings = {
  APP_DATA: KVNamespace
  ASSETS: AssetsBinding
}

type Variables = {
  client: ClientRecord
  agencyAdmin: AgencyAdminRecord
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('/api/*', cors())

const now = () => new Date().toISOString()

const stripBom = (value: string) => value.replace(/^\uFEFF/, '')

const buildFallbackDate = () =>
  new Intl.DateTimeFormat('en-SG', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Singapore',
  }).format(new Date())

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
      username: 'admin',
      password: 'admin123',
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

const nextCounter = (current: number | undefined, ids: number[], fallback: number) => {
  if (typeof current === 'number') return current
  if (ids.length === 0) return fallback
  return Math.max(...ids, fallback - 1) + 1
}

const normalizeMaid = (maid: MaidRecord): MaidRecord => {
  const photos = Array.isArray(maid.photoDataUrls)
    ? maid.photoDataUrls.filter((item) => typeof item === 'string' && item.trim())
    : maid.photoDataUrl
      ? [maid.photoDataUrl]
      : []

  return {
    ...maid,
    status: maid.status ?? 'available',
    photoDataUrls: photos.slice(0, 5),
    photoDataUrl: photos[0] ?? maid.photoDataUrl ?? '',
    videoDataUrl: maid.videoDataUrl ?? '',
    hasPhoto: photos.length > 0,
  }
}

const mergeAppData = (raw: Partial<AppData>): AppData => {
  const defaults = defaultData()
  const maids = (raw.maids ?? defaults.maids).map(normalizeMaid)
  const enquiries = raw.enquiries ?? defaults.enquiries
  const clients = raw.clients ?? defaults.clients
  const agencyAdmins = raw.agencyAdmins ?? defaults.agencyAdmins
  const directSales = raw.directSales ?? defaults.directSales
  const chatMessages = raw.chatMessages ?? defaults.chatMessages

  return {
    companyProfile: {
      ...defaults.companyProfile,
      ...raw.companyProfile,
      gallery_image_data_urls: Array.isArray(raw.companyProfile?.gallery_image_data_urls)
        ? raw.companyProfile.gallery_image_data_urls
        : defaults.companyProfile.gallery_image_data_urls,
    },
    momPersonnel: raw.momPersonnel ?? defaults.momPersonnel,
    testimonials: raw.testimonials ?? defaults.testimonials,
    maids,
    enquiries,
    clients,
    clientSessions: raw.clientSessions ?? defaults.clientSessions,
    agencyAdmins,
    agencyAdminSessions: raw.agencyAdminSessions ?? defaults.agencyAdminSessions,
    directSales,
    chatMessages: chatMessages.map((message) => ({
      ...message,
      conversationType: message.conversationType ?? 'support',
      agencyName: message.agencyName ?? '',
    })),
    counters: {
      momPersonnel: nextCounter(raw.counters?.momPersonnel, (raw.momPersonnel ?? []).map((item) => item.id), defaults.counters.momPersonnel),
      testimonials: nextCounter(raw.counters?.testimonials, (raw.testimonials ?? []).map((item) => item.id), defaults.counters.testimonials),
      maids: nextCounter(raw.counters?.maids, maids.map((item) => item.id), defaults.counters.maids),
      enquiries: nextCounter(raw.counters?.enquiries, enquiries.map((item) => item.id), defaults.counters.enquiries),
      clients: nextCounter(raw.counters?.clients, clients.map((item) => item.id), defaults.counters.clients),
      agencyAdmins: nextCounter(raw.counters?.agencyAdmins, agencyAdmins.map((item) => item.id), defaults.counters.agencyAdmins),
      directSales: nextCounter(raw.counters?.directSales, directSales.map((item) => item.id), defaults.counters.directSales),
      chatMessages: nextCounter(raw.counters?.chatMessages, chatMessages.map((item) => item.id), defaults.counters.chatMessages),
    },
  }
}

const loadData = async (kv: KVNamespace): Promise<AppData> => {
  const raw = await kv.get('app-data.json')
  if (!raw) {
    const initial = defaultData()
    await kv.put('app-data.json', JSON.stringify(initial))
    return initial
  }

  const merged = mergeAppData(JSON.parse(stripBom(raw)) as Partial<AppData>)
  await kv.put('app-data.json', JSON.stringify(merged))
  return merged
}

const saveData = async (kv: KVNamespace, data: AppData) => {
  await kv.put('app-data.json', JSON.stringify(data))
}

const jsonError = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

const parseAuthorizationToken = (request: Request) => {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7).trim() || null
}

const requireClientAuth = async (c: any, next: () => Promise<void>) => {
  const token = parseAuthorizationToken(c.req.raw)
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const data = await loadData(c.env.APP_DATA)
  const session = data.clientSessions.find((item) => item.token === token)
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const client = data.clients.find((item) => item.id === session.clientId)
  if (!client) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('client', client)
  await next()
}

const requireAgencyAdminAuth = async (c: any, next: () => Promise<void>) => {
  const token = parseAuthorizationToken(c.req.raw)
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const data = await loadData(c.env.APP_DATA)
  const session = data.agencyAdminSessions.find((item) => item.token === token)
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const admin = data.agencyAdmins.find((item) => item.id === session.adminId)
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('agencyAdmin', admin)
  await next()
}

const toSafeClient = (client: ClientRecord) => ({
  id: client.id,
  name: client.name,
  company: client.company ?? '',
  email: client.email,
  profileImageUrl: client.profileImageUrl ?? '',
  createdAt: client.createdAt,
})

const toSafeAgencyAdmin = (admin: AgencyAdminRecord) => ({
  id: admin.id,
  username: admin.username,
  agencyName: admin.agencyName,
  profileImageUrl: admin.profileImageUrl ?? '',
  createdAt: admin.createdAt,
})

const parseBody = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

const csvColumns = [
  'referenceCode',
  'fullName',
  'type',
  'nationality',
  'dateOfBirth',
  'placeOfBirth',
  'height',
  'weight',
  'religion',
  'maritalStatus',
  'numberOfChildren',
  'numberOfSiblings',
  'homeAddress',
  'airportRepatriation',
  'educationLevel',
  'isPublic',
  'hasPhoto',
] as const

const csvEscape = (value: unknown) => {
  const stringValue = String(value ?? '')
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

const parseCsvRow = (line: string) => {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

const parseBoolean = (value: string | undefined, fallback = false) => {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const defaultMaidProfile = {
  status: 'available',
  type: 'New maid',
  nationality: 'Filipino maid',
  dateOfBirth: '',
  placeOfBirth: '',
  height: 150,
  weight: 50,
  religion: 'Catholic',
  maritalStatus: 'Single',
  numberOfChildren: 0,
  numberOfSiblings: 0,
  homeAddress: '',
  airportRepatriation: '',
  educationLevel: 'High School (10-12 yrs)',
  languageSkills: { English: 'Zero' },
  skillsPreferences: {},
  workAreas: {},
  employmentHistory: [],
  introduction: {},
  agencyContact: {},
  photoDataUrl: '',
  photoDataUrls: [],
  videoDataUrl: '',
  isPublic: false,
  hasPhoto: false,
}

const requiredMaidFields: Array<
  keyof typeof defaultMaidProfile | 'fullName' | 'referenceCode'
> = [
  'fullName',
  'referenceCode',
  'type',
  'nationality',
  'dateOfBirth',
  'placeOfBirth',
  'height',
  'weight',
  'religion',
  'maritalStatus',
  'numberOfChildren',
  'numberOfSiblings',
  'homeAddress',
  'airportRepatriation',
  'educationLevel',
  'languageSkills',
  'skillsPreferences',
  'workAreas',
  'employmentHistory',
  'introduction',
  'agencyContact',
]

const validateMaidPayload = (maid: Record<string, unknown>) => {
  const missing = requiredMaidFields.filter((field) => maid[field] === undefined)
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(', ')}`
  }
  if (
    typeof maid.fullName !== 'string' ||
    !maid.fullName.trim() ||
    typeof maid.referenceCode !== 'string' ||
    !maid.referenceCode.trim()
  ) {
    return 'Full name and reference code are required'
  }
  return null
}

const toMaidRecordPayload = (
  maid: Record<string, unknown>
): Omit<MaidRecord, 'id' | 'createdAt' | 'updatedAt'> => {
  const photoDataUrl =
    typeof maid.photoDataUrl === 'string' ? maid.photoDataUrl : ''
  const photoDataUrls = Array.isArray(maid.photoDataUrls)
    ? maid.photoDataUrls.filter((item): item is string => typeof item === 'string')
    : photoDataUrl
      ? [photoDataUrl]
      : []

  return {
    fullName: String(maid.fullName),
    referenceCode: String(maid.referenceCode),
    status: typeof maid.status === 'string' ? maid.status : 'available',
    type: String(maid.type),
    nationality: String(maid.nationality),
    dateOfBirth: String(maid.dateOfBirth),
    placeOfBirth: String(maid.placeOfBirth),
    height: Number(maid.height),
    weight: Number(maid.weight),
    religion: String(maid.religion),
    maritalStatus: String(maid.maritalStatus),
    numberOfChildren: Number(maid.numberOfChildren),
    numberOfSiblings: Number(maid.numberOfSiblings),
    homeAddress: String(maid.homeAddress),
    airportRepatriation: String(maid.airportRepatriation),
    educationLevel: String(maid.educationLevel),
    languageSkills:
      typeof maid.languageSkills === 'object' && maid.languageSkills
        ? (maid.languageSkills as Record<string, string>)
        : {},
    skillsPreferences:
      typeof maid.skillsPreferences === 'object' && maid.skillsPreferences
        ? (maid.skillsPreferences as Record<string, unknown>)
        : {},
    workAreas:
      typeof maid.workAreas === 'object' && maid.workAreas
        ? (maid.workAreas as Record<string, unknown>)
        : {},
    employmentHistory: Array.isArray(maid.employmentHistory)
      ? (maid.employmentHistory as Array<Record<string, unknown>>)
      : [],
    introduction:
      typeof maid.introduction === 'object' && maid.introduction
        ? (maid.introduction as Record<string, unknown>)
        : {},
    agencyContact:
      typeof maid.agencyContact === 'object' && maid.agencyContact
        ? (maid.agencyContact as Record<string, unknown>)
        : {},
    photoDataUrls: photoDataUrls.slice(0, 5),
    photoDataUrl,
    videoDataUrl: typeof maid.videoDataUrl === 'string' ? maid.videoDataUrl : '',
    isPublic: Boolean(maid.isPublic),
    hasPhoto:
      typeof maid.hasPhoto === 'boolean'
        ? maid.hasPhoto
        : photoDataUrls.length > 0 || Boolean(photoDataUrl),
  }
}

const getConversationContext = (url: URL) => {
  const conversationType = url.searchParams.get('type') === 'agency' ? 'agency' : 'support'
  const agencyId =
    conversationType === 'agency' ? Number(url.searchParams.get('agencyId')) : undefined
  const agencyName =
    conversationType === 'agency' ? url.searchParams.get('agencyName') ?? undefined : undefined

  return {
    conversationType,
    agencyId: Number.isInteger(agencyId) ? agencyId : undefined,
    agencyName,
  } as const
}

app.get('/api/health', (c) => c.json({ status: 'Server is running' }))
app.get('/api', (c) => c.json({ message: 'Welcome to Helped Cloudflare API' }))

app.get('/api/company', async (c) => {
  const data = await loadData(c.env.APP_DATA)
  return c.json({
    companyProfile: data.companyProfile,
    momPersonnel: data.momPersonnel,
    testimonials: data.testimonials,
  })
})

app.get('/api/company/summary', async (c) => {
  const data = await loadData(c.env.APP_DATA)
  const publicMaids = data.maids.filter((maid) => maid.isPublic).length
  const hiddenMaids = data.maids.length - publicMaids
  const maidsWithPhotos = data.maids.filter((maid) => maid.hasPhoto).length
  const unreadAgencyChats = data.chatMessages.filter(
    (message) => message.senderRole === 'client' && !message.readByAgency
  ).length

  return c.json({
    publicMaids,
    hiddenMaids,
    totalMaids: data.maids.length,
    maidsWithPhotos,
    enquiries: data.enquiries.length,
    requests: data.directSales.length,
    pendingRequests: data.directSales.filter((item) => item.status === 'pending').length,
    unreadAgencyChats,
    momPersonnel: data.momPersonnel.length,
    testimonials: data.testimonials.length,
    galleryImages: data.companyProfile.gallery_image_data_urls?.length ?? 0,
  })
})

app.put('/api/company', async (c) => {
  const body = await parseBody<Partial<CompanyProfileRecord>>(c.req.raw)
  if (!body) {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const allowedFields: Array<keyof CompanyProfileRecord> = [
    'company_name',
    'short_name',
    'license_no',
    'address_line1',
    'address_line2',
    'postal_code',
    'country',
    'contact_person',
    'contact_phone',
    'contact_email',
    'contact_fax',
    'contact_website',
    'office_hours_regular',
    'office_hours_other',
    'social_facebook',
    'social_whatsapp_number',
    'social_whatsapp_message',
    'branding_theme_color',
    'branding_button_color',
    'about_us',
    'logo_data_url',
    'gallery_image_data_urls',
    'intro_video_data_url',
  ]

  const entries = allowedFields.filter((field) => body[field] !== undefined)
  if (entries.length === 0) {
    return c.json({ error: 'No valid fields provided for update' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  data.companyProfile = {
    ...data.companyProfile,
    ...Object.fromEntries(entries.map((field) => [field, body[field]])),
    updated_at: now(),
  }
  await saveData(c.env.APP_DATA, data)

  return c.json({
    message: 'Company profile updated successfully',
    companyProfile: data.companyProfile,
  })
})

app.post('/api/company/mom-personnel', async (c) => {
  const body = await parseBody<{ name?: string; registration_number?: string }>(c.req.raw)
  if (!body?.name?.trim() || !body.registration_number?.trim()) {
    return c.json({ error: 'Name and registration number are required' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const momPersonnel: MOMPersonnelRecord = {
    id: data.counters.momPersonnel++,
    company_id: 1,
    name: body.name.trim(),
    registration_number: body.registration_number.trim(),
    created_at: now(),
  }
  data.momPersonnel.push(momPersonnel)
  await saveData(c.env.APP_DATA, data)
  return c.json({ message: 'MOM personnel added successfully', momPersonnel }, 201)
})

app.put('/api/company/mom-personnel/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) {
    return c.json({ error: 'Valid id is required' }, 400)
  }

  const body = await parseBody<{ name?: string; registration_number?: string }>(c.req.raw)
  if (!body || (!body.name && !body.registration_number)) {
    return c.json({ error: 'At least one field (name or registration_number) is required' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const index = data.momPersonnel.findIndex((item) => item.id === id)
  if (index === -1) {
    return c.json({ error: 'MOM personnel not found' }, 404)
  }

  data.momPersonnel[index] = {
    ...data.momPersonnel[index],
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.registration_number !== undefined
      ? { registration_number: body.registration_number }
      : {}),
  }
  await saveData(c.env.APP_DATA, data)
  return c.json({
    message: 'MOM personnel updated successfully',
    momPersonnel: data.momPersonnel[index],
  })
})

app.delete('/api/company/mom-personnel/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const data = await loadData(c.env.APP_DATA)
  const existing = data.momPersonnel.find((item) => item.id === id)
  if (!existing) {
    return c.json({ error: 'MOM personnel not found' }, 404)
  }

  data.momPersonnel = data.momPersonnel.filter((item) => item.id !== id)
  await saveData(c.env.APP_DATA, data)
  return c.json({
    message: 'MOM personnel deleted successfully',
    deletedMOMPersonnel: existing,
  })
})

app.post('/api/company/testimonials', async (c) => {
  const body = await parseBody<{ message?: string; author?: string }>(c.req.raw)
  if (!body?.message?.trim() || !body.author?.trim()) {
    return c.json({ error: 'Message and author are required' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const testimonial: TestimonialRecord = {
    id: data.counters.testimonials++,
    company_id: 1,
    message: body.message.trim(),
    author: body.author.trim(),
    created_at: now(),
  }
  data.testimonials.unshift(testimonial)
  await saveData(c.env.APP_DATA, data)
  return c.json({ message: 'Testimonial added successfully', testimonial }, 201)
})

app.delete('/api/company/testimonials/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const data = await loadData(c.env.APP_DATA)
  const existing = data.testimonials.find((item) => item.id === id)
  if (!existing) {
    return c.json({ error: 'Testimonial not found' }, 404)
  }

  data.testimonials = data.testimonials.filter((item) => item.id !== id)
  await saveData(c.env.APP_DATA, data)
  return c.json({
    message: 'Testimonial deleted successfully',
    deletedTestimonial: existing,
  })
})

app.get('/api/maids', async (c) => {
  const search = c.req.query('search')?.trim().toLowerCase()
  const visibility = c.req.query('visibility')
  const data = await loadData(c.env.APP_DATA)

  let maids = [...data.maids]
  if (search) {
    maids = maids.filter(
      (maid) =>
        maid.fullName.toLowerCase().includes(search) ||
        maid.referenceCode.toLowerCase().includes(search)
    )
  }

  if (visibility === 'public' || visibility === 'hidden') {
    const isPublic = visibility === 'public'
    maids = maids.filter((maid) => maid.isPublic === isPublic)
  }

  maids.sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  )

  return c.json({ maids })
})

app.get('/api/maids/export.csv', async (c) => {
  const data = await loadData(c.env.APP_DATA)
  const rows = data.maids.map((maid) =>
    [
      maid.referenceCode,
      maid.fullName,
      maid.type,
      maid.nationality,
      maid.dateOfBirth,
      maid.placeOfBirth,
      maid.height,
      maid.weight,
      maid.religion,
      maid.maritalStatus,
      maid.numberOfChildren,
      maid.numberOfSiblings,
      maid.homeAddress,
      maid.airportRepatriation,
      maid.educationLevel,
      maid.isPublic,
      maid.hasPhoto,
    ]
      .map(csvEscape)
      .join(',')
  )

  return new Response([csvColumns.join(','), ...rows].join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="maids-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
})

app.post('/api/maids/import.csv', async (c) => {
  const body = await parseBody<{ csv?: string }>(c.req.raw)
  if (!body?.csv?.trim()) {
    return c.json({ error: 'CSV content is required' }, 400)
  }

  const lines = body.csv
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return c.json({ error: 'CSV must include header and at least one row' }, 400)
  }

  const headers = parseCsvRow(lines[0])
  const headerSet = new Set(headers)
  if (!headerSet.has('referenceCode') || !headerSet.has('fullName')) {
    return c.json({ error: 'CSV must include referenceCode and fullName columns' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  let created = 0
  let updated = 0
  const errors: string[] = []

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const rowValues = parseCsvRow(lines[lineIndex])
    const rowMap = Object.fromEntries(
      headers.map((header, index) => [header, rowValues[index] ?? ''])
    )
    const referenceCode = String(rowMap.referenceCode ?? '').trim()
    const fullName = String(rowMap.fullName ?? '').trim()

    if (!referenceCode || !fullName) {
      errors.push(`Row ${lineIndex + 1}: referenceCode and fullName are required`)
      continue
    }

    const existingIndex = data.maids.findIndex((maid) => maid.referenceCode === referenceCode)
    const existing = existingIndex === -1 ? null : data.maids[existingIndex]
    const base = existing ?? { ...defaultMaidProfile, fullName, referenceCode }
    const payload = {
      ...base,
      fullName,
      referenceCode,
      type: rowMap.type || base.type,
      nationality: rowMap.nationality || base.nationality,
      dateOfBirth: rowMap.dateOfBirth || base.dateOfBirth,
      placeOfBirth: rowMap.placeOfBirth || base.placeOfBirth,
      height: parseNumber(rowMap.height, base.height),
      weight: parseNumber(rowMap.weight, base.weight),
      religion: rowMap.religion || base.religion,
      maritalStatus: rowMap.maritalStatus || base.maritalStatus,
      numberOfChildren: parseNumber(rowMap.numberOfChildren, base.numberOfChildren),
      numberOfSiblings: parseNumber(rowMap.numberOfSiblings, base.numberOfSiblings),
      homeAddress: rowMap.homeAddress || base.homeAddress,
      airportRepatriation: rowMap.airportRepatriation || base.airportRepatriation,
      educationLevel: rowMap.educationLevel || base.educationLevel,
      languageSkills: base.languageSkills,
      skillsPreferences: base.skillsPreferences,
      workAreas: base.workAreas,
      employmentHistory: base.employmentHistory,
      introduction: base.introduction,
      agencyContact: base.agencyContact,
      photoDataUrl: existing?.photoDataUrl ?? '',
      photoDataUrls: existing?.photoDataUrls ?? [],
      videoDataUrl: existing?.videoDataUrl ?? '',
      isPublic: parseBoolean(String(rowMap.isPublic ?? ''), base.isPublic),
      hasPhoto: parseBoolean(String(rowMap.hasPhoto ?? ''), base.hasPhoto),
      status: existing?.status ?? base.status,
    }

    const recordPayload = toMaidRecordPayload(payload)
    if (existing) {
      data.maids[existingIndex] = {
        ...data.maids[existingIndex],
        ...recordPayload,
        updatedAt: now(),
      }
      updated += 1
    } else {
      data.maids.unshift({
        ...recordPayload,
        id: data.counters.maids++,
        createdAt: now(),
        updatedAt: now(),
      })
      created += 1
    }
  }

  await saveData(c.env.APP_DATA, data)
  return c.json(
    { message: 'CSV import completed', created, updated, failed: errors.length, errors },
    errors.length > 0 ? 207 : 200
  )
})

app.get('/api/maids/:referenceCode', async (c) => {
  const data = await loadData(c.env.APP_DATA)
  const maid = data.maids.find((item) => item.referenceCode === c.req.param('referenceCode'))
  if (!maid) {
    return c.json({ error: 'Maid not found' }, 404)
  }
  return c.json({ maid })
})

app.post('/api/maids', async (c) => {
  const body = await parseBody<Record<string, unknown>>(c.req.raw)
  if (!body) {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const validationError = validateMaidPayload(body)
  if (validationError) {
    return c.json({ error: validationError }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const recordPayload = toMaidRecordPayload(body)
  if (data.maids.some((maid) => maid.referenceCode === recordPayload.referenceCode)) {
    return c.json({ error: 'Reference code already exists' }, 409)
  }

  const maid: MaidRecord = {
    ...recordPayload,
    id: data.counters.maids++,
    createdAt: now(),
    updatedAt: now(),
  }
  data.maids.unshift(maid)
  await saveData(c.env.APP_DATA, data)
  return c.json({ maid }, 201)
})

app.put('/api/maids/:referenceCode', async (c) => {
  const body = await parseBody<Record<string, unknown>>(c.req.raw)
  if (!body) {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const validationError = validateMaidPayload(body)
  if (validationError) {
    return c.json({ error: validationError }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const referenceCode = c.req.param('referenceCode')
  const index = data.maids.findIndex((maid) => maid.referenceCode === referenceCode)
  if (index === -1) {
    return c.json({ error: 'Maid not found' }, 404)
  }

  const payload = toMaidRecordPayload({
    ...data.maids[index],
    ...body,
    status: body.status !== undefined ? body.status : data.maids[index].status,
    photoDataUrl:
      body.photoDataUrl !== undefined ? body.photoDataUrl : data.maids[index].photoDataUrl,
    photoDataUrls: Array.isArray(body.photoDataUrls)
      ? body.photoDataUrls
      : data.maids[index].photoDataUrls,
    videoDataUrl:
      body.videoDataUrl !== undefined ? body.videoDataUrl : data.maids[index].videoDataUrl,
  })

  const duplicate = data.maids.find(
    (maid) =>
      maid.referenceCode === payload.referenceCode && maid.referenceCode !== referenceCode
  )
  if (duplicate) {
    return c.json({ error: 'Reference code already exists' }, 409)
  }

  data.maids[index] = {
    ...data.maids[index],
    ...payload,
    updatedAt: now(),
  }
  await saveData(c.env.APP_DATA, data)
  return c.json({ maid: data.maids[index] })
})

app.patch('/api/maids/:referenceCode/visibility', async (c) => {
  const body = await parseBody<{ isPublic?: boolean }>(c.req.raw)
  if (typeof body?.isPublic !== 'boolean') {
    return c.json({ error: 'isPublic boolean is required' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const index = data.maids.findIndex((maid) => maid.referenceCode === c.req.param('referenceCode'))
  if (index === -1) {
    return c.json({ error: 'Maid not found' }, 404)
  }

  data.maids[index] = {
    ...data.maids[index],
    isPublic: body.isPublic,
    updatedAt: now(),
  }
  await saveData(c.env.APP_DATA, data)
  return c.json({ maid: data.maids[index] })
})

app.patch('/api/maids/:referenceCode/photo', async (c) => {
  const body = await parseBody<{ photoDataUrl?: string }>(c.req.raw)
  if (typeof body?.photoDataUrl !== 'string') {
    return c.json({ error: 'photoDataUrl string is required' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const index = data.maids.findIndex((maid) => maid.referenceCode === c.req.param('referenceCode'))
  if (index === -1) {
    return c.json({ error: 'Maid not found' }, 404)
  }

  data.maids[index] = {
    ...data.maids[index],
    photoDataUrl: body.photoDataUrl,
    photoDataUrls: body.photoDataUrl ? [body.photoDataUrl] : [],
    hasPhoto: Boolean(body.photoDataUrl),
    updatedAt: now(),
  }
  await saveData(c.env.APP_DATA, data)
  return c.json({ maid: data.maids[index] })
})

app.patch('/api/maids/:referenceCode/photos', async (c) => {
  const body = await parseBody<{ photoDataUrl?: string }>(c.req.raw)
  if (typeof body?.photoDataUrl !== 'string' || !body.photoDataUrl.trim()) {
    return c.json({ error: 'photoDataUrl string is required' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const index = data.maids.findIndex((maid) => maid.referenceCode === c.req.param('referenceCode'))
  if (index === -1) {
    return c.json({ error: 'Maid not found' }, 404)
  }

  const photos = Array.isArray(data.maids[index].photoDataUrls)
    ? [...data.maids[index].photoDataUrls]
    : data.maids[index].photoDataUrl
      ? [data.maids[index].photoDataUrl]
      : []

  if (photos.length >= 5) {
    return c.json({ error: 'Maximum 5 photos allowed per maid' }, 400)
  }

  photos.push(body.photoDataUrl)
  data.maids[index] = {
    ...data.maids[index],
    photoDataUrls: photos,
    photoDataUrl: photos[0] ?? '',
    hasPhoto: photos.length > 0,
    updatedAt: now(),
  }
  await saveData(c.env.APP_DATA, data)
  return c.json({ maid: data.maids[index] })
})

app.patch('/api/maids/:referenceCode/video', async (c) => {
  const body = await parseBody<{ videoDataUrl?: string }>(c.req.raw)
  if (typeof body?.videoDataUrl !== 'string') {
    return c.json({ error: 'videoDataUrl string is required' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const index = data.maids.findIndex((maid) => maid.referenceCode === c.req.param('referenceCode'))
  if (index === -1) {
    return c.json({ error: 'Maid not found' }, 404)
  }

  data.maids[index] = {
    ...data.maids[index],
    videoDataUrl: body.videoDataUrl,
    updatedAt: now(),
  }
  await saveData(c.env.APP_DATA, data)
  return c.json({ maid: data.maids[index] })
})

app.delete('/api/maids/:referenceCode', async (c) => {
  const data = await loadData(c.env.APP_DATA)
  const existing = data.maids.find((maid) => maid.referenceCode === c.req.param('referenceCode'))
  if (!existing) {
    return c.json({ error: 'Maid not found' }, 404)
  }

  data.maids = data.maids.filter((maid) => maid.referenceCode !== c.req.param('referenceCode'))
  await saveData(c.env.APP_DATA, data)
  return c.json({ message: 'Maid deleted successfully' })
})

app.get('/api/enquiries', async (c) => {
  const search = c.req.query('search')?.trim().toLowerCase()
  const data = await loadData(c.env.APP_DATA)
  let enquiries = [...data.enquiries]
  if (search) {
    enquiries = enquiries.filter((item) =>
      [item.username, item.email, item.phone, item.message]
        .join(' ')
        .toLowerCase()
        .includes(search)
    )
  }
  enquiries.sort((left, right) => right.id - left.id)
  return c.json({ enquiries })
})

app.post('/api/enquiries', async (c) => {
  const body = await parseBody<{
    username?: string
    date?: string
    email?: string
    phone?: string
    message?: string
  }>(c.req.raw)

  if (!body?.username || !body.email || !body.phone || !body.message) {
    return c.json({ error: 'username, email, phone, and message are required' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const enquiry: EnquiryRecord = {
    id: data.counters.enquiries++,
    username: body.username,
    date: body.date || buildFallbackDate(),
    email: body.email,
    phone: body.phone,
    message: body.message,
    createdAt: now(),
  }
  data.enquiries.unshift(enquiry)
  await saveData(c.env.APP_DATA, data)
  return c.json({ enquiry }, 201)
})

app.delete('/api/enquiries/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const data = await loadData(c.env.APP_DATA)
  const existing = data.enquiries.find((item) => item.id === id)
  if (!existing) {
    return c.json({ error: 'Enquiry not found' }, 404)
  }

  data.enquiries = data.enquiries.filter((item) => item.id !== id)
  await saveData(c.env.APP_DATA, data)
  return c.json({ message: 'Enquiry deleted successfully' })
})

app.post('/api/client-auth/register', async (c) => {
  const body = await parseBody<{
    name?: string
    company?: string
    email?: string
    password?: string
  }>(c.req.raw)

  if (!body?.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
    return c.json({ error: 'name, email, and password are required' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const existing = data.clients.find(
    (client) => client.email.toLowerCase() === body.email!.trim().toLowerCase()
  )
  if (existing) {
    return c.json({ error: 'Client email already exists' }, 409)
  }

  const client: ClientRecord = {
    id: data.counters.clients++,
    name: body.name.trim(),
    company: body.company?.trim() ?? '',
    email: body.email.trim(),
    password: body.password.trim(),
    profileImageUrl: '',
    createdAt: now(),
  }
  const session: ClientSessionRecord = {
    token: crypto.randomUUID(),
    clientId: client.id,
    createdAt: now(),
  }

  data.clients.unshift(client)
  data.clientSessions = data.clientSessions.filter((item) => item.clientId !== client.id)
  data.clientSessions.unshift(session)
  await saveData(c.env.APP_DATA, data)
  return c.json({ token: session.token, client: toSafeClient(client) }, 201)
})

app.post('/api/client-auth/login', async (c) => {
  const body = await parseBody<{ email?: string; password?: string }>(c.req.raw)
  if (!body?.email?.trim() || !body.password?.trim()) {
    return c.json({ error: 'email and password are required' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const client = data.clients.find(
    (item) =>
      item.email.toLowerCase() === body.email!.trim().toLowerCase() &&
      item.password === body.password!.trim()
  )
  if (!client) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const session: ClientSessionRecord = {
    token: crypto.randomUUID(),
    clientId: client.id,
    createdAt: now(),
  }

  data.clientSessions = data.clientSessions.filter((item) => item.clientId !== client.id)
  data.clientSessions.unshift(session)
  await saveData(c.env.APP_DATA, data)
  return c.json({ token: session.token, client: toSafeClient(client) })
})

app.get('/api/client-auth/me', requireClientAuth, async (c) => {
  return c.json({ client: toSafeClient(c.get('client')) })
})

app.put('/api/client-auth/me', requireClientAuth, async (c) => {
  const body = await parseBody<{
    name?: string
    company?: string
    email?: string
    profileImageUrl?: string
  }>(c.req.raw)

  if (!body?.name?.trim() || !body.email?.trim()) {
    return c.json({ error: 'name and email are required' }, 400)
  }

  const currentClient = c.get('client')
  const data = await loadData(c.env.APP_DATA)
  const duplicate = data.clients.find(
    (item) =>
      item.id !== currentClient.id &&
      item.email.toLowerCase() === body.email!.trim().toLowerCase()
  )
  if (duplicate) {
    return c.json({ error: 'Client email already exists' }, 409)
  }

  const index = data.clients.findIndex((item) => item.id === currentClient.id)
  data.clients[index] = {
    ...data.clients[index],
    name: body.name.trim(),
    company: typeof body.company === 'string' ? body.company.trim() : data.clients[index].company,
    email: body.email.trim(),
    profileImageUrl:
      typeof body.profileImageUrl === 'string'
        ? body.profileImageUrl
        : data.clients[index].profileImageUrl,
  }

  data.directSales = data.directSales.map((sale) =>
    sale.clientId === currentClient.id
      ? {
          ...sale,
          clientName: data.clients[index].name,
          clientEmail: data.clients[index].email,
          clientPhone: data.clients[index].company || '',
        }
      : sale
  )

  await saveData(c.env.APP_DATA, data)
  return c.json({ client: toSafeClient(data.clients[index]) })
})

app.post('/api/client-auth/logout', requireClientAuth, async (c) => {
  const token = parseAuthorizationToken(c.req.raw)
  const data = await loadData(c.env.APP_DATA)
  data.clientSessions = data.clientSessions.filter((item) => item.token !== token)
  await saveData(c.env.APP_DATA, data)
  return c.json({ message: 'Logged out successfully' })
})

app.post('/api/agency-auth/register', async (c) => {
  const body = await parseBody<{
    username?: string
    password?: string
    agencyName?: string
  }>(c.req.raw)

  if (!body?.username?.trim() || !body.password?.trim() || !body.agencyName?.trim()) {
    return c.json({ error: 'username, password, and agencyName are required' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const existing = data.agencyAdmins.find(
    (admin) => admin.username.toLowerCase() === body.username!.trim().toLowerCase()
  )
  if (existing) {
    return c.json({ error: 'Agency admin username already exists' }, 409)
  }

  const admin: AgencyAdminRecord = {
    id: data.counters.agencyAdmins++,
    username: body.username.trim(),
    password: body.password.trim(),
    agencyName: body.agencyName.trim(),
    createdAt: now(),
  }
  const session: AgencyAdminSessionRecord = {
    token: crypto.randomUUID(),
    adminId: admin.id,
    createdAt: now(),
  }

  data.agencyAdmins.unshift(admin)
  data.agencyAdminSessions = data.agencyAdminSessions.filter((item) => item.adminId !== admin.id)
  data.agencyAdminSessions.unshift(session)
  await saveData(c.env.APP_DATA, data)
  return c.json({ token: session.token, admin: toSafeAgencyAdmin(admin) }, 201)
})

app.post('/api/agency-auth/login', async (c) => {
  const body = await parseBody<{ username?: string; password?: string }>(c.req.raw)
  if (!body?.username?.trim() || !body.password?.trim()) {
    return c.json({ error: 'username and password are required' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const admin = data.agencyAdmins.find(
    (item) =>
      item.username.toLowerCase() === body.username!.trim().toLowerCase() &&
      item.password === body.password!.trim()
  )
  if (!admin) {
    return c.json({ error: 'Invalid username or password' }, 401)
  }

  const session: AgencyAdminSessionRecord = {
    token: crypto.randomUUID(),
    adminId: admin.id,
    createdAt: now(),
  }

  data.agencyAdminSessions = data.agencyAdminSessions.filter((item) => item.adminId !== admin.id)
  data.agencyAdminSessions.unshift(session)
  await saveData(c.env.APP_DATA, data)
  return c.json({ token: session.token, admin: toSafeAgencyAdmin(admin) })
})

app.get('/api/agency-auth/me', requireAgencyAdminAuth, async (c) => {
  return c.json({ admin: toSafeAgencyAdmin(c.get('agencyAdmin')) })
})

app.post('/api/agency-auth/logout', requireAgencyAdminAuth, async (c) => {
  const token = parseAuthorizationToken(c.req.raw)
  const data = await loadData(c.env.APP_DATA)
  data.agencyAdminSessions = data.agencyAdminSessions.filter((item) => item.token !== token)
  await saveData(c.env.APP_DATA, data)
  return c.json({ message: 'Logged out successfully' })
})

app.get('/api/client/my-maids', requireClientAuth, async (c) => {
  const client = c.get('client')
  const data = await loadData(c.env.APP_DATA)
  const assignments = data.directSales
    .filter((sale) => sale.clientId === client.id)
    .map((sale) => ({
      directSale: sale,
      maid: data.maids.find((maid) => maid.referenceCode === sale.maidReferenceCode) ?? null,
    }))
    .filter((item): item is { directSale: DirectSaleRecord; maid: MaidRecord } => Boolean(item.maid))

  return c.json({ assignments })
})

app.get('/api/client/history', requireClientAuth, async (c) => {
  const client = c.get('client')
  const data = await loadData(c.env.APP_DATA)
  const history = data.directSales
    .filter((sale) => sale.clientId === client.id)
    .map((sale) => ({
      directSale: sale,
      maid: data.maids.find((maid) => maid.referenceCode === sale.maidReferenceCode) ?? null,
    }))
    .sort(
      (left, right) =>
        new Date(right.directSale.createdAt).getTime() -
        new Date(left.directSale.createdAt).getTime()
    )

  return c.json({ history })
})

app.patch('/api/client/direct-sales/:id/:action', requireClientAuth, async (c) => {
  const id = Number(c.req.param('id'))
  const action = c.req.param('action')
  if (!Number.isInteger(id)) {
    return c.json({ error: 'Valid direct sale id is required' }, 400)
  }
  if (!['interested', 'direct-hire', 'reject'].includes(action)) {
    return c.json({ error: 'Invalid action' }, 400)
  }

  const status =
    action === 'direct-hire' ? 'direct_hire' : action === 'reject' ? 'rejected' : 'interested'
  const client = c.get('client')
  const data = await loadData(c.env.APP_DATA)
  const saleIndex = data.directSales.findIndex(
    (sale) => sale.id === id && sale.clientId === client.id
  )
  if (saleIndex === -1) {
    return c.json({ error: 'Assigned direct sale not found for this client' }, 404)
  }

  data.directSales[saleIndex] = {
    ...data.directSales[saleIndex],
    status,
  }
  const maidIndex = data.maids.findIndex(
    (maid) => maid.referenceCode === data.directSales[saleIndex].maidReferenceCode
  )
  const maid =
    maidIndex === -1
      ? null
      : (data.maids[maidIndex] = {
          ...data.maids[maidIndex],
          status:
            status === 'interested'
              ? 'interested'
              : status === 'direct_hire'
                ? 'reserved'
                : 'rejected',
          updatedAt: now(),
        })

  await saveData(c.env.APP_DATA, data)
  return c.json({
    directSale: data.directSales[saleIndex],
    maid,
  })
})

app.get('/api/direct-sales', async (c) => {
  const data = await loadData(c.env.APP_DATA)
  const directSales = [...data.directSales].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )
  return c.json({ directSales })
})

app.get('/api/direct-sales/clients', async (c) => {
  const data = await loadData(c.env.APP_DATA)
  const clients = [...data.clients]
    .sort((left, right) => right.id - left.id)
    .map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.company || 'N/A',
      enquiryDate: client.createdAt,
    }))

  return c.json({ clients })
})

app.post('/api/direct-sales', async (c) => {
  const body = await parseBody<{
    referenceCode?: string
    clientId?: number
    status?: string
    formData?: Record<string, string>
  }>(c.req.raw)

  if (!body?.referenceCode?.trim()) {
    return c.json({ error: 'referenceCode is required' }, 400)
  }
  if (!Number.isInteger(body.clientId)) {
    return c.json({ error: 'clientId is required' }, 400)
  }

  const request = new Request(
    new URL(`/api/direct-sales/${encodeURIComponent(body.referenceCode.trim())}`, c.req.url),
    {
      method: 'POST',
      headers: c.req.raw.headers,
      body: JSON.stringify({
        clientId: body.clientId,
        status: body.status,
        formData: body.formData,
      }),
    }
  )
  return app.fetch(request, c.env)
})

app.post('/api/direct-sales/:referenceCode', async (c) => {
  const body = await parseBody<{
    clientId?: number
    status?: string
    formData?: Record<string, string>
  }>(c.req.raw)
  if (!body) {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  if (!Number.isInteger(body.clientId)) {
    return c.json({ error: 'clientId is required' }, 400)
  }

  const referenceCode = c.req.param('referenceCode').trim()
  if (!referenceCode) {
    return c.json({ error: 'referenceCode is required' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const maidIndex = data.maids.findIndex((maid) => maid.referenceCode === referenceCode)
  if (maidIndex === -1) {
    return c.json({ error: 'Maid not found' }, 404)
  }

  const client = data.clients.find((item) => item.id === Number(body.clientId))
  if (!client) {
    return c.json({ error: 'Client not found' }, 404)
  }

  const normalizedStatus =
    body.status === 'interested'
      ? 'interested'
      : body.status === 'direct_hire'
        ? 'direct_hire'
        : body.status === 'rejected'
          ? 'rejected'
          : 'pending'

  const directSale: DirectSaleRecord = {
    id: data.counters.directSales++,
    maidReferenceCode: referenceCode,
    maidName: data.maids[maidIndex].fullName,
    clientId: client.id,
    clientName: client.name,
    clientEmail: client.email,
    clientPhone: client.company || '',
    status: normalizedStatus,
    requestDetails: body.formData,
    createdAt: now(),
  }

  data.directSales.unshift(directSale)
  data.maids[maidIndex] = {
    ...data.maids[maidIndex],
    status:
      normalizedStatus === 'interested'
        ? 'interested'
        : normalizedStatus === 'direct_hire'
          ? 'reserved'
          : normalizedStatus === 'rejected'
            ? 'rejected'
            : 'sent',
    updatedAt: now(),
  }
  await saveData(c.env.APP_DATA, data)
  return c.json({ directSale, maid: data.maids[maidIndex] }, 201)
})

app.patch('/api/direct-sales/:id/interested', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) {
    return c.json({ error: 'Valid direct sale id is required' }, 400)
  }
  const data = await loadData(c.env.APP_DATA)
  const saleIndex = data.directSales.findIndex((sale) => sale.id === id)
  if (saleIndex === -1) {
    return c.json({ error: 'Direct sale not found' }, 404)
  }
  data.directSales[saleIndex].status = 'interested'
  const maidIndex = data.maids.findIndex(
    (maid) => maid.referenceCode === data.directSales[saleIndex].maidReferenceCode
  )
  const maid =
    maidIndex === -1
      ? null
      : (data.maids[maidIndex] = {
          ...data.maids[maidIndex],
          status: 'interested',
          updatedAt: now(),
        })
  await saveData(c.env.APP_DATA, data)
  return c.json({ directSale: data.directSales[saleIndex], maid })
})

app.patch('/api/direct-sales/:id/direct-hire', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) {
    return c.json({ error: 'Valid direct sale id is required' }, 400)
  }
  const data = await loadData(c.env.APP_DATA)
  const saleIndex = data.directSales.findIndex((sale) => sale.id === id)
  if (saleIndex === -1) {
    return c.json({ error: 'Direct sale not found' }, 404)
  }
  data.directSales[saleIndex].status = 'direct_hire'
  const maidIndex = data.maids.findIndex(
    (maid) => maid.referenceCode === data.directSales[saleIndex].maidReferenceCode
  )
  const maid =
    maidIndex === -1
      ? null
      : (data.maids[maidIndex] = {
          ...data.maids[maidIndex],
          status: 'reserved',
          updatedAt: now(),
        })
  await saveData(c.env.APP_DATA, data)
  return c.json({ directSale: data.directSales[saleIndex], maid })
})

app.patch('/api/direct-sales/:id/reject', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) {
    return c.json({ error: 'Valid direct sale id is required' }, 400)
  }
  const data = await loadData(c.env.APP_DATA)
  const saleIndex = data.directSales.findIndex((sale) => sale.id === id)
  if (saleIndex === -1) {
    return c.json({ error: 'Direct sale not found' }, 404)
  }
  data.directSales[saleIndex].status = 'rejected'
  const maidIndex = data.maids.findIndex(
    (maid) => maid.referenceCode === data.directSales[saleIndex].maidReferenceCode
  )
  const maid =
    maidIndex === -1
      ? null
      : (data.maids[maidIndex] = {
          ...data.maids[maidIndex],
          status: 'rejected',
          updatedAt: now(),
        })
  await saveData(c.env.APP_DATA, data)
  return c.json({ directSale: data.directSales[saleIndex], maid })
})

app.get('/api/chats/client/conversations', requireClientAuth, async (c) => {
  const client = c.get('client')
  const data = await loadData(c.env.APP_DATA)
  const conversations = new Map<
    string,
    {
      key: string
      clientId: number
      conversationType: 'support' | 'agency'
      title: string
      description: string
      lastMessage: string
      lastMessageAt: string
      unreadCount: number
      agencyId?: number
      agencyName?: string
    }
  >()

  data.chatMessages
    .filter((message) => message.clientId === client.id)
    .forEach((message) => {
      const key = `${message.conversationType}:${message.agencyId ?? 0}`
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
      const existing = conversations.get(key)

      if (!existing) {
        conversations.set(key, {
          key,
          clientId: client.id,
          conversationType: message.conversationType,
          title,
          description,
          lastMessage: message.message,
          lastMessageAt: message.createdAt,
          unreadCount: unreadIncrement,
          agencyId: message.agencyId,
          agencyName: message.agencyName || '',
        })
        return
      }

      existing.unreadCount += unreadIncrement
      if (new Date(message.createdAt).getTime() >= new Date(existing.lastMessageAt).getTime()) {
        existing.lastMessage = message.message
        existing.lastMessageAt = message.createdAt
      }
    })

  if (!conversations.has('support:0')) {
    conversations.set('support:0', {
      key: 'support:0',
      clientId: client.id,
      conversationType: 'support',
      title: 'Agency Support',
      description: 'General help, follow-up, and request support',
      lastMessage: '',
      lastMessageAt: client.createdAt,
      unreadCount: 0,
    })
  }

  return c.json({
    conversations: Array.from(conversations.values()).sort(
      (left, right) =>
        new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime()
    ),
  })
})

app.get('/api/chats/client', requireClientAuth, async (c) => {
  const client = c.get('client')
  const { conversationType, agencyId } = getConversationContext(new URL(c.req.url))
  const data = await loadData(c.env.APP_DATA)
  const messages = data.chatMessages
    .filter(
      (message) =>
        message.clientId === client.id &&
        message.conversationType === conversationType &&
        (conversationType === 'support' || message.agencyId === agencyId)
    )
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    )

  data.chatMessages = data.chatMessages.map((message) =>
    message.clientId === client.id &&
    message.senderRole === 'agency' &&
    message.conversationType === conversationType &&
    (conversationType === 'support' || message.agencyId === agencyId)
      ? { ...message, readByClient: true }
      : message
  )
  await saveData(c.env.APP_DATA, data)
  return c.json({ client: toSafeClient(client), messages })
})

app.post('/api/chats/client', requireClientAuth, async (c) => {
  const body = await parseBody<{ message?: string }>(c.req.raw)
  if (!body?.message?.trim()) {
    return c.json({ error: 'message is required' }, 400)
  }

  const client = c.get('client')
  const { conversationType, agencyId, agencyName } = getConversationContext(new URL(c.req.url))
  const data = await loadData(c.env.APP_DATA)
  const message: ChatMessageRecord = {
    id: data.counters.chatMessages++,
    clientId: client.id,
    conversationType,
    agencyId,
    agencyName: agencyName ?? '',
    senderRole: 'client',
    senderName: client.name,
    message: body.message.trim(),
    createdAt: now(),
    readByAgency: false,
    readByClient: true,
  }
  data.chatMessages.push(message)
  await saveData(c.env.APP_DATA, data)
  return c.json({ message }, 201)
})

app.get('/api/chats/admin', requireAgencyAdminAuth, async (c) => {
  const data = await loadData(c.env.APP_DATA)
  const conversations = new Map<string, any>()

  data.chatMessages.forEach((message) => {
    const client = data.clients.find((item) => item.id === message.clientId)
    if (!client) return
    const key = `${message.clientId}:${message.conversationType}:${message.agencyId ?? 0}`
    const unreadIncrement =
      message.senderRole === 'client' && !message.readByAgency ? 1 : 0
    const existing = conversations.get(key)
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
    if (new Date(message.createdAt).getTime() >= new Date(existing.lastMessageAt).getTime()) {
      existing.lastMessage = message.message
      existing.lastMessageAt = message.createdAt
    }
  })

  return c.json({
    conversations: Array.from(conversations.values()).sort(
      (left: any, right: any) =>
        new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime()
    ),
  })
})

app.get('/api/chats/admin/:clientId', requireAgencyAdminAuth, async (c) => {
  const clientId = Number(c.req.param('clientId'))
  if (!Number.isInteger(clientId)) {
    return c.json({ error: 'Valid client id is required' }, 400)
  }

  const { conversationType, agencyId } = getConversationContext(new URL(c.req.url))
  const data = await loadData(c.env.APP_DATA)
  const messages = data.chatMessages
    .filter(
      (message) =>
        message.clientId === clientId &&
        message.conversationType === conversationType &&
        (conversationType === 'support' || message.agencyId === agencyId)
    )
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    )

  data.chatMessages = data.chatMessages.map((message) =>
    message.clientId === clientId &&
    message.senderRole === 'client' &&
    message.conversationType === conversationType &&
    (conversationType === 'support' || message.agencyId === agencyId)
      ? { ...message, readByAgency: true }
      : message
  )
  await saveData(c.env.APP_DATA, data)
  return c.json({ messages })
})

app.post('/api/chats/admin/:clientId', requireAgencyAdminAuth, async (c) => {
  const clientId = Number(c.req.param('clientId'))
  if (!Number.isInteger(clientId)) {
    return c.json({ error: 'Valid client id is required' }, 400)
  }

  const body = await parseBody<{ message?: string }>(c.req.raw)
  if (!body?.message?.trim()) {
    return c.json({ error: 'message is required' }, 400)
  }

  const data = await loadData(c.env.APP_DATA)
  const client = data.clients.find((item) => item.id === clientId)
  if (!client) {
    return c.json({ error: 'Client not found' }, 404)
  }

  const admin = c.get('agencyAdmin')
  const { conversationType, agencyId, agencyName } = getConversationContext(new URL(c.req.url))
  const message: ChatMessageRecord = {
    id: data.counters.chatMessages++,
    clientId,
    conversationType,
    agencyId,
    agencyName: agencyName ?? admin.agencyName,
    senderRole: 'agency',
    senderName:
      conversationType === 'agency'
        ? `${agencyName ?? admin.agencyName} Team`
        : `${admin.agencyName} Support`,
    message: body.message.trim(),
    createdAt: now(),
    readByAgency: true,
    readByClient: false,
  }
  data.chatMessages.push(message)
  await saveData(c.env.APP_DATA, data)
  return c.json({ message }, 201)
})

app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404))

export default {
  async fetch(request: Request, env: Bindings, executionContext: ExecutionContext) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      try {
        return await app.fetch(request, env, executionContext)
      } catch (error) {
        console.error('Unhandled worker error', error)
        return jsonError('Something went wrong!', 500)
      }
    }

    const assetResponse = await env.ASSETS.fetch(request)
    if (assetResponse.status !== 404) {
      return assetResponse
    }

    const spaRequest = new Request(new URL('/index.html', url).toString(), request)
    return env.ASSETS.fetch(spaRequest)
  },
}
