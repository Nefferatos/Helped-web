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
  supabaseUserId?: string
  name: string
  company?: string
  email: string
  password: string
  phone?: string
  emailVerified?: boolean
  emailVerificationCodeHash?: string
  emailVerificationExpiresAt?: string
  emailVerificationSentAt?: string
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
  supabaseUserId?: string
  username: string
  email?: string
  password: string
  passwordHash?: string
  agencyName: string
  emailVerified?: boolean
  emailVerificationCodeHash?: string
  emailVerificationExpiresAt?: string
  emailVerificationSentAt?: string
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
  APP_DATA?: KVNamespace
  ASSETS: AssetsBinding
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  SUPABASE_APP_DATA_TABLE?: string
  SUPABASE_APP_DATA_ID?: string
  RESEND_API_KEY?: string
  RESEND_FROM?: string
  DEV_EXPOSE_CONFIRMATION_CODE?: string
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
  const clients = (raw.clients ?? defaults.clients).map((client) => ({
    ...client,
    supabaseUserId: client.supabaseUserId || undefined,
    name: client.name ?? '',
    company: client.company ?? '',
    phone: client.phone ?? '',
    email: client.email ?? '',
    profileImageUrl: client.profileImageUrl ?? '',
    createdAt: client.createdAt ?? now(),
    // Back-compat: treat pre-existing clients as verified.
    emailVerified: typeof client.emailVerified === 'boolean' ? client.emailVerified : true,
  }))
  let agencyAdmins = (raw.agencyAdmins ?? defaults.agencyAdmins).map((admin) => ({
    ...admin,
    supabaseUserId: admin.supabaseUserId || undefined,
    email: admin.email ?? '',
    password: typeof admin.password === 'string' ? admin.password : '',
    passwordHash: typeof admin.passwordHash === 'string' ? admin.passwordHash : '',
    profileImageUrl: admin.profileImageUrl ?? '',
    createdAt: admin.createdAt ?? now(),
    // Back-compat: treat pre-existing admins as verified (or no-email).
    emailVerified: typeof admin.emailVerified === 'boolean' ? admin.emailVerified : true,
  }))
  const hasMainAgency = agencyAdmins.some((admin) => admin.username === 'attheagency')
  if (!hasMainAgency) {
    agencyAdmins = agencyAdmins.map((admin) =>
      admin.username === 'admin' && admin.password === 'admin123'
        ? { ...admin, username: 'attheagency', password: '@atagency2026' }
        : admin
    )
  }
  agencyAdmins = agencyAdmins.map((admin) =>
    admin.username === 'attheagency'
      ? { ...admin, password: '@atagency2026' }
      : admin
  )
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

const loadDataFromKv = async (kv: KVNamespace): Promise<AppData> => {
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

const saveDataToKv = async (kv: KVNamespace, data: AppData) => {
  await kv.put('app-data.json', JSON.stringify(data))
}

type SupabaseAppDataConfig = {
  baseUrl: string
  serviceRoleKey: string
  table: string
  rowId: string
}

const decodeSupabaseJwtClaims = (jwt: string) => {
  const parts = jwt.split('.')
  if (parts.length < 2) return null
  try {
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
    const json = JSON.parse(atob(payload)) as Record<string, unknown>
    return json
  } catch {
    return null
  }
}

const logSupabaseConfigDebug = (env: Bindings) => {
  if (env.DEV_EXPOSE_CONFIRMATION_CODE !== 'true') return

  const url = env.SUPABASE_URL?.trim() ?? ''
  const anon = env.SUPABASE_ANON_KEY?.trim() ?? ''
  const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''

  const anonClaims = anon ? decodeSupabaseJwtClaims(anon) : null
  const serviceClaims = service ? decodeSupabaseJwtClaims(service) : null

  console.log('Supabase config debug', {
    supabaseUrl: url || null,
    anonKey: anonClaims
      ? {
          ref: anonClaims.ref ?? null,
          role: anonClaims.role ?? null,
          iss: anonClaims.iss ?? null,
        }
      : anon
        ? { type: 'non-jwt', length: anon.length }
        : null,
    serviceRoleKey: serviceClaims
      ? {
          ref: serviceClaims.ref ?? null,
          role: serviceClaims.role ?? null,
          iss: serviceClaims.iss ?? null,
        }
      : service
        ? { type: 'non-jwt', length: service.length }
        : null,
  })
}

const getSupabaseAppDataConfig = (env: Bindings): SupabaseAppDataConfig | null => {
  const baseUrl = env.SUPABASE_URL?.trim().replace(/\/$/, '')
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!baseUrl || !serviceRoleKey) return null

  logSupabaseConfigDebug(env)

  return {
    baseUrl,
    serviceRoleKey,
    table: env.SUPABASE_APP_DATA_TABLE?.trim() || 'app_data',
    rowId: env.SUPABASE_APP_DATA_ID?.trim() || 'default',
  }
}

const supabaseHeaders = (config: SupabaseAppDataConfig, extra?: HeadersInit): HeadersInit => ({
  apikey: config.serviceRoleKey,
  authorization: `Bearer ${config.serviceRoleKey}`,
  ...extra,
})

const readSupabaseError = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      return JSON.stringify(await response.json())
    } catch {
      return await response.text()
    }
  }
  return await response.text()
}

const loadDataFromSupabase = async (config: SupabaseAppDataConfig): Promise<AppData> => {
  const table = encodeURIComponent(config.table)
  const rowId = encodeURIComponent(config.rowId)
  const url = `${config.baseUrl}/rest/v1/${table}?id=eq.${rowId}&select=data&limit=1`

  const response = await fetch(url, {
    method: 'GET',
    headers: supabaseHeaders(config, { accept: 'application/json' }),
  })

  if (!response.ok) {
    const details = await readSupabaseError(response)
    throw new Error(`Supabase read failed (${response.status}): ${details}`)
  }

  const rows = (await response.json()) as Array<{ data?: Partial<AppData> }>
  const raw = rows[0]?.data
  if (!raw) {
    const initial = defaultData()
    await saveDataToSupabase(config, initial)
    return initial
  }

  const merged = mergeAppData(raw)
  if (JSON.stringify(raw) !== JSON.stringify(merged)) {
    await saveDataToSupabase(config, merged)
  }
  return merged
}

const saveDataToSupabase = async (config: SupabaseAppDataConfig, data: AppData) => {
  const table = encodeURIComponent(config.table)
  const url = `${config.baseUrl}/rest/v1/${table}?on_conflict=id`
  const payload = [
    {
      id: config.rowId,
      data,
      updated_at: now(),
    },
  ]

  const response = await fetch(url, {
    method: 'POST',
    headers: supabaseHeaders(config, {
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const details = await readSupabaseError(response)
    throw new Error(`Supabase write failed (${response.status}): ${details}`)
  }
}

const loadData = async (env: Bindings): Promise<AppData> => {
  const supabase = getSupabaseAppDataConfig(env)
  if (supabase) {
    return await loadDataFromSupabase(supabase)
  }

  if (!env.APP_DATA) {
    throw new Error(
      'No storage configured: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or bind APP_DATA KV.'
    )
  }

  return await loadDataFromKv(env.APP_DATA)
}

const saveData = async (env: Bindings, data: AppData) => {
  const supabase = getSupabaseAppDataConfig(env)
  if (supabase) {
    await saveDataToSupabase(supabase, data)
    return
  }

  if (!env.APP_DATA) {
    throw new Error(
      'No storage configured: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or bind APP_DATA KV.'
    )
  }

  await saveDataToKv(env.APP_DATA, data)
}

const jsonError = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

const requireSupabaseConfig = (env: Bindings) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return jsonError('Missing Supabase config', 500)
  }
  return null
}

const safeApi =
  (handler: (c: any) => Promise<Response> | Response) => async (c: any) => {
    try {
      return await handler(c)
    } catch (error) {
      console.error('API handler error', c.req.method, c.req.path, error)
      const message =
        error instanceof Error ? error.message : 'Internal Server Error'
      return jsonError(message, 500)
    }
  }

app.onError((error, c) => {
  console.error('Unhandled API error', c.req.method, c.req.path, error)
  const message = error instanceof Error ? error.message : 'Internal Server Error'
  return jsonError(message, 500)
})

const parseAuthorizationToken = (request: Request) => {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7).trim() || null
}

const requireClientAuth = async (c: any, next: () => Promise<void>) => {
  console.log('requireClientAuth: storage mode', getStorageMode(c.env));

  const token = parseAuthorizationToken(c.req.raw)
  if (!token) {
    console.log('requireClientAuth: no token')
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const data = await loadData(c.env)
    console.log('requireClientAuth: data loaded')
    const session = data.clientSessions.find((item) => item.token === token)
    if (session) {
      const client = data.clients.find((item) => item.id === session.clientId)
      if (!client) {
        console.log('requireClientAuth: session client not found')
        return c.json({ error: 'Unauthorized' }, 401)
      }
      c.set('client', client)
      await next()
      return
    }

    // Supabase Auth JWT support (Google/Facebook/Phone).
    console.log('requireClientAuth: trying Supabase')
    const supabaseUser = await getSupabaseAuthUser(c.env, token)
    if (!supabaseUser) {
      console.log('requireClientAuth: Supabase auth failed')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const normalizedEmail = supabaseUser.email ? normalizeEmail(supabaseUser.email) : ''
    const client =
      data.clients.find((item) => item.supabaseUserId && item.supabaseUserId === supabaseUser.id) ??
      (normalizedEmail
        ? data.clients.find((item) => normalizeEmail(item.email) === normalizedEmail)
        : null) ??
      (supabaseUser.phone
        ? data.clients.find((item) => (item.phone ?? '').trim() === supabaseUser.phone!.trim())
        : null)

    if (client) {
      if (!client.supabaseUserId) {
        client.supabaseUserId = supabaseUser.id
        await saveData(c.env, data)
      }
      c.set('client', client)
      await next()
      return
    }

    // First-time Supabase login: create an app client record.
    console.log('requireClientAuth: creating new client')
    const nameFromMeta =
      (supabaseUser.user_metadata?.full_name as string | undefined) ??
      (supabaseUser.user_metadata?.name as string | undefined) ??
      ''
    const created: ClientRecord = {
      id: data.counters.clients++,
      supabaseUserId: supabaseUser.id,
      name: nameFromMeta || (supabaseUser.email ? supabaseUser.email.split('@')[0] : 'Client'),
      company: '',
      phone: supabaseUser.phone ?? '',
      email: supabaseUser.email ?? '',
      password: '',
      profileImageUrl: '',
      createdAt: now(),
      emailVerified: true,
    }

    data.clients.unshift(created)
    await saveData(c.env, data)
    c.set('client', created)
    await next()
  } catch (error) {
    console.error('requireClientAuth error:', error)
    return c.json({ error: 'Unauthorized' }, 401)
  }
}

const requireAgencyAdminAuth = async (c: any, next: () => Promise<void>) => {
  const token = parseAuthorizationToken(c.req.raw)
  if (!token) {
    console.log('requireAgencyAdminAuth: no token')
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const data = await loadData(c.env)
    console.log('requireAgencyAdminAuth: data loaded')
    const session = data.agencyAdminSessions.find((item) => item.token === token)
    if (session) {
      const admin = data.agencyAdmins.find((item) => item.id === session.adminId)
      if (!admin) {
        console.log('requireAgencyAdminAuth: session admin not found')
        return c.json({ error: 'Unauthorized' }, 401)
      }
      c.set('agencyAdmin', admin)
      await next()
      return
    }

    // Supabase Auth JWT support (optional).
    // Security: we only allow JWT auth for agency admins that already exist in app data.
    console.log('requireAgencyAdminAuth: trying Supabase')
    const supabaseUser = await getSupabaseAuthUser(c.env, token)
    if (!supabaseUser) {
      console.log('requireAgencyAdminAuth: Supabase auth failed')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const normalizedEmail = supabaseUser.email ? normalizeEmail(supabaseUser.email) : ''
    const admin =
      data.agencyAdmins.find(
        (item) => item.supabaseUserId && item.supabaseUserId === supabaseUser.id
      ) ??
      (normalizedEmail
        ? data.agencyAdmins.find(
            (item) => normalizeEmail(item.email ?? '') === normalizedEmail
          )
        : null)

    if (!admin) {
      console.log('requireAgencyAdminAuth: admin not found')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    if (!admin.supabaseUserId) {
      admin.supabaseUserId = supabaseUser.id
      await saveData(c.env, data)
    }

    c.set('agencyAdmin', admin)
    await next()
  } catch (error) {
    console.error('requireAgencyAdminAuth error:', error)
    return c.json({ error: 'Unauthorized' }, 401)
  }
}

const toSafeClient = (client: ClientRecord) => ({
  id: client.id,
  name: client.name,
  company: client.company ?? '',
  phone: client.phone ?? '',
  email: client.email,
  emailVerified: Boolean(client.emailVerified),
  profileImageUrl: client.profileImageUrl ?? '',
  createdAt: client.createdAt,
})

const toSafeAgencyAdmin = (admin: AgencyAdminRecord) => ({
  id: admin.id,
  username: admin.username,
  email: admin.email ?? '',
  emailVerified: Boolean(admin.emailVerified),
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const sseEncoder = new TextEncoder()

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const isEmailLike = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

const generateSixDigitCode = () => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return String(buf[0] % 1000000).padStart(6, '0')
}

const sha256Hex = async (value: string) => {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const shouldExposeDevConfirmationCode = (env: Bindings) =>
  env.DEV_EXPOSE_CONFIRMATION_CODE?.trim().toLowerCase() === 'true'

const sendEmailViaResend = async (env: Bindings, to: string, subject: string, text: string) => {
  const apiKey = env.RESEND_API_KEY?.trim()
  const from = env.RESEND_FROM?.trim()
  if (!apiKey || !from) {
    return { ok: false as const, error: 'RESEND_NOT_CONFIGURED' as const }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error('Resend email failed', response.status, body)
    return { ok: false as const, error: 'RESEND_FAILED' as const }
  }

  return { ok: true as const }
}

const sendConfirmationCodeEmail = async (
  env: Bindings,
  params: { to: string; code: string; purpose: 'client' | 'agency' }
) => {
  const subject =
    params.purpose === 'client' ? 'Confirm your client account' : 'Confirm your agency admin account'
  const text =
    params.purpose === 'client'
      ? `Your Helped client verification code is: ${params.code}\n\nThis code expires in 15 minutes.`
      : `Your Helped agency admin verification code is: ${params.code}\n\nThis code expires in 15 minutes.`

  return await sendEmailViaResend(env, params.to, subject, text)
}

type SupabaseAuthUser = {
  id: string
  email?: string
  phone?: string
  user_metadata?: Record<string, unknown>
}

const supabaseUserCache = new Map<
  string,
  { user: SupabaseAuthUser; expiresAt: number }
>()

const getSupabaseAuthUser = async (env: Bindings, accessToken: string) => {
  console.log('getSupabaseAuthUser: token length', accessToken.length);

  const cached = supabaseUserCache.get(accessToken)
  if (cached && cached.expiresAt > Date.now()) return cached.user

  const baseUrl = env.SUPABASE_URL?.trim().replace(/\/$/, '')
  const anonKey = env.SUPABASE_ANON_KEY?.trim()
  if (!baseUrl || !anonKey) {
    console.error('Supabase auth verify skipped: missing SUPABASE_URL or SUPABASE_ANON_KEY')
    return null
  }

  try {
    const response = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${accessToken}`,
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      let details = ''
      try {
        details = await response.text()
      } catch {
        // ignore
      }
      console.error('Supabase auth verify failed', {
        status: response.status,
        baseUrl,
        details: details.slice(0, 300),
      })
      return null
    }

    const user = (await response.json()) as SupabaseAuthUser
    // Cache for 5 minutes to reduce Supabase Auth calls.
    supabaseUserCache.set(accessToken, { user, expiresAt: Date.now() + 5 * 60 * 1000 })
    return user
  } catch (error) {
    console.error('getSupabaseAuthUser fetch error:', error)
    return null
  }
}

const createSseResponse = (
  request: Request,
  handler: (controller: ReadableStreamDefaultController<Uint8Array>) => Promise<void>
) => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const abortListener = () => controller.close()
      request.signal.addEventListener('abort', abortListener, { once: true })
      handler(controller)
        .catch((error) => {
          console.error('SSE stream error', error)
        })
        .finally(() => {
          request.signal.removeEventListener('abort', abortListener)
          try {
            controller.close()
          } catch {
            // ignore
          }
        })
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  })
}

const writeSseEvent = (
  controller: ReadableStreamDefaultController<Uint8Array>,
  eventName: string,
  payload: unknown
) => {
  controller.enqueue(
    sseEncoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`)
  )
}

const writeSseComment = (
  controller: ReadableStreamDefaultController<Uint8Array>,
  comment: string
) => {
  controller.enqueue(sseEncoder.encode(`: ${comment}\n\n`))
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

const toBase64Utf8 = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
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

const normalizeReferenceCode = (value: unknown) => String(value ?? '').trim()

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
    fullName: String(maid.fullName).trim(),
    referenceCode: normalizeReferenceCode(maid.referenceCode),
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

const ensureMaidPresent = async (
  env: Bindings,
  referenceCode: string,
  fallback: Omit<MaidRecord, 'id' | 'createdAt' | 'updatedAt'>
) => {
  const ref = normalizeReferenceCode(referenceCode)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const latest = await loadData(env)
    const exists = latest.maids.find((item) => item.referenceCode === ref)
    if (exists) {
      return exists
    }

    // Concurrency safety: if a concurrent write overwrote our change, re-apply it.
    latest.maids = latest.maids.filter((item) => item.referenceCode !== ref)
    latest.maids.unshift({
      ...fallback,
      referenceCode: ref,
      id: latest.counters.maids++,
      createdAt: now(),
      updatedAt: now(),
    })
    await saveData(env, latest)
    await sleep(40 * (attempt + 1))
  }

  return null
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

const getStorageMode = (env: Bindings) => {
  const hasSupabase = Boolean(getSupabaseAppDataConfig(env))
  if (hasSupabase) return 'supabase'
  if (env.APP_DATA) return 'kv'
  return 'none'
}

app.get('/api/health', (c) =>
  c.json({ status: 'Server is running', storage: getStorageMode(c.env) })
)

app.get('/api/diagnostics', (c) => {
  const config = getSupabaseAppDataConfig(c.env)
  return c.json({
    storage: getStorageMode(c.env),
    supabase: {
      enabled: Boolean(config),
      urlHost: config ? new URL(config.baseUrl).host : null,
      table: config?.table ?? null,
      rowId: config?.rowId ?? null,
      hasServiceRoleKey: Boolean(c.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    },
    kv: {
      enabled: Boolean(c.env.APP_DATA),
    },
  })
})
app.get('/api', (c) => c.json({ message: 'Welcome to Helped Cloudflare API' }))

app.get('/api/company', safeApi(async (c) => {
  const data = await loadData(c.env)
  return c.json({
    companyProfile: data.companyProfile,
    momPersonnel: data.momPersonnel,
    testimonials: data.testimonials,
  })
}))

app.get('/api/company/summary', safeApi(async (c) => {
  const data = await loadData(c.env)
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
}))

app.put('/api/company', safeApi(async (c) => {
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

  const data = await loadData(c.env)
  data.companyProfile = {
    ...data.companyProfile,
    ...Object.fromEntries(entries.map((field) => [field, body[field]])),
    updated_at: now(),
  }
  await saveData(c.env, data)

  return c.json({
    message: 'Company profile updated successfully',
    companyProfile: data.companyProfile,
  })
}))

app.post('/api/company/mom-personnel', safeApi(async (c) => {
  const body = await parseBody<{ name?: string; registration_number?: string }>(c.req.raw)
  if (!body?.name?.trim() || !body.registration_number?.trim()) {
    return c.json({ error: 'Name and registration number are required' }, 400)
  }

  const data = await loadData(c.env)
  const momPersonnel: MOMPersonnelRecord = {
    id: data.counters.momPersonnel++,
    company_id: 1,
    name: body.name.trim(),
    registration_number: body.registration_number.trim(),
    created_at: now(),
  }
  data.momPersonnel.push(momPersonnel)
  await saveData(c.env, data)
  return c.json({ message: 'MOM personnel added successfully', momPersonnel }, 201)
}))

app.put('/api/company/mom-personnel/:id', safeApi(async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) {
    return c.json({ error: 'Valid id is required' }, 400)
  }

  const body = await parseBody<{ name?: string; registration_number?: string }>(c.req.raw)
  if (!body || (!body.name && !body.registration_number)) {
    return c.json({ error: 'At least one field (name or registration_number) is required' }, 400)
  }

  const data = await loadData(c.env)
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
  await saveData(c.env, data)
  return c.json({
    message: 'MOM personnel updated successfully',
    momPersonnel: data.momPersonnel[index],
  })
}))

app.delete('/api/company/mom-personnel/:id', safeApi(async (c) => {
  const id = Number(c.req.param('id'))
  const data = await loadData(c.env)
  const existing = data.momPersonnel.find((item) => item.id === id)
  if (!existing) {
    return c.json({ error: 'MOM personnel not found' }, 404)
  }

  data.momPersonnel = data.momPersonnel.filter((item) => item.id !== id)
  await saveData(c.env, data)
  return c.json({
    message: 'MOM personnel deleted successfully',
    deletedMOMPersonnel: existing,
  })
}))

app.post('/api/company/testimonials', safeApi(async (c) => {
  const body = await parseBody<{ message?: string; author?: string }>(c.req.raw)
  if (!body?.message?.trim() || !body.author?.trim()) {
    return c.json({ error: 'Message and author are required' }, 400)
  }

  const data = await loadData(c.env)
  const testimonial: TestimonialRecord = {
    id: data.counters.testimonials++,
    company_id: 1,
    message: body.message.trim(),
    author: body.author.trim(),
    created_at: now(),
  }
  data.testimonials.unshift(testimonial)
  await saveData(c.env, data)
  return c.json({ message: 'Testimonial added successfully', testimonial }, 201)
}))

app.delete('/api/company/testimonials/:id', safeApi(async (c) => {
  const id = Number(c.req.param('id'))
  const data = await loadData(c.env)
  const existing = data.testimonials.find((item) => item.id === id)
  if (!existing) {
    return c.json({ error: 'Testimonial not found' }, 404)
  }

  data.testimonials = data.testimonials.filter((item) => item.id !== id)
  await saveData(c.env, data)
  return c.json({
    message: 'Testimonial deleted successfully',
    deletedTestimonial: existing,
  })
}))

app.get('/api/maids', safeApi(async (c) => {
  const search = c.req.query('search')?.trim().toLowerCase()
  const visibility = c.req.query('visibility')
  const data = await loadData(c.env)

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
}))

app.get('/api/maids/export.csv', safeApi(async (c) => {
  const data = await loadData(c.env)
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
}))

app.get('/api/maids/export.xls', safeApi(async (c) => {
  const data = await loadData(c.env)
  const rows = data.maids.map((maid) =>
    [
      maid.referenceCode,
      maid.fullName,
      maid.type,
      maid.nationality,
      maid.dateOfBirth,
      maid.placeOfBirth,
      String(maid.height),
      String(maid.weight),
      maid.religion,
      maid.maritalStatus,
      String(maid.numberOfChildren),
      String(maid.numberOfSiblings),
      maid.homeAddress,
      maid.airportRepatriation,
      maid.educationLevel,
      String(Boolean(maid.isPublic)),
      String(Boolean(maid.hasPhoto)),
    ].map((value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    )
  )

  const csvHeader = csvColumns.join(',')
  const csvRows = data.maids.map((maid) =>
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
  const csv = [csvHeader, ...csvRows].join('\n')
  const csvBase64 = toBase64Utf8(csv)
  const fileDate = new Date().toISOString().slice(0, 10)

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Maids Export</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; margin: 18px; }
      h1 { font-size: 18px; margin: 0 0 10px; }
      table { width: 100%; border-collapse: collapse; }
      thead th { background: #f3f4f6; font-weight: 700; }
      th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; vertical-align: top; }
      tbody tr:nth-child(even) { background: #fafafa; }
      .meta { color: #6b7280; font-size: 12px; margin-bottom: 12px; }
    </style>
  </head>
  <body>
    <!--MAIDS_CSV_BASE64:${csvBase64}-->
    <h1>Maids Export</h1>
    <div class="meta">Generated: ${fileDate}</div>
    <table>
      <thead>
        <tr>${csvColumns.map((col) => `<th>${col}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  </body>
</html>`

  return new Response(html, {
    headers: {
      'content-type': 'application/vnd.ms-excel; charset=utf-8',
      'content-disposition': `attachment; filename="maids-${fileDate}.xls"`,
    },
  })
}))

app.post('/api/maids/import.csv', safeApi(async (c) => {
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

  const data = await loadData(c.env)
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

  await saveData(c.env, data)
  return c.json(
    { message: 'CSV import completed', created, updated, failed: errors.length, errors },
    errors.length > 0 ? 207 : 200
  )
}))

app.get('/api/maids/:referenceCode', safeApi(async (c) => {
  const data = await loadData(c.env)
  const maid = data.maids.find(
    (item) => item.referenceCode === normalizeReferenceCode(c.req.param('referenceCode'))
  )
  if (!maid) {
    return c.json({ error: 'Maid not found' }, 404)
  }
  return c.json({ maid })
}))

app.post('/api/maids', safeApi(async (c) => {
  const body = await parseBody<Record<string, unknown>>(c.req.raw)
  if (!body) {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const validationError = validateMaidPayload(body)
  if (validationError) {
    return c.json({ error: validationError }, 400)
  }

  const data = await loadData(c.env)
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
  await saveData(c.env, data)

  // Reliability: verify record exists after save (guards against rare concurrent blob overwrites).
  const ensured = await ensureMaidPresent(c.env, maid.referenceCode, recordPayload)
  return c.json({ maid: ensured ?? maid }, 201)
}))

app.put('/api/maids/:referenceCode', safeApi(async (c) => {
  const body = await parseBody<Record<string, unknown>>(c.req.raw)
  if (!body) {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const validationError = validateMaidPayload(body)
  if (validationError) {
    return c.json({ error: validationError }, 400)
  }

  const data = await loadData(c.env)
  const referenceCode = normalizeReferenceCode(c.req.param('referenceCode'))
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
  await saveData(c.env, data)
  const ensured = await ensureMaidPresent(c.env, referenceCode, payload)
  return c.json({ maid: ensured ?? data.maids[index] })
}))

app.patch('/api/maids/:referenceCode/visibility', safeApi(async (c) => {
  const body = await parseBody<{ isPublic?: boolean }>(c.req.raw)
  if (typeof body?.isPublic !== 'boolean') {
    return c.json({ error: 'isPublic boolean is required' }, 400)
  }

  const data = await loadData(c.env)
  const index = data.maids.findIndex(
    (maid) => maid.referenceCode === normalizeReferenceCode(c.req.param('referenceCode'))
  )
  if (index === -1) {
    return c.json({ error: 'Maid not found' }, 404)
  }

  data.maids[index] = {
    ...data.maids[index],
    isPublic: body.isPublic,
    updatedAt: now(),
  }
  await saveData(c.env, data)
  return c.json({ maid: data.maids[index] })
}))

app.patch('/api/maids/:referenceCode/photo', safeApi(async (c) => {
  const body = await parseBody<{ photoDataUrl?: string }>(c.req.raw)
  if (typeof body?.photoDataUrl !== 'string') {
    return c.json({ error: 'photoDataUrl string is required' }, 400)
  }

  const data = await loadData(c.env)
  const index = data.maids.findIndex(
    (maid) => maid.referenceCode === normalizeReferenceCode(c.req.param('referenceCode'))
  )
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
  await saveData(c.env, data)
  return c.json({ maid: data.maids[index] })
}))

app.patch('/api/maids/:referenceCode/photos', safeApi(async (c) => {
  const body = await parseBody<{ photoDataUrl?: string }>(c.req.raw)
  if (typeof body?.photoDataUrl !== 'string' || !body.photoDataUrl.trim()) {
    return c.json({ error: 'photoDataUrl string is required' }, 400)
  }

  const data = await loadData(c.env)
  const index = data.maids.findIndex(
    (maid) => maid.referenceCode === normalizeReferenceCode(c.req.param('referenceCode'))
  )
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
  await saveData(c.env, data)
  return c.json({ maid: data.maids[index] })
}))

app.patch('/api/maids/:referenceCode/video', safeApi(async (c) => {
  const body = await parseBody<{ videoDataUrl?: string }>(c.req.raw)
  if (typeof body?.videoDataUrl !== 'string') {
    return c.json({ error: 'videoDataUrl string is required' }, 400)
  }

  const data = await loadData(c.env)
  const index = data.maids.findIndex(
    (maid) => maid.referenceCode === normalizeReferenceCode(c.req.param('referenceCode'))
  )
  if (index === -1) {
    return c.json({ error: 'Maid not found' }, 404)
  }

  data.maids[index] = {
    ...data.maids[index],
    videoDataUrl: body.videoDataUrl,
    updatedAt: now(),
  }
  await saveData(c.env, data)
  return c.json({ maid: data.maids[index] })
}))

app.delete('/api/maids/:referenceCode', safeApi(async (c) => {
  const data = await loadData(c.env)
  const referenceCode = normalizeReferenceCode(c.req.param('referenceCode'))
  const existing = data.maids.find((maid) => maid.referenceCode === referenceCode)
  if (!existing) {
    return c.json({ error: 'Maid not found' }, 404)
  }

  data.maids = data.maids.filter((maid) => maid.referenceCode !== referenceCode)
  await saveData(c.env, data)
  return c.json({ message: 'Maid deleted successfully' })
}))

app.get('/api/enquiries', async (c) => {
  const search = c.req.query('search')?.trim().toLowerCase()
  const data = await loadData(c.env)
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

app.get('/api/enquiries/last-id', async (c) => {
  const data = await loadData(c.env)
  const lastId = data.enquiries.reduce((maxId, enquiry) => Math.max(maxId, enquiry.id), 0)
  return c.json({ lastId })
})

app.get('/api/enquiries/stream', async (c) => {
  const url = new URL(c.req.url)
  const afterId = Number(url.searchParams.get('afterId') ?? 0)
  if (!Number.isFinite(afterId) || afterId < 0) {
    return c.json({ error: 'afterId must be a non-negative number' }, 400)
  }

  const startedAt = Date.now()
  return createSseResponse(c.req.raw, async (controller) => {
    let lastId = afterId
    let lastHeartbeat = Date.now()
    writeSseEvent(controller, 'ready', { ok: true })

    while (!c.req.raw.signal.aborted && Date.now() - startedAt < 60_000) {
      const data = await loadData(c.env)
      const nextEnquiries = data.enquiries
        .filter((enquiry) => enquiry.id > lastId)
        .sort((left, right) => left.id - right.id)

      for (const enquiry of nextEnquiries) {
        writeSseEvent(controller, 'enquiry', { enquiry })
        lastId = Math.max(lastId, enquiry.id)
      }

      const nowTime = Date.now()
      if (nowTime - lastHeartbeat > 15_000) {
        writeSseComment(controller, 'keep-alive')
        lastHeartbeat = nowTime
      }

      await sleep(1200)
    }
  })
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

  const data = await loadData(c.env)
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
  await saveData(c.env, data)
  return c.json({ enquiry }, 201)
})

app.delete('/api/enquiries/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const data = await loadData(c.env)
  const existing = data.enquiries.find((item) => item.id === id)
  if (!existing) {
    return c.json({ error: 'Enquiry not found' }, 404)
  }

  data.enquiries = data.enquiries.filter((item) => item.id !== id)
  await saveData(c.env, data)
  return c.json({ message: 'Enquiry deleted successfully' })
})

app.post('/api/client-auth/register', async (c) => {
  const body = await parseBody<{
    name?: string
    company?: string
    phone?: string
    email?: string
    password?: string
  }>(c.req.raw)

  if (!body?.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
    return c.json({ error: 'name, email, and password are required' }, 400)
  }

  const data = await loadData(c.env)
  const email = body.email.trim()
  const normalizedEmail = normalizeEmail(email)
  const existing = data.clients.find((client) => normalizeEmail(client.email) === normalizedEmail)
  if (existing) {
    if (existing.emailVerified !== false) {
      return c.json({ error: 'Client email already exists' }, 409)
    }

    const code = generateSixDigitCode()
    existing.emailVerificationCodeHash = await sha256Hex(`${normalizedEmail}:${code}`)
    existing.emailVerificationSentAt = now()
    existing.emailVerificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const emailResult = await sendConfirmationCodeEmail(c.env, { to: email, code, purpose: 'client' })
    await saveData(c.env, data)

    return c.json(
      {
        requiresConfirmation: true,
        email: existing.email,
        delivery: emailResult.ok ? 'sent' : 'not_configured',
        devConfirmationCode: shouldExposeDevConfirmationCode(c.env) ? code : undefined,
      },
      202
    )
  }

  const code = generateSixDigitCode()
  const client: ClientRecord = {
    id: data.counters.clients++,
    name: body.name.trim(),
    company: body.company?.trim() ?? '',
    phone: body.phone?.trim() ?? '',
    email,
    password: body.password.trim(),
    profileImageUrl: '',
    createdAt: now(),
    emailVerified: false,
    emailVerificationCodeHash: await sha256Hex(`${normalizedEmail}:${code}`),
    emailVerificationSentAt: now(),
    emailVerificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  }

  data.clients.unshift(client)
  const emailResult = await sendConfirmationCodeEmail(c.env, { to: email, code, purpose: 'client' })
  await saveData(c.env, data)
  return c.json(
    {
      requiresConfirmation: true,
      email: client.email,
      delivery: emailResult.ok ? 'sent' : 'not_configured',
      devConfirmationCode: shouldExposeDevConfirmationCode(c.env) ? code : undefined,
    },
    202
  )
})

app.post('/api/client-auth/confirm', async (c) => {
  const body = await parseBody<{ email?: string; code?: string }>(c.req.raw)
  if (!body?.email?.trim() || !body.code?.trim()) {
    return c.json({ error: 'email and code are required' }, 400)
  }

  const email = body.email.trim()
  const normalizedEmail = normalizeEmail(email)
  const code = body.code.trim()

  const data = await loadData(c.env)
  const client = data.clients.find((item) => normalizeEmail(item.email) === normalizedEmail)
  if (!client) {
    return c.json({ error: 'Client not found' }, 404)
  }

  if (client.emailVerified !== false) {
    // Already verified: issue a session.
    const session: ClientSessionRecord = {
      token: crypto.randomUUID(),
      clientId: client.id,
      createdAt: now(),
    }
    data.clientSessions = data.clientSessions.filter((item) => item.clientId !== client.id)
    data.clientSessions.unshift(session)
    await saveData(c.env, data)
    return c.json({ token: session.token, client: toSafeClient(client) }, 200)
  }

  if (!client.emailVerificationCodeHash || !client.emailVerificationExpiresAt) {
    return c.json({ error: 'No confirmation code requested yet' }, 400)
  }

  if (Date.now() > new Date(client.emailVerificationExpiresAt).getTime()) {
    return c.json({ error: 'Confirmation code expired' }, 400)
  }

  const expected = await sha256Hex(`${normalizedEmail}:${code}`)
  if (expected !== client.emailVerificationCodeHash) {
    return c.json({ error: 'Invalid confirmation code' }, 400)
  }

  client.emailVerified = true
  client.emailVerificationCodeHash = undefined
  client.emailVerificationExpiresAt = undefined
  client.emailVerificationSentAt = undefined

  const session: ClientSessionRecord = {
    token: crypto.randomUUID(),
    clientId: client.id,
    createdAt: now(),
  }
  data.clientSessions = data.clientSessions.filter((item) => item.clientId !== client.id)
  data.clientSessions.unshift(session)
  await saveData(c.env, data)
  return c.json({ token: session.token, client: toSafeClient(client) }, 200)
})

app.post('/api/client-auth/resend', async (c) => {
  const body = await parseBody<{ email?: string }>(c.req.raw)
  if (!body?.email?.trim()) {
    return c.json({ error: 'email is required' }, 400)
  }

  const email = body.email.trim()
  const normalizedEmail = normalizeEmail(email)
  const data = await loadData(c.env)
  const client = data.clients.find((item) => normalizeEmail(item.email) === normalizedEmail)
  if (!client) {
    return c.json({ error: 'Client not found' }, 404)
  }
  if (client.emailVerified !== false) {
    return c.json({ error: 'Client already verified' }, 400)
  }

  const code = generateSixDigitCode()
  client.emailVerificationCodeHash = await sha256Hex(`${normalizedEmail}:${code}`)
  client.emailVerificationSentAt = now()
  client.emailVerificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  const emailResult = await sendConfirmationCodeEmail(c.env, { to: email, code, purpose: 'client' })
  await saveData(c.env, data)
  return c.json({
    requiresConfirmation: true,
    email: client.email,
    delivery: emailResult.ok ? 'sent' : 'not_configured',
    devConfirmationCode: shouldExposeDevConfirmationCode(c.env) ? code : undefined,
  })
})

app.post('/api/client-auth/login', async (c) => {
  const body = await parseBody<{ email?: string; password?: string }>(c.req.raw)
  if (!body?.email?.trim() || !body.password?.trim()) {
    return c.json({ error: 'email and password are required' }, 400)
  }

  const data = await loadData(c.env)
  const normalizedEmail = normalizeEmail(body.email)
  const client = data.clients.find(
    (item) =>
      normalizeEmail(item.email) === normalizedEmail &&
      item.password === body.password!.trim()
  )
  if (!client) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  if (client.emailVerified === false) {
    return c.json(
      {
        error: 'EMAIL_NOT_VERIFIED',
        requiresConfirmation: true,
        email: client.email,
      },
      403
    )
  }

  const session: ClientSessionRecord = {
    token: crypto.randomUUID(),
    clientId: client.id,
    createdAt: now(),
  }

  data.clientSessions = data.clientSessions.filter((item) => item.clientId !== client.id)
  data.clientSessions.unshift(session)
  await saveData(c.env, data)
  return c.json({ token: session.token, client: toSafeClient(client) })
})

app.get('/api/client-auth/me', requireClientAuth, async (c) => {
  return c.json({ client: toSafeClient(c.get('client')) })
})

app.put('/api/client-auth/me', requireClientAuth, async (c) => {
  const body = await parseBody<{
    name?: string
    company?: string
    phone?: string
    email?: string
    profileImageUrl?: string
  }>(c.req.raw)

  if (!body?.name?.trim() || !body.email?.trim()) {
    return c.json({ error: 'name and email are required' }, 400)
  }

  const currentClient = c.get('client')
  const data = await loadData(c.env)
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
    phone: typeof body.phone === 'string' ? body.phone.trim() : (data.clients[index].phone ?? ''),
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
          clientPhone: data.clients[index].phone || '',
        }
      : sale
  )

  await saveData(c.env, data)
  return c.json({ client: toSafeClient(data.clients[index]) })
})

app.post('/api/client-auth/logout', requireClientAuth, async (c) => {
  const token = parseAuthorizationToken(c.req.raw)
  const data = await loadData(c.env)
  data.clientSessions = data.clientSessions.filter((item) => item.token !== token)
  await saveData(c.env, data)
  return c.json({ message: 'Logged out successfully' })
})

app.post('/api/agency-auth/register', async (c) => {
  const body = await parseBody<{
    username?: string
    email?: string
    password?: string
    agencyName?: string
  }>(c.req.raw)

  if (!body?.username?.trim() || !body.password?.trim() || !body.agencyName?.trim()) {
    return c.json({ error: 'username, password, and agencyName are required' }, 400)
  }

  const emailFromBody = body.email?.trim() ?? ''
  const fallbackEmail = isEmailLike(body.username) ? body.username.trim() : ''
  const email = emailFromBody || fallbackEmail
  if (!email) {
    return c.json({ error: 'email is required for agency signup' }, 400)
  }

  const data = await loadData(c.env)
  const normalizedEmail = normalizeEmail(email)
  const normalizedUsername = body.username.trim().toLowerCase()

  const existingByUsername = data.agencyAdmins.find(
    (admin) => admin.username.toLowerCase() === normalizedUsername
  )
  const existingByEmail = data.agencyAdmins.find(
    (admin) => normalizeEmail(admin.email ?? '') === normalizedEmail
  )

  const existing = existingByUsername ?? existingByEmail
  if (existing) {
    if (existing.emailVerified !== false) {
      return c.json({ error: 'Agency admin already exists' }, 409)
    }

    const code = generateSixDigitCode()
    existing.email = email
    existing.emailVerificationCodeHash = await sha256Hex(`${normalizedEmail}:${code}`)
    existing.emailVerificationSentAt = now()
    existing.emailVerificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const emailResult = await sendConfirmationCodeEmail(c.env, { to: email, code, purpose: 'agency' })
    await saveData(c.env, data)
    return c.json(
      {
        requiresConfirmation: true,
        email,
        delivery: emailResult.ok ? 'sent' : 'not_configured',
        devConfirmationCode: shouldExposeDevConfirmationCode(c.env) ? code : undefined,
      },
      202
    )
  }

  const code = generateSixDigitCode()
  const admin: AgencyAdminRecord = {
    id: data.counters.agencyAdmins++,
    username: body.username.trim(),
    email,
    password: body.password.trim(),
    agencyName: body.agencyName.trim(),
    createdAt: now(),
    emailVerified: false,
    emailVerificationCodeHash: await sha256Hex(`${normalizedEmail}:${code}`),
    emailVerificationSentAt: now(),
    emailVerificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  }

  data.agencyAdmins.unshift(admin)
  const emailResult = await sendConfirmationCodeEmail(c.env, { to: email, code, purpose: 'agency' })
  await saveData(c.env, data)
  return c.json(
    {
      requiresConfirmation: true,
      email,
      delivery: emailResult.ok ? 'sent' : 'not_configured',
      devConfirmationCode: shouldExposeDevConfirmationCode(c.env) ? code : undefined,
    },
    202
  )
})

app.post('/api/agency-auth/confirm', async (c) => {
  const body = await parseBody<{ email?: string; code?: string }>(c.req.raw)
  if (!body?.email?.trim() || !body.code?.trim()) {
    return c.json({ error: 'email and code are required' }, 400)
  }

  const email = body.email.trim()
  const normalizedEmail = normalizeEmail(email)
  const code = body.code.trim()

  const data = await loadData(c.env)
  const admin = data.agencyAdmins.find((item) => normalizeEmail(item.email ?? '') === normalizedEmail)
  if (!admin) {
    return c.json({ error: 'Agency admin not found' }, 404)
  }

  if (admin.emailVerified !== false) {
    const session: AgencyAdminSessionRecord = {
      token: crypto.randomUUID(),
      adminId: admin.id,
      createdAt: now(),
    }
      data.agencyAdminSessions.unshift(session)
    await saveData(c.env, data)
    return c.json({ token: session.token, admin: toSafeAgencyAdmin(admin) }, 200)
  }

  if (!admin.emailVerificationCodeHash || !admin.emailVerificationExpiresAt) {
    return c.json({ error: 'No confirmation code requested yet' }, 400)
  }

  if (Date.now() > new Date(admin.emailVerificationExpiresAt).getTime()) {
    return c.json({ error: 'Confirmation code expired' }, 400)
  }

  const expected = await sha256Hex(`${normalizedEmail}:${code}`)
  if (expected !== admin.emailVerificationCodeHash) {
    return c.json({ error: 'Invalid confirmation code' }, 400)
  }

  admin.emailVerified = true
  admin.emailVerificationCodeHash = undefined
  admin.emailVerificationExpiresAt = undefined
  admin.emailVerificationSentAt = undefined

  const session: AgencyAdminSessionRecord = {
    token: crypto.randomUUID(),
    adminId: admin.id,
    createdAt: now(),
  }
    data.agencyAdminSessions.unshift(session)
  await saveData(c.env, data)
  return c.json({ token: session.token, admin: toSafeAgencyAdmin(admin) }, 200)
})

app.post('/api/agency-auth/resend', async (c) => {
  const body = await parseBody<{ email?: string }>(c.req.raw)
  if (!body?.email?.trim()) {
    return c.json({ error: 'email is required' }, 400)
  }

  const email = body.email.trim()
  const normalizedEmail = normalizeEmail(email)
  const data = await loadData(c.env)
  const admin = data.agencyAdmins.find((item) => normalizeEmail(item.email ?? '') === normalizedEmail)
  if (!admin) {
    return c.json({ error: 'Agency admin not found' }, 404)
  }
  if (admin.emailVerified !== false) {
    return c.json({ error: 'Agency admin already verified' }, 400)
  }

  const code = generateSixDigitCode()
  admin.emailVerificationCodeHash = await sha256Hex(`${normalizedEmail}:${code}`)
  admin.emailVerificationSentAt = now()
  admin.emailVerificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  const emailResult = await sendConfirmationCodeEmail(c.env, { to: email, code, purpose: 'agency' })
  await saveData(c.env, data)
  return c.json({
    requiresConfirmation: true,
    email,
    delivery: emailResult.ok ? 'sent' : 'not_configured',
    devConfirmationCode: shouldExposeDevConfirmationCode(c.env) ? code : undefined,
  })
})

app.post('/api/agency-auth/login', safeApi(async (c) => {
  console.log('/api/agency-auth/login called')
  const body = await parseBody<{ username?: string; password?: string }>(c.req.raw)
  if (!body) {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  if (!body?.username?.trim() || !body.password?.trim()) {
    return c.json({ error: 'username and password are required' }, 400)
  }

  let data
  try {
    data = await loadData(c.env)
  } catch (error) {
    console.error('/api/agency-auth/login loadData error:', error)
    return c.json({ error: 'Storage unavailable' }, 500)
  }
  console.log('/api/agency-auth/login data loaded')
  const usernameOrEmail = body.username.trim()
  const normalizedIdentifier = usernameOrEmail.toLowerCase()
  const normalizedEmail = isEmailLike(usernameOrEmail) ? normalizeEmail(usernameOrEmail) : ''
  const password = body.password.trim()

  const admin = data.agencyAdmins.find((item) => {
    const username = typeof item.username === 'string' ? item.username.trim().toLowerCase() : ''
    const email = typeof item.email === 'string' ? normalizeEmail(item.email) : ''
    const matchesIdentifier =
      username === normalizedIdentifier || (normalizedEmail && email === normalizedEmail)
    return matchesIdentifier && item.password === password
  })
  if (!admin) {
    return c.json({ error: 'Invalid username or password' }, 401)
  }

  if (admin.email && admin.emailVerified === false) {
    return c.json(
      {
        error: 'EMAIL_NOT_VERIFIED',
        requiresConfirmation: true,
        email: admin.email,
      },
      403
    )
  }

  const session: AgencyAdminSessionRecord = {
    token: crypto.randomUUID(),
    adminId: admin.id,
    createdAt: now(),
  }

  data.agencyAdminSessions.unshift(session)
  await saveData(c.env, data)
  console.log('/api/agency-auth/login success')
  return c.json({ token: session.token, admin: toSafeAgencyAdmin(admin) })
}))

app.get('/api/agency-auth/me', requireAgencyAdminAuth, async (c) => {
  return c.json({ admin: toSafeAgencyAdmin(c.get('agencyAdmin')) })
})

app.post('/api/agency-auth/logout', requireAgencyAdminAuth, async (c) => {
  const token = parseAuthorizationToken(c.req.raw)
  const data = await loadData(c.env)
  data.agencyAdminSessions = data.agencyAdminSessions.filter((item) => item.token !== token)
  await saveData(c.env, data)
  return c.json({ message: 'Logged out successfully' })
})

app.get('/api/client/my-maids', requireClientAuth, async (c) => {
  const client = c.get('client')
  const data = await loadData(c.env)
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
  const data = await loadData(c.env)
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
  const data = await loadData(c.env)
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

  await saveData(c.env, data)
  return c.json({
    directSale: data.directSales[saleIndex],
    maid,
  })
})

app.get('/api/direct-sales', async (c) => {
  const data = await loadData(c.env)
  const directSales = [...data.directSales].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )
  return c.json({ directSales })
})

app.get('/api/direct-sales/clients', async (c) => {
  const data = await loadData(c.env)
  const clients = [...data.clients]
    .sort((left, right) => right.id - left.id)
    .map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      company: client.company || '',
      phone: client.phone || '',
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

  const data = await loadData(c.env)
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
    clientPhone: client.phone || '',
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
  await saveData(c.env, data)
  return c.json({ directSale, maid: data.maids[maidIndex] }, 201)
})

app.patch('/api/direct-sales/:id/interested', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) {
    return c.json({ error: 'Valid direct sale id is required' }, 400)
  }
  const data = await loadData(c.env)
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
  await saveData(c.env, data)
  return c.json({ directSale: data.directSales[saleIndex], maid })
})

app.patch('/api/direct-sales/:id/direct-hire', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) {
    return c.json({ error: 'Valid direct sale id is required' }, 400)
  }
  const data = await loadData(c.env)
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
  await saveData(c.env, data)
  return c.json({ directSale: data.directSales[saleIndex], maid })
})

app.patch('/api/direct-sales/:id/reject', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) {
    return c.json({ error: 'Valid direct sale id is required' }, 400)
  }
  const data = await loadData(c.env)
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
  await saveData(c.env, data)
  return c.json({ directSale: data.directSales[saleIndex], maid })
})

app.get('/api/chats/client/conversations', requireClientAuth, async (c) => {
  const client = c.get('client')
  const data = await loadData(c.env)
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
  const data = await loadData(c.env)
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
  await saveData(c.env, data)
  return c.json({ client: toSafeClient(client), messages })
})

app.post('/api/chats/client', requireClientAuth, async (c) => {
  const body = await parseBody<{ message?: string }>(c.req.raw)
  if (!body?.message?.trim()) {
    return c.json({ error: 'message is required' }, 400)
  }

  const client = c.get('client')
  const { conversationType, agencyId, agencyName } = getConversationContext(new URL(c.req.url))
  const data = await loadData(c.env)
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
  await saveData(c.env, data)
  return c.json({ message }, 201)
})

app.get('/api/chats/admin', requireAgencyAdminAuth, async (c) => {
  const data = await loadData(c.env)
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
  const data = await loadData(c.env)
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
  await saveData(c.env, data)
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

  const data = await loadData(c.env)
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
  await saveData(c.env, data)
  return c.json({ message }, 201)
})

app.get('/api/chats/client/stream', requireClientAuth, async (c) => {
  const client = c.get('client')
  const url = new URL(c.req.url)
  const afterId = Number(url.searchParams.get('afterId') ?? 0)
  if (!Number.isFinite(afterId) || afterId < 0) {
    return c.json({ error: 'afterId must be a non-negative number' }, 400)
  }

  const streamAll = url.searchParams.get('all') === '1'
  const { conversationType, agencyId } = getConversationContext(url)
  const startedAt = Date.now()

  return createSseResponse(c.req.raw, async (controller) => {
    let lastId = afterId
    let lastHeartbeat = Date.now()
    writeSseEvent(controller, 'ready', { ok: true })

    while (!c.req.raw.signal.aborted && Date.now() - startedAt < 60_000) {
      const data = await loadData(c.env)
      const nextMessages = data.chatMessages
        .filter(
          (message) =>
            message.clientId === client.id &&
            message.id > lastId &&
            (streamAll
              ? true
              : message.conversationType === conversationType &&
                (conversationType === 'support' || message.agencyId === agencyId))
        )
        .sort((left, right) => left.id - right.id)

      for (const message of nextMessages) {
        writeSseEvent(controller, 'message', { message })
        lastId = Math.max(lastId, message.id)
      }

      const nowTime = Date.now()
      if (nowTime - lastHeartbeat > 15_000) {
        writeSseComment(controller, 'keep-alive')
        lastHeartbeat = nowTime
      }

      await sleep(1200)
    }
  })
})

app.get('/api/chats/client/last-id', requireClientAuth, async (c) => {
  const client = c.get('client')
  const data = await loadData(c.env)
  const lastId = data.chatMessages
    .filter((message) => message.clientId === client.id)
    .reduce((maxId, message) => Math.max(maxId, message.id), 0)

  return c.json({ lastId })
})

app.get('/api/chats/admin/stream', requireAgencyAdminAuth, async (c) => {
  const url = new URL(c.req.url)
  const afterId = Number(url.searchParams.get('afterId') ?? 0)
  if (!Number.isFinite(afterId) || afterId < 0) {
    return c.json({ error: 'afterId must be a non-negative number' }, 400)
  }

  const startedAt = Date.now()
  return createSseResponse(c.req.raw, async (controller) => {
    let lastId = afterId
    let lastHeartbeat = Date.now()
    writeSseEvent(controller, 'ready', { ok: true })

    while (!c.req.raw.signal.aborted && Date.now() - startedAt < 60_000) {
      const data = await loadData(c.env)
      const nextMessages = data.chatMessages
        .filter((message) => message.id > lastId)
        .sort((left, right) => left.id - right.id)

      for (const message of nextMessages) {
        writeSseEvent(controller, 'message', { message })
        lastId = Math.max(lastId, message.id)
      }

      const nowTime = Date.now()
      if (nowTime - lastHeartbeat > 15_000) {
        writeSseComment(controller, 'keep-alive')
        lastHeartbeat = nowTime
      }

      await sleep(1200)
    }
  })
})

app.get('/api/chats/admin/last-id', requireAgencyAdminAuth, async (c) => {
  const data = await loadData(c.env)
  const lastId = data.chatMessages.reduce((maxId, message) => Math.max(maxId, message.id), 0)
  return c.json({ lastId })
})

app.get('/api/chats/admin/stream/:clientId', requireAgencyAdminAuth, async (c) => {
  const clientId = Number(c.req.param('clientId'))
  if (!Number.isInteger(clientId)) {
    return c.json({ error: 'Valid client id is required' }, 400)
  }

  const url = new URL(c.req.url)
  const afterId = Number(url.searchParams.get('afterId') ?? 0)
  if (!Number.isFinite(afterId) || afterId < 0) {
    return c.json({ error: 'afterId must be a non-negative number' }, 400)
  }

  const { conversationType, agencyId } = getConversationContext(url)
  const startedAt = Date.now()

  return createSseResponse(c.req.raw, async (controller) => {
    let lastId = afterId
    let lastHeartbeat = Date.now()
    writeSseEvent(controller, 'ready', { ok: true })

    while (!c.req.raw.signal.aborted && Date.now() - startedAt < 60_000) {
      const data = await loadData(c.env)
      const nextMessages = data.chatMessages
        .filter(
          (message) =>
            message.clientId === clientId &&
            message.conversationType === conversationType &&
            message.id > lastId &&
            (conversationType === 'support' || message.agencyId === agencyId)
        )
        .sort((left, right) => left.id - right.id)

      for (const message of nextMessages) {
        writeSseEvent(controller, 'message', { message })
        lastId = Math.max(lastId, message.id)
      }

      const nowTime = Date.now()
      if (nowTime - lastHeartbeat > 15_000) {
        writeSseComment(controller, 'keep-alive')
        lastHeartbeat = nowTime
      }

      await sleep(1200)
    }
  })
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
        const publicMessage =
          error instanceof Error && error.message.startsWith('No storage configured:')
            ? error.message
            : error instanceof Error &&
                (error.message.startsWith('Supabase read failed') ||
                  error.message.startsWith('Supabase write failed'))
              ? error.message
              : null

        return jsonError(publicMessage ?? 'Something went wrong!', 500)
      }
    }

    if (url.pathname === '/agencyadmin') {
      return Response.redirect(new URL('/agencyadmin/login', url), 302)
    }

    if (url.pathname === '/agency-admin-portal' || url.pathname === '/agencyadminportal') {
      return Response.redirect(new URL('/agencyadmin/login', url), 302)
    }

    if (url.pathname === '/agency-portal' || url.pathname === '/agencyportal') {
      return Response.redirect(new URL('/agencies', url), 302)
    }

    if (url.pathname === '/user-portal' || url.pathname === '/userportal') {
      return Response.redirect(new URL('/employer-login', url), 302)
    }

    const isAssetRequest =
      url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/favicon') ||
      url.pathname.startsWith('/robots.txt') ||
      url.pathname.startsWith('/maid_agency_logo_81.jpg') ||
      /\.[a-zA-Z0-9]+$/.test(url.pathname)

    if (!isAssetRequest) {
      const spaRequest = new Request(new URL('/', url).toString(), request)
      return env.ASSETS.fetch(spaRequest)
    }

    const assetResponse = await env.ASSETS.fetch(request)
    if (assetResponse.status !== 404) {
      return assetResponse
    }

    const spaRequest = new Request(new URL('/', url).toString(), request)
    return env.ASSETS.fetch(spaRequest)
  },
}
