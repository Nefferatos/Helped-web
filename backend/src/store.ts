import { copyFile, mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto'
import {
  countMaidRecordsSql,
  createMaidSql,
  deleteMaidSql,
  getMaidByReferenceCodeSql,
  getMaidPhotosBatchSql,
  listMaidRecordsPageSql,
  listMaidRecordsSql,
  type SqlMaidPayload,
  updateMaidMediaSql,
  updateMaidSql,
  updateMaidVisibilitySql,
  upsertMaidRecordsSql,
} from './repositories/maidRepository'

const DEFAULT_AGENCY_ID = 1

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
  agencyId: number
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
  agencyId: number
  username: string
  date: string
  email: string
  phone: string
  message: string
  clientId?: number
  clientName?: string
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
  emailVerified?: boolean
  emailConfirmationCode?: string
  emailConfirmationCodeCreatedAt?: string
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
  agencyId: number
  supabaseUserId?: string
  username: string
  email?: string
  passwordHash?: string
  password: string
  role?: 'admin' | 'agency' | 'staff'
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
  agencyId: number
  maidReferenceCode: string
  maidName: string
  clientId: number
  clientName: string
  clientEmail: string
  clientPhone: string
  status: string
  requestType?: 'general' | 'direct'
  maidReferences?: string[]
  requestDetails?: Record<string, string>
  formData?: Record<string, string>
  createdAt: string
  updatedAt?: string
  updatedBy?: string
}

export interface ChatMessageRecord {
  id: number
  clientId: number
  conversationType: 'support' | 'agency'
  agencyId: number
  agencyName?: string
  senderRole: 'client' | 'agency'
  senderName: string
  message: string
  createdAt: string
  readByAgency: boolean
  readByClient: boolean
}

export type SupportConversationStatus =
  | 'OPEN'
  | 'WAITING_CLIENT'
  | 'WAITING_SUPPORT'
  | 'RESOLVED'
  | 'CLOSED'

export type SupportInquiryCategory =
  | 'Booking Concern'
  | 'Payment Concern'
  | 'Contract Concern'
  | 'Maid Replacement'
  | 'Technical Support'
  | 'General Inquiry'

export type SupportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface SupportConversationRecord {
  id: number
  clientId: number
  conversationType: 'support' | 'agency'
  agencyId: number
  agencyName?: string
  subject: string
  description: string
  status: SupportConversationStatus
  category: SupportInquiryCategory
  priority: SupportPriority
  assignedAdminId?: number
  assignedAdminName?: string
  lastMessageAt: string
  lastMessagePreview: string
  unreadClient: number
  unreadAdmin: number
  clientLastReadAt?: string
  adminLastReadAt?: string
  resolvedAt?: string
  closedAt?: string
  createdAt: string
  updatedAt: string
}

export interface SupportMessageRecord {
  id: number
  conversationId: number
  clientId: number
  conversationType: 'support' | 'agency'
  agencyId: number
  agencyName?: string
  senderRole: 'client' | 'agency'
  senderName: string
  message: string
  attachments: Array<{
    name: string
    url: string
    mimeType?: string
    size?: number
  }>
  createdAt: string
}

export interface SupportNotificationRecord {
  id: number
  conversationId: number
  messageId: number
  clientId: number
  agencyId: number
  recipientType: 'client' | 'admin'
  recipientId?: number
  title: string
  body: string
  createdAt: string
  readAt?: string
}

export interface AgencyChatbotTopicRecord {
  id: string
  label: string
  icon: string
  description: string
  suggestedMessage: string
  enabled: boolean
}

export interface AgencyChatbotRuleRecord {
  id: string
  label: string
  keywords: string[]
  response: string
  enabled: boolean
}

export interface AgencyChatbotConfigRecord {
  agencyId: number
  enabled: boolean
  botName: string
  welcomeMessage: string
  fallbackShortResponse: string
  fallbackLongResponse: string
  suggestionChips: string[]
  topicOptions: AgencyChatbotTopicRecord[]
  responseRules: AgencyChatbotRuleRecord[]
  updatedAt: string
}

export interface RequestConversationRecord {
  id: string
  requestId: string
  agencyId: number
  clientId: number
  createdAt: string
}

export interface RequestMessageRecord {
  id: string
  conversationId: string
  senderType: 'client' | 'admin' | 'staff' | 'system'
  senderId: number
  message: string
  createdAt: string
  attachments?: unknown
}

export interface EmployerContractRecord {
  id: number
  agencyId: number
  refCode: string
  maid: Record<string, unknown>
  agency: Record<string, unknown>
  employer: Record<string, unknown>
  spouse: Record<string, unknown>
  familyMembers: Array<Record<string, unknown>>
  notificationDate?: Record<string, unknown>
  documents: Array<{
    category: string
    fileUrl: string
    fileName: string
  }>
  createdAt: string
  updatedAt: string
}

export interface EmployerContractFileRecord {
  id: number
  agencyId: number
  name: string
  size: number
  type: string
  dataBase64: string
  storagePath?: string
  category: string
  refCode: string
  createdAt: string
}

export interface EmploymentContractRecord {
  id: number
  agencyId?: number
  refCode: string
  employerRefCode: string
  employerId: number | null
  maidId: number | null
  maidReferenceCode: string
  maidName: string
  employerName: string
  caseReferenceNumber: string
  contractDate: string
  serviceFee: string
  placementFee: string
  agencyWitness: string
  employerSnapshot: Record<string, unknown>
  maidSnapshot: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

const defaultMaidLanguageSkills = {
  English: '',
  'Mandarin/Chinese-Dialect': '',
  'Bahasa Indonesia/Malaysia': '',
  Hindi: '',
  Tamil: '',
}

const defaultMaidRecordValues = {
  fullName: '',
  referenceCode: '',
  status: 'available',
  type: '',
  nationality: '',
  dateOfBirth: '',
  placeOfBirth: '',
  height: 0,
  weight: 0,
  religion: '',
  maritalStatus: '',
  numberOfChildren: 0,
  numberOfSiblings: 0,
  homeAddress: '',
  airportRepatriation: '',
  educationLevel: '',
  languageSkills: defaultMaidLanguageSkills,
  skillsPreferences: {},
  workAreas: {},
  employmentHistory: [] as Array<Record<string, unknown>>,
  introduction: {},
  agencyContact: {},
  photoDataUrls: [] as string[],
  photoDataUrl: '',
  videoDataUrl: '',
  isPublic: false,
  hasPhoto: false,
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
  supportConversations: SupportConversationRecord[]
  supportMessages: SupportMessageRecord[]
  supportNotifications: SupportNotificationRecord[]
  agencyChatbotConfigs: AgencyChatbotConfigRecord[]
  requestConversations: RequestConversationRecord[]
  requestMessages: RequestMessageRecord[]
  employers: EmployerContractRecord[]
  employmentContracts: EmploymentContractRecord[]
  employerContractFiles: EmployerContractFileRecord[]
  counters: {
    momPersonnel: number
    testimonials: number
    maids: number
    enquiries: number
    clients: number
    agencyAdmins: number
    directSales: number
    chatMessages: number
    supportConversations: number
    supportMessages: number
    supportNotifications: number
    employers: number
    employmentContracts: number
    employerContractFiles: number
  }
}

const now = () => new Date().toISOString()
const uploadsRoot = path.resolve(__dirname, '../data/uploads')
const MAX_MAID_MEDIA_BYTES = 5 * 1024 * 1024

const sanitizePathSegment = (value: string, fallback: string) => {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return sanitized || fallback
}

const ensureUploadDir = async (...segments: string[]) => {
  const dir = path.join(uploadsRoot, ...segments)
  await mkdir(dir, { recursive: true })
  return dir
}

const dataUrlPattern = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i

const extensionForMimeType = (mimeType: string) => {
  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    case 'image/gif':
      return '.gif'
    case 'video/mp4':
      return '.mp4'
    case 'video/webm':
      return '.webm'
    case 'video/ogg':
      return '.ogv'
    case 'application/pdf':
      return '.pdf'
    default:
      return ''
  }
}

const decodeDataUrl = (value: string) => {
  const match = value.match(dataUrlPattern)
  if (!match) return null
  const mimeType = match[1] || 'application/octet-stream'
  const base64 = match[2]
  const estimatedBytes = Math.floor((base64.length * 3) / 4)
  if (estimatedBytes > MAX_MAID_MEDIA_BYTES) {
    throw new Error('MAID_MEDIA_TOO_LARGE')
  }
  const buffer = Buffer.from(base64, 'base64')
  if (!buffer.length) return null
  return { mimeType, buffer }
}

const writeUploadBuffer = async (
  segments: string[],
  fileName: string,
  buffer: Buffer
) => {
  const dir = await ensureUploadDir(...segments)
  const filePath = path.join(dir, fileName)
  await writeFile(filePath, buffer)
  return filePath
}

const toUploadUrl = (...segments: string[]) => `/${segments.join('/')}`

const toUploadRelativePath = (...segments: string[]) => segments.join('/')

const persistMaidMediaValue = async (
  value: string,
  agencyId: number,
  referenceCode: string,
  kind: 'photos' | 'videos',
  index: number
) => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!trimmed.startsWith('data:')) {
    return trimmed
  }

  const decoded = decodeDataUrl(trimmed)
  if (!decoded) {
    return trimmed
  }

  const safeRef = sanitizePathSegment(referenceCode, 'maid')
  const extension = extensionForMimeType(decoded.mimeType)
  const fileName = `${kind.slice(0, -1)}-${index + 1}-${randomUUID()}${extension}`
  await writeUploadBuffer(
    ['maids', `agency-${agencyId}`, safeRef, kind],
    fileName,
    decoded.buffer
  )
  return toUploadUrl('uploads', 'maids', `agency-${agencyId}`, safeRef, kind, fileName)
}

const persistMaidMediaFields = async (
  maid: Omit<MaidRecord, 'id' | 'agencyId' | 'createdAt' | 'updatedAt'>,
  agencyId: number
) => {
  const normalizedPhotos = (
    Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
      ? maid.photoDataUrls
      : maid.photoDataUrl
      ? [maid.photoDataUrl]
      : []
  )
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, 5)

  const persistedPhotos = await Promise.all(
    normalizedPhotos.map((photo, index) =>
      persistMaidMediaValue(photo, agencyId, maid.referenceCode, 'photos', index)
    )
  )

  const persistedVideo =
    typeof maid.videoDataUrl === 'string' && maid.videoDataUrl.trim().startsWith('data:')
      ? await persistMaidMediaValue(
          maid.videoDataUrl,
          agencyId,
          maid.referenceCode,
          'videos',
          0
        )
      : maid.videoDataUrl?.trim() || ''

  return {
    ...maid,
    photoDataUrls: persistedPhotos,
    photoDataUrl: persistedPhotos[0] ?? '',
    videoDataUrl: persistedVideo,
    hasPhoto: persistedPhotos.length > 0,
  }
}

const toSqlMaidPayload = (
  maid: Omit<MaidRecord, 'id' | 'agencyId' | 'createdAt' | 'updatedAt'>
): SqlMaidPayload => ({
  fullName: maid.fullName,
  referenceCode: maid.referenceCode,
  status: maid.status ?? 'available',
  type: maid.type,
  nationality: maid.nationality,
  dateOfBirth: maid.dateOfBirth,
  placeOfBirth: maid.placeOfBirth,
  height: maid.height,
  weight: maid.weight,
  religion: maid.religion,
  maritalStatus: maid.maritalStatus,
  numberOfChildren: maid.numberOfChildren,
  numberOfSiblings: maid.numberOfSiblings,
  homeAddress: maid.homeAddress,
  airportRepatriation: maid.airportRepatriation,
  educationLevel: maid.educationLevel,
  languageSkills: maid.languageSkills,
  skillsPreferences: maid.skillsPreferences,
  workAreas: maid.workAreas,
  employmentHistory: maid.employmentHistory,
  introduction: maid.introduction,
  agencyContact: maid.agencyContact,
  photoDataUrls: maid.photoDataUrls,
  photoDataUrl: maid.photoDataUrl,
  videoDataUrl: maid.videoDataUrl,
  isPublic: maid.isPublic,
  hasPhoto: maid.hasPhoto,
})

const persistEmployerContractFilePayload = async (
  file: {
    name: string
    size: number
    type: string
    dataBase64: string
    category?: string
    refCode?: string
  },
  agencyId: number
) => {
  const buffer = Buffer.from(file.dataBase64, 'base64')
  const safeRef = sanitizePathSegment(String(file.refCode ?? ''), 'general')
  const safeName = sanitizePathSegment(file.name, 'document')
  const extension = path.extname(safeName) || extensionForMimeType(file.type) || '.bin'
  const baseName = path.basename(safeName, path.extname(safeName)) || 'document'
  const fileName = `${baseName}-${randomUUID()}${extension}`
  const relativePath = toUploadRelativePath(
    'employer-contract-files',
    `agency-${agencyId}`,
    safeRef,
    fileName
  )
  await writeUploadBuffer(
    ['employer-contract-files', `agency-${agencyId}`, safeRef],
    fileName,
    buffer
  )
  return {
    storagePath: relativePath,
    size: buffer.length,
  }
}

const migrateLegacyMediaInData = async (data: AppData) => {
  let changed = false

  for (let index = 0; index < data.maids.length; index += 1) {
    const maid = data.maids[index]
    const migrated = await persistMaidMediaFields(
      {
        ...maid,
        photoDataUrls: maid.photoDataUrls,
        photoDataUrl: maid.photoDataUrl,
        videoDataUrl: maid.videoDataUrl,
      },
      maid.agencyId
    )

    const photosChanged =
      JSON.stringify(migrated.photoDataUrls) !== JSON.stringify(maid.photoDataUrls) ||
      migrated.photoDataUrl !== maid.photoDataUrl
    const videoChanged = migrated.videoDataUrl !== maid.videoDataUrl

    if (photosChanged || videoChanged || migrated.hasPhoto !== maid.hasPhoto) {
      data.maids[index] = {
        ...maid,
        photoDataUrls: migrated.photoDataUrls,
        photoDataUrl: migrated.photoDataUrl,
        videoDataUrl: migrated.videoDataUrl,
        hasPhoto: migrated.hasPhoto,
      }
      changed = true
    }
  }

  for (let index = 0; index < data.employerContractFiles.length; index += 1) {
    const file = data.employerContractFiles[index]
    if (file.storagePath || !file.dataBase64.trim()) {
      continue
    }

    const persisted = await persistEmployerContractFilePayload(
      {
        name: file.name,
        size: file.size,
        type: file.type,
        dataBase64: file.dataBase64,
        category: file.category,
        refCode: file.refCode,
      },
      file.agencyId
    )

    data.employerContractFiles[index] = {
      ...file,
      size: persisted.size,
      storagePath: persisted.storagePath,
      dataBase64: '',
    }
    changed = true
  }

  return changed
}

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
    contact_phone: '+65 80730757',
    contact_email: 'info@theagency.sg',
    contact_fax: '',
    contact_website: '',
    office_hours_regular: 'Mon-Sat: 9:00am to 7:30pm',
    office_hours_other: '',
    social_facebook: '',
    social_whatsapp_number: '+65 80730757',
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
      agencyId: DEFAULT_AGENCY_ID,
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
      agencyId: DEFAULT_AGENCY_ID,
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
      agencyId: DEFAULT_AGENCY_ID,
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
      agencyId: DEFAULT_AGENCY_ID,
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
      agencyId: DEFAULT_AGENCY_ID,
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
      agencyId: DEFAULT_AGENCY_ID,
      username: 'attheagency',
      email: 'attheagency@example.com',
      password: '@atagency2026',
      passwordHash: '',
      role: 'admin',
      agencyName: 'Main Agency',
      createdAt: now(),
    },
  ],
  agencyAdminSessions: [],
  directSales: [],
  chatMessages: [],
  supportConversations: [],
  supportMessages: [],
  supportNotifications: [],
  agencyChatbotConfigs: [],
  requestConversations: [],
  requestMessages: [],
  employers: [],
  employmentContracts: [],
  employerContractFiles: [],
  counters: {
    momPersonnel: 1,
    testimonials: 1,
    maids: 1,
    enquiries: 6,
    clients: 1,
    agencyAdmins: 2,
    directSales: 1,
    chatMessages: 1,
    supportConversations: 1,
    supportMessages: 1,
    supportNotifications: 1,
    employers: 1,
    employmentContracts: 1,
    employerContractFiles: 1,
  },
})

const dataDir = path.resolve(__dirname, '../data')
const configuredDataFile = process.env.APP_DATA_FILE?.trim()
const dataFile = configuredDataFile
  ? path.resolve(configuredDataFile)
  : path.join(dataDir, 'app-data.json')
const defaultDataFile = path.join(dataDir, 'app-data.json')

let cache: AppData | null = null
let pendingSave: Promise<void> = Promise.resolve()

const stripBom = (value: string) => value.replace(/^\uFEFF/, '')
const generateEmailConfirmationCode = () => {
  // 8 cryptographically random decimal digits
  const n = randomBytes(4).readUInt32BE(0) % 100_000_000
  return String(n).padStart(8, '0')
}
const normalizeAgencyId = (value: unknown) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_AGENCY_ID
}
const normalizeTextList = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => String(item ?? '').trim())
        .filter((item) => item.length > 0)
    : []
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const compactObject = (value: unknown): Record<string, unknown> => {
  if (!isPlainObject(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry == null) return false
      if (typeof entry === 'string') return entry.trim().length > 0
      if (Array.isArray(entry)) return entry.length > 0
      if (isPlainObject(entry)) return Object.keys(entry).length > 0
      return true
    })
  )
}

const compactMaidRecordForStorage = (maid: MaidRecord) => {
  const normalizedPhotos = Array.isArray(maid.photoDataUrls)
    ? maid.photoDataUrls.filter((item) => typeof item === 'string' && item.trim().length > 0)
    : []
  const compactLanguageSkills = compactObject(maid.languageSkills)
  const compactSkillsPreferences = compactObject(maid.skillsPreferences)
  const compactWorkAreas = compactObject(maid.workAreas)
  const compactIntroduction = compactObject(maid.introduction)
  const compactAgencyContact = compactObject(maid.agencyContact)
  const compactEmploymentHistory = Array.isArray(maid.employmentHistory)
    ? maid.employmentHistory.filter((item) => isPlainObject(item) && Object.keys(compactObject(item)).length > 0)
    : []

  return {
    id: maid.id,
    agencyId: maid.agencyId,
    fullName: maid.fullName,
    referenceCode: maid.referenceCode,
    ...(maid.status && maid.status !== defaultMaidRecordValues.status ? { status: maid.status } : {}),
    ...(maid.type ? { type: maid.type } : {}),
    ...(maid.nationality ? { nationality: maid.nationality } : {}),
    ...(maid.dateOfBirth ? { dateOfBirth: maid.dateOfBirth } : {}),
    ...(maid.placeOfBirth ? { placeOfBirth: maid.placeOfBirth } : {}),
    ...(maid.height ? { height: maid.height } : {}),
    ...(maid.weight ? { weight: maid.weight } : {}),
    ...(maid.religion ? { religion: maid.religion } : {}),
    ...(maid.maritalStatus ? { maritalStatus: maid.maritalStatus } : {}),
    ...(maid.numberOfChildren ? { numberOfChildren: maid.numberOfChildren } : {}),
    ...(maid.numberOfSiblings ? { numberOfSiblings: maid.numberOfSiblings } : {}),
    ...(maid.homeAddress ? { homeAddress: maid.homeAddress } : {}),
    ...(maid.airportRepatriation ? { airportRepatriation: maid.airportRepatriation } : {}),
    ...(maid.educationLevel ? { educationLevel: maid.educationLevel } : {}),
    ...(Object.keys(compactLanguageSkills).length > 0 ? { languageSkills: compactLanguageSkills } : {}),
    ...(Object.keys(compactSkillsPreferences).length > 0
      ? { skillsPreferences: compactSkillsPreferences }
      : {}),
    ...(Object.keys(compactWorkAreas).length > 0 ? { workAreas: compactWorkAreas } : {}),
    ...(compactEmploymentHistory.length > 0 ? { employmentHistory: compactEmploymentHistory } : {}),
    ...(Object.keys(compactIntroduction).length > 0 ? { introduction: compactIntroduction } : {}),
    ...(Object.keys(compactAgencyContact).length > 0 ? { agencyContact: compactAgencyContact } : {}),
    ...(normalizedPhotos.length > 0
      ? {
          photoDataUrls: normalizedPhotos,
          photoDataUrl: normalizedPhotos[0] ?? '',
          hasPhoto: true,
        }
      : {}),
    ...(maid.videoDataUrl ? { videoDataUrl: maid.videoDataUrl } : {}),
    ...(maid.isPublic ? { isPublic: true } : {}),
    createdAt: maid.createdAt,
    updatedAt: maid.updatedAt,
  }
}
const defaultAgencyChatbotTopics = (): AgencyChatbotTopicRecord[] => [
  {
    id: 'placement',
    label: 'Placement Status',
    icon: '📋',
    description: 'Ask about your current placement or application progress',
    suggestedMessage:
      "Hi, I'd like to get an update on the status of my current placement request.",
    enabled: true,
  },
  {
    id: 'schedule',
    label: 'Schedule Change',
    icon: '📅',
    description: "Request a change to a helper's schedule or hours",
    suggestedMessage:
      "Hi, I need to request a change to my helper's schedule.",
    enabled: true,
  },
  {
    id: 'complaint',
    label: 'Raise a Concern',
    icon: '🚨',
    description: 'Report an issue or concern with a helper or agency',
    suggestedMessage:
      "Hi, I'd like to raise a concern regarding my current arrangement.",
    enabled: true,
  },
  {
    id: 'billing',
    label: 'Billing / Fees',
    icon: '💳',
    description: 'Inquire about invoices, fees, or payment',
    suggestedMessage: 'Hi, I have a question regarding my billing or invoice.',
    enabled: true,
  },
  {
    id: 'renewal',
    label: 'Contract Renewal',
    icon: '🔄',
    description: 'Discuss renewal or extension of a contract',
    suggestedMessage:
      "Hi, I'd like to discuss renewing my current contract.",
    enabled: true,
  },
  {
    id: 'other',
    label: 'Other',
    icon: '💬',
    description: 'Something else — just type your message',
    suggestedMessage: '',
    enabled: true,
  },
]
const defaultAgencyChatbotRules = (): AgencyChatbotRuleRecord[] => [
  {
    id: 'placement',
    label: 'Placement / Status',
    keywords: ['placement', 'application', 'status', 'progress', 'update'],
    response:
      "Hi {{name}}, I've noted your inquiry about your placement or application status. Please share any reference number or helper name and our team will review it shortly.",
    enabled: true,
  },
  {
    id: 'pricing',
    label: 'Pricing / Fees',
    keywords: ['price', 'pricing', 'cost', 'budget', 'fee', 'fees', 'salary'],
    response:
      'Thanks for asking, {{name}}. Our team can help with pricing, salary expectations, and agency fees. If you already know the helper type or budget range, send it here and we will guide you faster.',
    enabled: true,
  },
  {
    id: 'schedule',
    label: 'Interview / Scheduling',
    keywords: ['interview', 'schedule', 'appointment', 'reschedule', 'date', 'time'],
    response:
      'Got it, {{name}}. Please share your preferred date and time, and we will help coordinate the next step for you.',
    enabled: true,
  },
  {
    id: 'availability',
    label: 'Availability',
    keywords: ['available', 'availability', 'still available', 'can i hire'],
    response:
      'Hi {{name}}, we can help check availability. If you have a specific profile or reference code in mind, send it here and our team will confirm the current status.',
    enabled: true,
  },
  {
    id: 'documents',
    label: 'Documents / Process',
    keywords: ['document', 'paperwork', 'permit', 'requirement', 'checklist'],
    response:
      'Hello {{name}}. To guide you correctly, please let us know whether this is for a new hire, transfer, or renewal, and we will share the required documents and next steps.',
    enabled: true,
  },
  {
    id: 'complaint',
    label: 'Complaint / Concern',
    keywords: ['complaint', 'concern', 'issue', 'problem', 'unhappy'],
    response:
      "I'm sorry to hear that, {{name}}. Please share what happened and when it happened, and our team will review it as a priority.",
    enabled: true,
  },
  {
    id: 'greeting',
    label: 'Greeting',
    keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon'],
    response:
      'Hello {{name}}, welcome to {{agencyName}} support. How may I assist you today?',
    enabled: true,
  },
]
const buildDefaultAgencyChatbotConfig = (
  agencyId: number,
  agencyName?: string
): AgencyChatbotConfigRecord => ({
  agencyId,
  enabled: true,
  botName: agencyName?.trim() ? `${agencyName.trim()} Support Bot` : 'Support Bot',
  welcomeMessage:
    'Hi {{name}}, welcome to {{agencyName}}. How can I help you today?',
  fallbackShortResponse:
    'Hi {{name}}, thanks for your message. Could you share a little more detail so I can help you with the next step? For further assistance, contact us on WhatsApp at +65 80730757.',
  fallbackLongResponse:
    "Hi {{name}}, thanks for reaching out. I've noted your message. If you can share the main details here, I'll help make sure it is clear for the team to follow up. If it is urgent, please mention that as well. For further assistance, contact us on WhatsApp at +65 80730757.",
  suggestionChips: [
    "What's my placement status?",
    'I need to reschedule',
    'Billing question',
    'Raise a concern',
  ],
  topicOptions: defaultAgencyChatbotTopics(),
  responseRules: defaultAgencyChatbotRules(),
  updatedAt: now(),
})

const WHATSAPP_ASSISTANCE_LINE =
  'For further assistance, contact us on WhatsApp at +65 80730757.'

const ensureAssistanceLine = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  if (trimmed.toLowerCase().includes(WHATSAPP_ASSISTANCE_LINE.toLowerCase())) {
    return trimmed
  }
  return `${trimmed} ${WHATSAPP_ASSISTANCE_LINE}`.trim()
}

const normalizeAgencyChatbotTopic = (
  topic: Partial<AgencyChatbotTopicRecord>,
  fallback: AgencyChatbotTopicRecord,
  index: number
): AgencyChatbotTopicRecord => ({
  id: String(topic.id ?? fallback.id ?? `topic-${index + 1}`).trim() || `topic-${index + 1}`,
  label: String(topic.label ?? fallback.label ?? `Topic ${index + 1}`).trim() || `Topic ${index + 1}`,
  icon: String(topic.icon ?? fallback.icon ?? '💬').trim() || '💬',
  description: String(topic.description ?? fallback.description ?? '').trim(),
  suggestedMessage: String(topic.suggestedMessage ?? fallback.suggestedMessage ?? '').trim(),
  enabled: topic.enabled ?? fallback.enabled ?? true,
})
const normalizeAgencyChatbotRule = (
  rule: Partial<AgencyChatbotRuleRecord>,
  fallback: AgencyChatbotRuleRecord,
  index: number
): AgencyChatbotRuleRecord => ({
  id: String(rule.id ?? fallback.id ?? `rule-${index + 1}`).trim() || `rule-${index + 1}`,
  label: String(rule.label ?? fallback.label ?? `Rule ${index + 1}`).trim() || `Rule ${index + 1}`,
  keywords: normalizeTextList(rule.keywords ?? fallback.keywords),
  response: String(rule.response ?? fallback.response ?? '').trim(),
  enabled: rule.enabled ?? fallback.enabled ?? true,
})
const normalizeAgencyChatbotConfig = (
  input: Partial<AgencyChatbotConfigRecord> | undefined,
  agencyId: number,
  agencyName?: string
): AgencyChatbotConfigRecord => {
  const defaults = buildDefaultAgencyChatbotConfig(agencyId, agencyName)
  const rawTopics = Array.isArray(input?.topicOptions)
    ? input?.topicOptions
    : defaults.topicOptions
  const rawRules = Array.isArray(input?.responseRules)
    ? input?.responseRules
    : defaults.responseRules

  return {
    agencyId,
    enabled: input?.enabled ?? defaults.enabled,
    botName: String(input?.botName ?? defaults.botName).trim() || defaults.botName,
    welcomeMessage:
      String(input?.welcomeMessage ?? defaults.welcomeMessage).trim() ||
      defaults.welcomeMessage,
    fallbackShortResponse: ensureAssistanceLine(
      String(input?.fallbackShortResponse ?? defaults.fallbackShortResponse).trim() ||
        defaults.fallbackShortResponse
    ),
    fallbackLongResponse: ensureAssistanceLine(
      String(input?.fallbackLongResponse ?? defaults.fallbackLongResponse).trim() ||
        defaults.fallbackLongResponse
    ),
    suggestionChips: normalizeTextList(input?.suggestionChips ?? defaults.suggestionChips).slice(
      0,
      8
    ),
    topicOptions: rawTopics
      .map((topic, index) =>
        normalizeAgencyChatbotTopic(
          topic,
          defaults.topicOptions[index] ??
            normalizeAgencyChatbotTopic({}, defaults.topicOptions[0], index),
          index
        )
      )
      .filter((topic) => topic.label.length > 0)
      .slice(0, 12),
    responseRules: rawRules
      .map((rule, index) =>
        normalizeAgencyChatbotRule(
          rule,
          defaults.responseRules[index] ??
            normalizeAgencyChatbotRule({}, defaults.responseRules[0], index),
          index
        )
      )
      .filter((rule) => rule.label.length > 0 && rule.response.length > 0)
      .slice(0, 20),
    updatedAt:
      typeof input?.updatedAt === 'string' && input.updatedAt.trim()
        ? input.updatedAt
        : now(),
  }
}

const DEFAULT_SUPPORT_CATEGORY: SupportInquiryCategory = 'General Inquiry'
const DEFAULT_SUPPORT_PRIORITY: SupportPriority = 'MEDIUM'
const DEFAULT_SUPPORT_STATUS: SupportConversationStatus = 'OPEN'

const trimSupportText = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()

const inferSupportCategory = (value: string): SupportInquiryCategory => {
  const text = value.toLowerCase()
  if (/(book|booking|placement|schedule|interview|appointment)/.test(text)) {
    return 'Booking Concern'
  }
  if (/(payment|billing|invoice|fee|fees|refund|salary)/.test(text)) {
    return 'Payment Concern'
  }
  if (/(contract|renewal|agreement|extension|terms)/.test(text)) {
    return 'Contract Concern'
  }
  if (/(replace|replacement|transfer|change helper|new helper)/.test(text)) {
    return 'Maid Replacement'
  }
  if (/(bug|technical|login|system|portal|error|website|upload)/.test(text)) {
    return 'Technical Support'
  }
  return DEFAULT_SUPPORT_CATEGORY
}

const inferSupportPriority = (value: string): SupportPriority => {
  const text = value.toLowerCase()
  if (/(urgent|asap|emergency|immediately)/.test(text)) return 'URGENT'
  if (/(complaint|issue|problem|stuck|cannot|can't|fail)/.test(text)) return 'HIGH'
  if (/(follow up|follow-up|status|update|check)/.test(text)) return 'MEDIUM'
  return 'LOW'
}

const buildSupportConversationSubject = (
  conversationType: 'support' | 'agency',
  category: SupportInquiryCategory,
  agencyName?: string
) => {
  if (conversationType === 'agency') {
    return agencyName?.trim() ? `${agencyName.trim()} · ${category}` : category
  }
  return `Agency Support · ${category}`
}

const normalizeSupportConversationStatus = (value: unknown): SupportConversationStatus => {
  if (
    value === 'OPEN' ||
    value === 'WAITING_CLIENT' ||
    value === 'WAITING_SUPPORT' ||
    value === 'RESOLVED' ||
    value === 'CLOSED'
  ) {
    return value
  }
  return DEFAULT_SUPPORT_STATUS
}

const normalizeSupportConversationCategory = (value: unknown): SupportInquiryCategory => {
  if (
    value === 'Booking Concern' ||
    value === 'Payment Concern' ||
    value === 'Contract Concern' ||
    value === 'Maid Replacement' ||
    value === 'Technical Support' ||
    value === 'General Inquiry'
  ) {
    return value
  }
  return DEFAULT_SUPPORT_CATEGORY
}

const normalizeSupportPriority = (value: unknown): SupportPriority => {
  if (value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'URGENT') {
    return value
  }
  return DEFAULT_SUPPORT_PRIORITY
}

const buildSupportConversationKey = (
  clientId: number,
  conversationType: 'support' | 'agency',
  agencyId: number
) => `${clientId}:${conversationType}:${agencyId}`

const normalizeSupportConversation = (
  record: Partial<SupportConversationRecord>,
  index: number
): SupportConversationRecord => ({
  id: Number(record.id ?? index + 1) || index + 1,
  clientId: Number(record.clientId ?? 0) || 0,
  conversationType: record.conversationType === 'agency' ? 'agency' : 'support',
  agencyId: normalizeAgencyId(record.agencyId),
  agencyName: trimSupportText(record.agencyName),
  subject: trimSupportText(record.subject) || 'Support inquiry',
  description: trimSupportText(record.description),
  status: normalizeSupportConversationStatus(record.status),
  category: normalizeSupportConversationCategory(record.category),
  priority: normalizeSupportPriority(record.priority),
  assignedAdminId: Number.isInteger(Number(record.assignedAdminId))
    ? Number(record.assignedAdminId)
    : undefined,
  assignedAdminName: trimSupportText(record.assignedAdminName),
  lastMessageAt: record.lastMessageAt ?? record.updatedAt ?? record.createdAt ?? now(),
  lastMessagePreview: trimSupportText(record.lastMessagePreview),
  unreadClient: Number(record.unreadClient ?? 0) || 0,
  unreadAdmin: Number(record.unreadAdmin ?? 0) || 0,
  clientLastReadAt: record.clientLastReadAt,
  adminLastReadAt: record.adminLastReadAt,
  resolvedAt: record.resolvedAt,
  closedAt: record.closedAt,
  createdAt: record.createdAt ?? now(),
  updatedAt: record.updatedAt ?? record.lastMessageAt ?? now(),
})

const normalizeSupportMessage = (
  record: Partial<SupportMessageRecord>,
  index: number
): SupportMessageRecord => ({
  id: Number(record.id ?? index + 1) || index + 1,
  conversationId: Number(record.conversationId ?? 0) || 0,
  clientId: Number(record.clientId ?? 0) || 0,
  conversationType: record.conversationType === 'agency' ? 'agency' : 'support',
  agencyId: normalizeAgencyId(record.agencyId),
  agencyName: trimSupportText(record.agencyName),
  senderRole: record.senderRole === 'client' ? 'client' : 'agency',
  senderName: trimSupportText(record.senderName) || 'Support',
  message: trimSupportText(record.message),
  attachments: Array.isArray(record.attachments)
    ? record.attachments
        .map((attachment) => ({
          name: trimSupportText(attachment?.name),
          url: trimSupportText(attachment?.url),
          mimeType: trimSupportText(attachment?.mimeType),
          size: Number(attachment?.size ?? 0) || undefined,
        }))
        .filter((attachment) => attachment.name.length > 0 && attachment.url.length > 0)
    : [],
  createdAt: record.createdAt ?? now(),
})

const normalizeSupportNotification = (
  record: Partial<SupportNotificationRecord>,
  index: number
): SupportNotificationRecord => ({
  id: Number(record.id ?? index + 1) || index + 1,
  conversationId: Number(record.conversationId ?? 0) || 0,
  messageId: Number(record.messageId ?? 0) || 0,
  clientId: Number(record.clientId ?? 0) || 0,
  agencyId: normalizeAgencyId(record.agencyId),
  recipientType: record.recipientType === 'client' ? 'client' : 'admin',
  recipientId: Number.isInteger(Number(record.recipientId))
    ? Number(record.recipientId)
    : undefined,
  title: trimSupportText(record.title) || 'Support update',
  body: trimSupportText(record.body),
  createdAt: record.createdAt ?? now(),
  readAt: record.readAt,
})

const migrateLegacyChatToSupport = (
  messages: ChatMessageRecord[]
): Pick<AppData, 'supportConversations' | 'supportMessages' | 'supportNotifications'> => {
  const supportConversations = new Map<string, SupportConversationRecord>()
  const supportMessages: SupportMessageRecord[] = []
  const supportNotifications: SupportNotificationRecord[] = []
  let nextConversationId = 1
  let nextNotificationId = 1

  const sorted = [...messages].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  )

  for (const message of sorted) {
    const agencyId = normalizeAgencyId(message.agencyId)
    const key = buildSupportConversationKey(
      message.clientId,
      message.conversationType,
      agencyId
    )
    const category = inferSupportCategory(message.message)
    const priority = inferSupportPriority(message.message)

    let conversation = supportConversations.get(key)
    if (!conversation) {
      conversation = {
        id: nextConversationId++,
        clientId: message.clientId,
        conversationType: message.conversationType,
        agencyId,
        agencyName: message.agencyName ?? '',
        subject: buildSupportConversationSubject(
          message.conversationType,
          category,
          message.agencyName
        ),
        description:
          message.conversationType === 'agency'
            ? 'Direct conversation with agency support.'
            : 'General support and follow-up for client inquiries.',
        status: message.senderRole === 'client' ? 'WAITING_SUPPORT' : 'WAITING_CLIENT',
        category,
        priority,
        lastMessageAt: message.createdAt,
        lastMessagePreview: trimSupportText(message.message).slice(0, 160),
        unreadClient: 0,
        unreadAdmin: 0,
        createdAt: message.createdAt,
        updatedAt: message.createdAt,
      }
      supportConversations.set(key, conversation)
    }

    supportMessages.push({
      id: message.id,
      conversationId: conversation.id,
      clientId: message.clientId,
      conversationType: message.conversationType,
      agencyId,
      agencyName: message.agencyName ?? '',
      senderRole: message.senderRole,
      senderName: message.senderName,
      message: trimSupportText(message.message),
      attachments: [],
      createdAt: message.createdAt,
    })

    conversation.lastMessageAt = message.createdAt
    conversation.updatedAt = message.createdAt
    conversation.lastMessagePreview = trimSupportText(message.message).slice(0, 160)
    conversation.category =
      conversation.category === DEFAULT_SUPPORT_CATEGORY ? category : conversation.category
    conversation.priority =
      conversation.priority === DEFAULT_SUPPORT_PRIORITY ? priority : conversation.priority

    if (message.senderRole === 'client') {
      conversation.status = 'WAITING_SUPPORT'
      if (!message.readByAgency) {
        conversation.unreadAdmin += 1
        supportNotifications.push({
          id: nextNotificationId++,
          conversationId: conversation.id,
          messageId: message.id,
          clientId: message.clientId,
          agencyId,
          recipientType: 'admin',
          title: 'New client support message',
          body: trimSupportText(message.message).slice(0, 180),
          createdAt: message.createdAt,
        })
      }
    } else {
      conversation.status = 'WAITING_CLIENT'
      if (!message.readByClient) {
        conversation.unreadClient += 1
        supportNotifications.push({
          id: nextNotificationId++,
          conversationId: conversation.id,
          messageId: message.id,
          clientId: message.clientId,
          agencyId,
          recipientType: 'client',
          title: 'Support replied to your inquiry',
          body: trimSupportText(message.message).slice(0, 180),
          createdAt: message.createdAt,
        })
      }
    }
  }

  return {
    supportConversations: Array.from(supportConversations.values()),
    supportMessages,
    supportNotifications,
  }
}
const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}
const verifyPassword = (password: string, passwordHash?: string) => {
  if (!passwordHash?.trim()) {
    return false
  }

  try {
    // Support legacy format (no salt prefix) for backwards compatibility
    if (!passwordHash.includes(':')) {
      const expected = Buffer.from(passwordHash, 'hex')
      const actual = scryptSync(password, 'agency-admin-auth', expected.length)
      return expected.length === actual.length && timingSafeEqual(expected, actual)
    }
    const [salt, storedHash] = passwordHash.split(':')
    const expected = Buffer.from(storedHash, 'hex')
    const actual = scryptSync(password, salt, expected.length)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

const toTrimmedString = (value: unknown) => String(value ?? '').trim()
const isRequestMessageSenderType = (
  value: unknown
): value is RequestMessageRecord['senderType'] =>
  value === 'client' || value === 'admin' || value === 'staff' || value === 'system'
const toNullableNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeEmploymentContractRecord = (
  record: Partial<EmploymentContractRecord>,
  fallbackRefCode: string
): EmploymentContractRecord => ({
  id: Number(record.id ?? 0) || 0,
  agencyId: normalizeAgencyId(record.agencyId),
  refCode: toTrimmedString(record.refCode) || fallbackRefCode,
  employerRefCode:
    toTrimmedString(record.employerRefCode) || toTrimmedString(record.refCode) || fallbackRefCode,
  employerId: toNullableNumber(record.employerId),
  maidId: toNullableNumber(record.maidId),
  maidReferenceCode: toTrimmedString(record.maidReferenceCode),
  maidName: toTrimmedString(record.maidName),
  employerName: toTrimmedString(record.employerName),
  caseReferenceNumber:
    toTrimmedString(record.caseReferenceNumber) || toTrimmedString(record.refCode) || fallbackRefCode,
  contractDate: toTrimmedString(record.contractDate),
  serviceFee: toTrimmedString(record.serviceFee),
  placementFee: toTrimmedString(record.placementFee),
  agencyWitness: toTrimmedString(record.agencyWitness),
  employerSnapshot:
    record.employerSnapshot && typeof record.employerSnapshot === 'object'
      ? record.employerSnapshot
      : {},
  maidSnapshot:
    record.maidSnapshot && typeof record.maidSnapshot === 'object' ? record.maidSnapshot : {},
  createdAt: record.createdAt ?? now(),
  updatedAt: record.updatedAt ?? record.createdAt ?? now(),
})

const normalizeAgencyAdmins = (
  records: AgencyAdminRecord[],
  nextIdStart: number
) => {
  const usedIds = new Set<number>()
  let nextId = Math.max(nextIdStart, 1)

  const normalized = records.map((admin) => {
    let id = Number(admin.id)
    if (!Number.isInteger(id) || id <= 0 || usedIds.has(id)) {
      while (usedIds.has(nextId)) {
        nextId += 1
      }
      id = nextId
      nextId += 1
    }

    usedIds.add(id)
    if (id >= nextId) {
      nextId = id + 1
    }

    return {
      ...admin,
      id,
    }
  })

  return {
    records: normalized,
    nextId,
  }
}

const mergeAppData = (raw: Partial<AppData>): AppData => {
  const defaults = defaultData()
  const legacyChatMessages =
    raw.chatMessages?.map((message) => ({
      ...message,
      conversationType: message.conversationType ?? 'support',
      agencyId: normalizeAgencyId(message.agencyId),
      agencyName: message.agencyName ?? '',
    })) ?? defaults.chatMessages
  const migratedSupport = migrateLegacyChatToSupport(legacyChatMessages)
  const normalizedAgencyAdmins = normalizeAgencyAdmins(
    (raw.agencyAdmins ?? defaults.agencyAdmins).map((admin) => ({
      ...admin,
      agencyId: normalizeAgencyId((admin as { agencyId?: unknown }).agencyId),
      email:
        typeof (admin as { email?: unknown }).email === 'string'
          ? (admin as { email: string }).email.trim().toLowerCase()
          : undefined,
      passwordHash:
        typeof (admin as { passwordHash?: unknown }).passwordHash === 'string'
          ? (admin as { passwordHash: string }).passwordHash
          : '',
      role:
        (admin as { role?: unknown }).role === 'staff'
          ? 'staff'
          : (admin as { role?: unknown }).role === 'agency'
          ? 'agency'
          : 'admin',
      supabaseUserId: admin.supabaseUserId || undefined,
    })),
    raw.counters?.agencyAdmins ?? defaults.counters.agencyAdmins
  )

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
      const normalizedLanguageSkills = isPlainObject(maid.languageSkills)
        ? Object.fromEntries(
            Object.entries(maid.languageSkills).map(([key, value]) => [key, String(value ?? '')])
          )
        : {}
      const normalizedPhotos = Array.isArray(maid.photoDataUrls)
        ? maid.photoDataUrls.filter((item) => typeof item === 'string' && item.trim())
        : maid.photoDataUrl
        ? [maid.photoDataUrl]
        : []
      return {
        ...defaultMaidRecordValues,
        ...maid,
        agencyId: normalizeAgencyId((maid as { agencyId?: unknown }).agencyId),
        status: maid.status ?? 'available',
        languageSkills: {
          ...defaultMaidRecordValues.languageSkills,
          ...normalizedLanguageSkills,
        },
        skillsPreferences: isPlainObject(maid.skillsPreferences) ? maid.skillsPreferences : {},
        workAreas: isPlainObject(maid.workAreas) ? maid.workAreas : {},
        employmentHistory: Array.isArray(maid.employmentHistory) ? maid.employmentHistory : [],
        introduction: isPlainObject(maid.introduction) ? maid.introduction : {},
        agencyContact: isPlainObject(maid.agencyContact) ? maid.agencyContact : {},
        photoDataUrls: normalizedPhotos.slice(0, 5),
        photoDataUrl: normalizedPhotos[0] ?? maid.photoDataUrl ?? '',
        videoDataUrl: maid.videoDataUrl ?? '',
        hasPhoto: normalizedPhotos.length > 0,
      }
    }),
    enquiries: (raw.enquiries ?? defaults.enquiries).map((enquiry) => ({
      ...enquiry,
      agencyId: normalizeAgencyId((enquiry as { agencyId?: unknown }).agencyId),
    })),
    clients: (raw.clients ?? defaults.clients).map((client) => ({
      ...client,
      supabaseUserId: client.supabaseUserId || undefined,
      name: client.name ?? '',
      company: client.company ?? '',
      phone: client.phone ?? '',
      email: client.email ?? '',
      profileImageUrl: client.profileImageUrl ?? '',
      emailVerified: client.emailVerified ?? true,
      emailConfirmationCode: client.emailConfirmationCode ?? '',
      emailConfirmationCodeCreatedAt: client.emailConfirmationCodeCreatedAt ?? '',
      createdAt: client.createdAt ?? now(),
    })),
    clientSessions: raw.clientSessions ?? defaults.clientSessions,
    agencyAdmins: normalizedAgencyAdmins.records,
    agencyAdminSessions: (raw.agencyAdminSessions ?? defaults.agencyAdminSessions).filter(
      (session) => normalizedAgencyAdmins.records.some((admin) => admin.id === session.adminId)
    ),
    directSales: (raw.directSales ?? defaults.directSales).map((directSale) => ({
      ...directSale,
      agencyId: normalizeAgencyId((directSale as { agencyId?: unknown }).agencyId),
      requestType:
        directSale.requestType === 'direct' || directSale.maidReferenceCode !== 'GENERAL'
          ? 'direct'
          : 'general',
      maidReferences: Array.isArray(directSale.maidReferences)
        ? directSale.maidReferences.filter(
            (item): item is string => typeof item === 'string' && item.trim().length > 0
          )
        : directSale.maidReferenceCode && directSale.maidReferenceCode !== 'GENERAL'
        ? [directSale.maidReferenceCode]
        : [],
      updatedAt: directSale.updatedAt ?? directSale.createdAt ?? now(),
      updatedBy: directSale.updatedBy ?? 'migration',
    })),
    chatMessages: legacyChatMessages,
    supportConversations: (
      raw.supportConversations?.length
        ? raw.supportConversations
        : migratedSupport.supportConversations
    ).map((conversation, index) => normalizeSupportConversation(conversation, index)),
    supportMessages: (
      raw.supportMessages?.length ? raw.supportMessages : migratedSupport.supportMessages
    )
      .map((message, index) => normalizeSupportMessage(message, index))
      .filter((message) => message.message.length > 0),
    supportNotifications: (
      raw.supportNotifications?.length
        ? raw.supportNotifications
        : migratedSupport.supportNotifications
    ).map((notification, index) => normalizeSupportNotification(notification, index)),
    agencyChatbotConfigs: (
      raw.agencyChatbotConfigs ?? defaults.agencyChatbotConfigs
    ).map((config) =>
      normalizeAgencyChatbotConfig(
        config,
        normalizeAgencyId((config as { agencyId?: unknown }).agencyId)
      )
    ),
    requestConversations: (raw.requestConversations ?? defaults.requestConversations)
      .map((conversation) => ({
        id:
          typeof conversation.id === 'string' && conversation.id.trim()
            ? conversation.id.trim()
            : randomUUID(),
        requestId: toTrimmedString(conversation.requestId),
        agencyId: normalizeAgencyId(conversation.agencyId),
        clientId: Number(conversation.clientId) || 0,
        createdAt: conversation.createdAt ?? now(),
      }))
      .filter((conversation) => conversation.requestId.length > 0),
    requestMessages: (raw.requestMessages ?? defaults.requestMessages)
      .map((message) => ({
        id:
          typeof message.id === 'string' && message.id.trim()
            ? message.id.trim()
            : randomUUID(),
        conversationId: toTrimmedString(message.conversationId),
        senderType: isRequestMessageSenderType(message.senderType)
          ? message.senderType
          : 'system',
        senderId: Number.isInteger(Number(message.senderId)) ? Number(message.senderId) : 0,
        message: toTrimmedString(message.message),
        createdAt: message.createdAt ?? now(),
        attachments: message.attachments,
      }))
      .filter(
        (message) => message.conversationId.length > 0 && message.message.length > 0
      ),
    employers: (raw.employers ?? defaults.employers).map((record) => ({
      ...record,
      agencyId: normalizeAgencyId((record as { agencyId?: unknown }).agencyId),
      refCode: String((record as { refCode?: unknown }).refCode ?? '').trim(),
      maid: (record as { maid?: Record<string, unknown> }).maid ?? {},
      agency: (record as { agency?: Record<string, unknown> }).agency ?? {},
      employer: (record as { employer?: Record<string, unknown> }).employer ?? {},
      spouse: (record as { spouse?: Record<string, unknown> }).spouse ?? {},
      familyMembers: Array.isArray((record as { familyMembers?: unknown }).familyMembers)
        ? ((record as { familyMembers?: Array<Record<string, unknown>> }).familyMembers ?? [])
        : [],
      notificationDate:
        (record as { notificationDate?: Record<string, unknown> }).notificationDate ?? {},
      documents: Array.isArray((record as { documents?: unknown }).documents)
        ? ((record as {
            documents?: Array<{
              category?: unknown
              fileUrl?: unknown
              fileName?: unknown
            }>
          }).documents ?? []).map((document) => ({
            category: String(document.category ?? ''),
            fileUrl: String(document.fileUrl ?? ''),
            fileName: String(document.fileName ?? ''),
          }))
        : [],
      createdAt: record.createdAt ?? now(),
      updatedAt: record.updatedAt ?? record.createdAt ?? now(),
    })),
    employmentContracts: (
      raw.employmentContracts ??
      raw.employers?.map((record) => {
        const employerRecord = record as EmployerContractRecord
        const agency = employerRecord.agency ?? {}
        const maid = employerRecord.maid ?? {}
        const employer = employerRecord.employer ?? {}
        return {
          id: employerRecord.id,
          agencyId: normalizeAgencyId((employerRecord as { agencyId?: unknown }).agencyId),
          refCode: employerRecord.refCode,
          employerRefCode: employerRecord.refCode,
          employerId: employerRecord.id,
          maidId: toNullableNumber((maid as { id?: unknown }).id),
          maidReferenceCode: toTrimmedString((maid as { referenceCode?: unknown }).referenceCode),
          maidName:
            toTrimmedString((maid as { fullName?: unknown }).fullName) ||
            toTrimmedString((maid as { name?: unknown }).name),
          employerName: toTrimmedString((employer as { name?: unknown }).name),
          caseReferenceNumber:
            toTrimmedString((agency as { caseReferenceNumber?: unknown }).caseReferenceNumber) ||
            employerRecord.refCode,
          contractDate: toTrimmedString((agency as { contractDate?: unknown }).contractDate),
          serviceFee: toTrimmedString((agency as { serviceFee?: unknown }).serviceFee),
          placementFee: toTrimmedString((agency as { placementFee?: unknown }).placementFee),
          agencyWitness: toTrimmedString((agency as { agencyWitness?: unknown }).agencyWitness),
          employerSnapshot: employer,
          maidSnapshot: maid,
          createdAt: employerRecord.createdAt,
          updatedAt: employerRecord.updatedAt,
        }
      }) ??
      defaults.employmentContracts
    ).map((record) =>
      normalizeEmploymentContractRecord(
        record,
        toTrimmedString((record as { refCode?: unknown }).refCode)
      )
    ),
    employerContractFiles: (raw.employerContractFiles ?? defaults.employerContractFiles).map((record) => ({
      ...record,
      agencyId: normalizeAgencyId((record as { agencyId?: unknown }).agencyId),
      name: String((record as { name?: unknown }).name ?? ''),
      size: Number((record as { size?: unknown }).size ?? 0) || 0,
      type: String((record as { type?: unknown }).type ?? ''),
      dataBase64: String((record as { dataBase64?: unknown }).dataBase64 ?? ''),
      storagePath:
        typeof (record as { storagePath?: unknown }).storagePath === 'string'
          ? (record as { storagePath: string }).storagePath
          : undefined,
      category: String((record as { category?: unknown }).category ?? ''),
      refCode: String((record as { refCode?: unknown }).refCode ?? ''),
      createdAt: record.createdAt ?? now(),
    })),
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
        normalizedAgencyAdmins.nextId,
      directSales:
        raw.counters?.directSales ??
        ((raw.directSales?.length ?? 0) + 1 || defaults.counters.directSales),
      chatMessages:
        raw.counters?.chatMessages ??
        ((raw.chatMessages?.length ?? 0) + 1 || defaults.counters.chatMessages),
      supportConversations:
        raw.counters?.supportConversations ??
        ((raw.supportConversations?.length ??
          migratedSupport.supportConversations.length ??
          0) + 1 || defaults.counters.supportConversations),
      supportMessages:
        raw.counters?.supportMessages ??
        ((raw.supportMessages?.length ?? migratedSupport.supportMessages.length ?? 0) + 1 ||
          defaults.counters.supportMessages),
      supportNotifications:
        raw.counters?.supportNotifications ??
        ((raw.supportNotifications?.length ??
          migratedSupport.supportNotifications.length ??
          0) + 1 || defaults.counters.supportNotifications),
      employers:
        raw.counters?.employers ??
        ((raw.employers?.length ?? 0) + 1 || defaults.counters.employers),
      employmentContracts:
        raw.counters?.employmentContracts ??
        ((raw.employmentContracts?.length ?? raw.employers?.length ?? 0) + 1 ||
          defaults.counters.employmentContracts),
      employerContractFiles:
        raw.counters?.employerContractFiles ??
        ((raw.employerContractFiles?.length ?? 0) + 1 ||
          defaults.counters.employerContractFiles),
    },
  }
}

const ensureDataFile = async () => {
  await mkdir(path.dirname(dataFile), { recursive: true })

  try {
    await readFile(dataFile, 'utf8')
  } catch {
    if (configuredDataFile && path.resolve(dataFile) !== path.resolve(defaultDataFile)) {
      try {
        await readFile(defaultDataFile, 'utf8')
        await copyFile(defaultDataFile, dataFile)
        return
      } catch {
        // Fall back to generating a fresh empty dataset below.
      }
    }

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
  if (await migrateLegacyMediaInData(cache)) {
    await saveData(cache)
  }
  return cache
}

const saveData = async (data: AppData) => {
  cache = data
  const serialized = JSON.stringify({
    ...data,
    maids: data.maids.map(compactMaidRecordForStorage),
  })
  pendingSave = pendingSave.then(() =>
    writeFile(dataFile, serialized, 'utf8')
  )
  await pendingSave
}

export const initializeStore = async () => {
  await ensureDataFile()
  await loadData()
}

export const getStoreDiagnostics = async () => {
  const data = await loadData()
  return {
    storageMode: 'local-json' as const,
    dataFile,
    maidsCount: data.maids.length,
    clientsCount: data.clients.length,
    agencyAdminsCount: data.agencyAdmins.length,
  }
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

export const getMaidsStore = async (
  search?: string,
  visibility?: string,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  try {
    return await listMaidRecordsSql({ search, visibility, agencyId })
  } catch {
    // Fall back to the legacy local store when the database is unavailable.
  }

  const data = await loadData()
  let maids = data.maids.filter((maid) => maid.agencyId === agencyId)

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

export const getAllMaidsStore = async (
  search?: string,
  visibility?: string
) => {
  try {
    return await listMaidRecordsSql({ search, visibility })
  } catch {
    // Fall back to the legacy local store when the database is unavailable.
  }

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

export const getMaidsPageStore = async (options: {
  search?: string
  visibility?: string
  agencyId?: number
  offset?: number
  limit?: number
}) => {
  try {
    const [maids, total] = await Promise.all([
      listMaidRecordsPageSql(options),
      countMaidRecordsSql(options),
    ])
    return { maids, total }
  } catch {
    // Fall back to the legacy local store when the database is unavailable.
  }

  const allMaids =
    typeof options.agencyId === 'number'
      ? await getMaidsStore(options.search, options.visibility, options.agencyId)
      : await getAllMaidsStore(options.search, options.visibility)

  const offset = Math.max(0, options.offset ?? 0)
  const limit = options.limit
  const maids =
    typeof limit === 'number' && limit > 0
      ? allMaids.slice(offset, offset + limit)
      : allMaids.slice(offset)

  return {
    maids,
    total: allMaids.length,
  }
}

export const getMaidPhotosBatchStore = async (
  referenceCodes: string[],
  agencyId: number = DEFAULT_AGENCY_ID
): Promise<Record<string, string>> => {
  if (referenceCodes.length === 0) return {}
  try {
    return await getMaidPhotosBatchSql(referenceCodes, agencyId)
  } catch {
    // Fall back to the legacy local store when the database is unavailable.
  }
  const data = await loadData()
  const result: Record<string, string> = {}
  for (const maid of data.maids) {
    if (maid.agencyId === agencyId && referenceCodes.includes(maid.referenceCode)) {
      const primaryPhoto =
        (Array.isArray(maid.photoDataUrls) ? maid.photoDataUrls[0] : null) ||
        maid.photoDataUrl ||
        ''
      result[maid.referenceCode] = primaryPhoto
    }
  }
  return result
}

export const getMaidByReferenceCodeStore = async (
  referenceCode: string,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  try {
    const maid = await getMaidByReferenceCodeSql(referenceCode, { agencyId })
    if (maid) {
      return maid
    }
  } catch {
    // Fall back to the legacy local store when the database is unavailable.
  }

  const data = await loadData()
  return (
    data.maids.find(
      (maid) => maid.referenceCode === referenceCode && maid.agencyId === agencyId
    ) ?? null
  )
}

export const getPublicMaidByReferenceCodeStore = async (referenceCode: string) => {
  try {
    const maid = await getMaidByReferenceCodeSql(referenceCode, { publicOnly: true })
    if (maid) {
      return maid
    }
  } catch {
    // Fall back to the legacy local store when the database is unavailable.
  }

  const data = await loadData()
  return (
    data.maids.find(
      (maid) => maid.referenceCode === referenceCode && maid.isPublic
    ) ?? null
  )
}

export type MaidStorePayload = Omit<MaidRecord, 'id' | 'agencyId' | 'createdAt' | 'updatedAt'>

export const bulkUpsertMaidRecordsStore = async (
  records: MaidStorePayload[],
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  try {
    const persistedRecords = await Promise.all(
      records.map(async (record) => toSqlMaidPayload(await persistMaidMediaFields(record, agencyId)))
    )
    return await upsertMaidRecordsSql(persistedRecords, agencyId)
  } catch {
    // Fall back to the legacy local store when the database is unavailable.
  }

  const data = await loadData()
  let created = 0
  let updated = 0

  for (const record of records) {
    const index = data.maids.findIndex(
      (maid) => maid.referenceCode === record.referenceCode && maid.agencyId === agencyId
    )
    const persisted = await persistMaidMediaFields(record, agencyId)

    if (index === -1) {
      const newRecord: MaidRecord = {
        ...persisted,
        agencyId,
        status: persisted.status ?? 'available',
        id: data.counters.maids++,
        createdAt: now(),
        updatedAt: now(),
      }
      data.maids.unshift(newRecord)
      created += 1
    } else {
      data.maids[index] = {
        ...data.maids[index],
        ...persisted,
        agencyId,
        updatedAt: now(),
      }
      updated += 1
    }
  }

  await saveData(data)
  return { created, updated }
}

export const createMaidStore = async (
  maid: Omit<MaidRecord, 'id' | 'agencyId' | 'createdAt' | 'updatedAt'>,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const persistedMaid = await persistMaidMediaFields(maid, agencyId)

  try {
    return await createMaidSql(toSqlMaidPayload(persistedMaid), agencyId)
  } catch (error) {
    if (error instanceof Error && error.message === 'REFERENCE_CODE_EXISTS') {
      throw error
    }
    // Fall back to the legacy local store when the database is unavailable.
  }

  const data = await loadData()
  const existing = data.maids.find(
    (item) => item.referenceCode === maid.referenceCode && item.agencyId === agencyId
  )
  if (existing) {
    throw new Error('REFERENCE_CODE_EXISTS')
  }

  const record: MaidRecord = {
    ...persistedMaid,
    agencyId,
    status: persistedMaid.status ?? 'available',
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
  updates: Omit<MaidRecord, 'id' | 'agencyId' | 'createdAt' | 'updatedAt'>,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const persistedUpdates = await persistMaidMediaFields(updates, agencyId)

  try {
    const updated = await updateMaidSql(
      referenceCode,
      toSqlMaidPayload(persistedUpdates),
      agencyId
    )
    if (updated) {
      return updated
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'REFERENCE_CODE_EXISTS') {
      throw error
    }
    // Fall back to the legacy local store when the database is unavailable.
  }

  const data = await loadData()
  const index = data.maids.findIndex(
    (maid) => maid.referenceCode === referenceCode && maid.agencyId === agencyId
  )
  if (index === -1) return null

  const duplicate = data.maids.find(
    (maid) =>
      maid.referenceCode === updates.referenceCode &&
      maid.referenceCode !== referenceCode &&
      maid.agencyId === agencyId
  )
  if (duplicate) {
    throw new Error('REFERENCE_CODE_EXISTS')
  }

  data.maids[index] = {
    ...data.maids[index],
    ...persistedUpdates,
    agencyId,
    updatedAt: now(),
  }
  await saveData(data)
  return data.maids[index]
}

export const updateMaidVisibilityStore = async (
  referenceCode: string,
  isPublic: boolean,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const updated = await updateMaidVisibilitySql(referenceCode, isPublic, agencyId)
  if (updated) {
    return updated
  }

  const data = await loadData()
  const index = data.maids.findIndex(
    (maid) => maid.referenceCode === referenceCode && maid.agencyId === agencyId
  )
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
  photoDataUrl: string,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const persistedPhoto = await persistMaidMediaValue(
    photoDataUrl,
    agencyId,
    referenceCode,
    'photos',
    0
  )

  try {
    const updated = await updateMaidMediaSql(
      referenceCode,
      {
        photoDataUrls: persistedPhoto ? [persistedPhoto] : [],
        photoDataUrl: persistedPhoto,
        hasPhoto: Boolean(persistedPhoto),
      },
      agencyId
    )
    if (updated) {
      return updated
    }
  } catch {
    // Fall back to the legacy local store when the database is unavailable.
  }

  const data = await loadData()
  const index = data.maids.findIndex(
    (maid) => maid.referenceCode === referenceCode && maid.agencyId === agencyId
  )
  if (index === -1) return null
  data.maids[index] = {
    ...data.maids[index],
    photoDataUrls: persistedPhoto ? [persistedPhoto] : [],
    photoDataUrl: persistedPhoto,
    hasPhoto: Boolean(persistedPhoto),
    updatedAt: now(),
  }
  await saveData(data)
  return data.maids[index]
}

export const addMaidPhotoStore = async (
  referenceCode: string,
  photoDataUrl: string,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const persistNextPhotos = async (currentPhotos: string[]) => {
    const nextPhotos = [...currentPhotos]
    if (photoDataUrl) {
      if (nextPhotos.length >= 5) {
        throw new Error('PHOTO_LIMIT_REACHED')
      }
      nextPhotos.push(
        await persistMaidMediaValue(photoDataUrl, agencyId, referenceCode, 'photos', nextPhotos.length)
      )
    }
    return nextPhotos
  }

  try {
    const existing = await getMaidByReferenceCodeSql(referenceCode, { agencyId })
    if (existing) {
      const currentPhotos = Array.isArray(existing.photoDataUrls)
        ? existing.photoDataUrls
        : existing.photoDataUrl
        ? [existing.photoDataUrl]
        : []
      const nextPhotos = await persistNextPhotos(currentPhotos)
      const updated = await updateMaidMediaSql(
        referenceCode,
        {
          photoDataUrls: nextPhotos,
          photoDataUrl: nextPhotos[0] ?? '',
          hasPhoto: nextPhotos.length > 0,
        },
        agencyId
      )
      if (updated) {
        return updated
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'PHOTO_LIMIT_REACHED') {
      throw error
    }
    // Fall back to the legacy local store when the database is unavailable.
  }

  const data = await loadData()
  const index = data.maids.findIndex(
    (maid) => maid.referenceCode === referenceCode && maid.agencyId === agencyId
  )
  if (index === -1) return null
  const currentPhotos = Array.isArray(data.maids[index].photoDataUrls)
    ? data.maids[index].photoDataUrls
    : data.maids[index].photoDataUrl
    ? [data.maids[index].photoDataUrl]
    : []
  const nextPhotos = await persistNextPhotos(currentPhotos)
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

export const replaceMaidPhotosStore = async (
  referenceCode: string,
  photoDataUrls: string[],
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const normalizedPhotos = photoDataUrls
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, 5)

  const persistedPhotos = await Promise.all(
    normalizedPhotos.map((photo, photoIndex) =>
      persistMaidMediaValue(photo, agencyId, referenceCode, 'photos', photoIndex)
    )
  )

  try {
    const updated = await updateMaidMediaSql(
      referenceCode,
      {
        photoDataUrls: persistedPhotos,
        photoDataUrl: persistedPhotos[0] ?? '',
        hasPhoto: persistedPhotos.length > 0,
      },
      agencyId
    )
    if (updated) {
      return updated
    }
  } catch {
    // Fall back to the legacy local store when the database is unavailable.
  }

  const data = await loadData()
  const index = data.maids.findIndex(
    (maid) => maid.referenceCode === referenceCode && maid.agencyId === agencyId
  )
  if (index === -1) return null

  data.maids[index] = {
    ...data.maids[index],
    photoDataUrls: persistedPhotos,
    photoDataUrl: persistedPhotos[0] ?? '',
    hasPhoto: persistedPhotos.length > 0,
    updatedAt: now(),
  }
  await saveData(data)
  return data.maids[index]
}

export const updateMaidVideoStore = async (
  referenceCode: string,
  videoDataUrl: string,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const persistedVideo =
    typeof videoDataUrl === 'string' && videoDataUrl.trim().startsWith('data:')
      ? await persistMaidMediaValue(videoDataUrl, agencyId, referenceCode, 'videos', 0)
      : videoDataUrl

  try {
    const updated = await updateMaidMediaSql(
      referenceCode,
      {
        videoDataUrl: persistedVideo,
      },
      agencyId
    )
    if (updated) {
      return updated
    }
  } catch {
    // Fall back to the legacy local store when the database is unavailable.
  }

  const data = await loadData()
  const index = data.maids.findIndex(
    (maid) => maid.referenceCode === referenceCode && maid.agencyId === agencyId
  )
  if (index === -1) return null
  data.maids[index] = {
    ...data.maids[index],
    videoDataUrl: persistedVideo,
    updatedAt: now(),
  }
  await saveData(data)
  return data.maids[index]
}

export const deleteMaidStore = async (
  referenceCode: string,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  try {
    const deleted = await deleteMaidSql(referenceCode, agencyId)
    if (deleted) {
      return deleted
    }
  } catch {
    // Fall back to the legacy local store when the database is unavailable.
  }

  const data = await loadData()
  const existing = data.maids.find(
    (maid) => maid.referenceCode === referenceCode && maid.agencyId === agencyId
  )
  if (!existing) return null
  data.maids = data.maids.filter(
    (maid) => maid.referenceCode !== referenceCode || maid.agencyId !== agencyId
  )
  await saveData(data)
  return existing
}

export const getLegacyMaidSnapshotStore = async () => {
  const data = await loadData()
  return [...data.maids]
}

export const syncMaidsToSqlStore = async () => {
  const data = await loadData()
  if (data.maids.length === 0) {
    return { created: 0, updated: 0 }
  }

  const grouped = new Map<number, MaidStorePayload[]>()
  for (const maid of data.maids) {
    const group = grouped.get(maid.agencyId) ?? []
    group.push({
      fullName: maid.fullName,
      referenceCode: maid.referenceCode,
      status: maid.status ?? 'available',
      type: maid.type,
      nationality: maid.nationality,
      dateOfBirth: maid.dateOfBirth,
      placeOfBirth: maid.placeOfBirth,
      height: maid.height,
      weight: maid.weight,
      religion: maid.religion,
      maritalStatus: maid.maritalStatus,
      numberOfChildren: maid.numberOfChildren,
      numberOfSiblings: maid.numberOfSiblings,
      homeAddress: maid.homeAddress,
      airportRepatriation: maid.airportRepatriation,
      educationLevel: maid.educationLevel,
      languageSkills: maid.languageSkills,
      skillsPreferences: maid.skillsPreferences,
      workAreas: maid.workAreas,
      employmentHistory: maid.employmentHistory,
      introduction: maid.introduction,
      agencyContact: maid.agencyContact,
      photoDataUrls: maid.photoDataUrls,
      photoDataUrl: maid.photoDataUrl,
      videoDataUrl: maid.videoDataUrl,
      isPublic: maid.isPublic,
      hasPhoto: maid.hasPhoto,
    })
    grouped.set(maid.agencyId, group)
  }

  let created = 0
  let updated = 0

  for (const [agencyId, maids] of grouped) {
    const result = await upsertMaidRecordsSql(
      maids.map((maid) => toSqlMaidPayload(maid)),
      agencyId
    )
    created += result.created
    updated += result.updated
  }

  return { created, updated }
}

export const getEnquiriesStore = async (
  search?: string,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  const clientsById = new Map(data.clients.map((client) => [client.id, client] as const))
  const clientsByEmail = new Map(
    data.clients.map((client) => [client.email.trim().toLowerCase(), client] as const)
  )
  let enquiries = data.enquiries
    .filter((enquiry) => enquiry.agencyId === agencyId)
    .map((enquiry) => {
      const matchedClient =
        typeof enquiry.clientId === 'number' && enquiry.clientId > 0
          ? clientsById.get(enquiry.clientId) ?? null
          : clientsByEmail.get(enquiry.email.trim().toLowerCase()) ?? null

      return matchedClient
        ? {
            ...enquiry,
            clientId: matchedClient.id,
            clientName: matchedClient.name,
          }
        : enquiry
    })

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

export const getClientByEmailStore = async (email: string) => {
  const data = await loadData()
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return null
  return (
    data.clients.find(
      (client) => client.email.trim().toLowerCase() === normalizedEmail
    ) ?? null
  )
}

export const getClientsStore = async () => {
  const data = await loadData()
  return [...data.clients].sort((a, b) => b.id - a.id)
}

export const registerAgencyAdminStore = async (payload: {
  username: string
  email?: string
  password: string
  agencyName: string
  agencyId?: number
  role?: 'admin' | 'agency' | 'staff'
}) => {
  const data = await loadData()
  const agencyId = normalizeAgencyId(payload.agencyId)
  const normalizedUsername = payload.username.trim().toLowerCase()
  const normalizedEmail = payload.email?.trim().toLowerCase() || ''
  const existing = data.agencyAdmins.find((admin) => {
    const username =
      typeof (admin as { username?: unknown }).username === 'string'
        ? (admin as { username: string }).username.trim().toLowerCase()
        : ''
    const email =
      typeof (admin as { email?: unknown }).email === 'string'
        ? (admin as { email: string }).email.trim().toLowerCase()
        : ''
    return username === normalizedUsername || Boolean(normalizedEmail && email === normalizedEmail)
  })

  if (existing) {
    throw new Error(normalizedEmail ? 'AGENCY_ADMIN_EMAIL_EXISTS' : 'AGENCY_ADMIN_USERNAME_EXISTS')
  }

  const record: AgencyAdminRecord = {
    id: data.counters.agencyAdmins++,
    agencyId,
    username: payload.username,
    email: normalizedEmail || undefined,
    password: '',
    passwordHash: hashPassword(payload.password),
    role: payload.role ?? 'admin',
    agencyName: payload.agencyName,
    createdAt: now(),
  }

  data.agencyAdmins.unshift(record)
  await saveData(data)
  return record
}

export const authenticateAgencyAdminStore = async (
  usernameOrEmail: string,
  password: string
) => {
  const data = await loadData()
  const normalizedIdentifier = usernameOrEmail.trim().toLowerCase()
  return (
    data.agencyAdmins.find((admin) => {
      const recordUsername =
        typeof (admin as { username?: unknown }).username === 'string'
          ? (admin as { username: string }).username.trim().toLowerCase()
          : ''
      const recordEmail =
        typeof (admin as { email?: unknown }).email === 'string'
          ? (admin as { email: string }).email.trim().toLowerCase()
          : ''
      const identifierMatches =
        recordUsername === normalizedIdentifier || recordEmail === normalizedIdentifier
      const passwordMatches = admin.passwordHash
        ? verifyPassword(password, admin.passwordHash)
        : verifyPassword(password, admin.password)
      return identifierMatches && passwordMatches
    }) ?? null
  )
}

export const createAgencyAdminSessionStore = async (adminId: number) => {
  const session: AgencyAdminSessionRecord = {
    token: randomBytes(24).toString('hex'),
    adminId: Number(adminId),
    createdAt: now(),
  }

  const data = await loadData()
  data.agencyAdminSessions = [
    session,
    ...data.agencyAdminSessions.filter((item) => item.token !== session.token),
  ]
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
  const sessionAdminId = Number(session.adminId)
  if (!Number.isInteger(sessionAdminId)) {
    return null
  }
  return data.agencyAdmins.find((item) => Number(item.id) === sessionAdminId) ?? null
}

export const getAgencyAdminSessionByTokenStore = async (token: string) => {
  const data = await loadData()
  const session = data.agencyAdminSessions.find((item) => item.token === token)
  if (!session) {
    return null
  }

  const adminId = Number(session.adminId)
  if (!Number.isInteger(adminId)) {
    return null
  }

  return {
    ...session,
    adminId,
  }
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
    password: hashPassword(payload.password),
    emailVerified: false,
    emailConfirmationCode: '',
    emailConfirmationCodeCreatedAt: '',
    profileImageUrl: '',
    createdAt: now(),
  }

  data.clients.unshift(record)
  await saveData(data)
  return record
}

export const setClientEmailConfirmationCodeStore = async (email: string) => {
  const data = await loadData()
  const normalizedEmail = email.trim().toLowerCase()
  const client = data.clients.find(
    (item) => item.email.trim().toLowerCase() === normalizedEmail
  )
  if (!client) return null

  const code = generateEmailConfirmationCode()
  client.emailConfirmationCode = code
  client.emailConfirmationCodeCreatedAt = now()
  await saveData(data)
  return { client, code }
}

export const confirmClientEmailStore = async (email: string, code: string) => {
  const data = await loadData()
  const normalizedEmail = email.trim().toLowerCase()
  const client = data.clients.find(
    (item) => item.email.trim().toLowerCase() === normalizedEmail
  )
  if (!client) return { ok: false as const, error: 'Client not found' }

  const stored = String(client.emailConfirmationCode || '').trim()
  if (!stored) return { ok: false as const, error: 'No confirmation code found' }
  if (stored !== code.trim()) return { ok: false as const, error: 'Invalid confirmation code' }

  const createdAt = client.emailConfirmationCodeCreatedAt
    ? new Date(client.emailConfirmationCodeCreatedAt)
    : null
  if (createdAt && Number.isFinite(createdAt.getTime())) {
    const ageMs = Date.now() - createdAt.getTime()
    if (ageMs > 15 * 60 * 1000) {
      return { ok: false as const, error: 'Confirmation code expired' }
    }
  }

  client.emailVerified = true
  client.emailConfirmationCode = ''
  client.emailConfirmationCodeCreatedAt = ''
  await saveData(data)
  return { ok: true as const, client }
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
        verifyPassword(password, client.password)
    ) ?? null
  )
}

export const createClientSessionStore = async (clientId: number) => {
  const data = await loadData()
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
  const companyFromMeta = (user.user_metadata?.company as string | undefined) ?? ''
  const phoneFromMeta = (user.user_metadata?.phone as string | undefined) ?? ''

  const client: ClientRecord = {
    id: data.counters.clients++,
    supabaseUserId: user.id,
    name: nameFromMeta || (user.email ? user.email.split('@')[0] : 'Client'),
    company: companyFromMeta.trim(),
    phone: (user.phone || phoneFromMeta).trim(),
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

export const getClientOptionsStore = async (agencyId: number = DEFAULT_AGENCY_ID) => {
  const directSales = await getDirectSalesStore(agencyId)
  const clientIds = new Set(directSales.map((sale) => sale.clientId).filter(Boolean))
  const clients = await getClientsStore()
  return clients
    .filter((client) => clientIds.has(client.id))
    .map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      company: client.company || '',
      phone: client.phone || '',
      enquiryDate: client.createdAt,
    }))
}

export const getDirectSalesStore = async (agencyId: number = DEFAULT_AGENCY_ID) => {
  const data = await loadData()
  return data.directSales
    .filter((sale) => sale.agencyId === agencyId)
    .sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export const getAllDirectSalesStore = async () => {
  const data = await loadData()
  return [...data.directSales].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export const getAgencySummariesStore = async () => {
  const data = await loadData()
  const maidsByAgency = new Map<number, MaidRecord[]>()

  data.maids.forEach((maid) => {
    const current = maidsByAgency.get(maid.agencyId) ?? []
    current.push(maid)
    maidsByAgency.set(maid.agencyId, current)
  })

  const uniqueAgencies = new Map<
    number,
    { id: number; name: string; email: string; createdAt: string }
  >()

  data.agencyAdmins.forEach((admin) => {
    if (!uniqueAgencies.has(admin.agencyId)) {
      uniqueAgencies.set(admin.agencyId, {
        id: admin.agencyId,
        name: admin.agencyName || `Agency ${admin.agencyId}`,
        email: admin.email ?? '',
        createdAt: admin.createdAt,
      })
    }
  })

  return Array.from(uniqueAgencies.values())
    .map((agency) => {
      const maids = maidsByAgency.get(agency.id) ?? []
      return {
        ...agency,
        totalMaids: maids.length,
        publicMaids: maids.filter((maid) => maid.isPublic).length,
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}

export const getAgencyNameByIdStore = async (agencyId: number) => {
  const agencies = await getAgencySummariesStore()
  return agencies.find((agency) => agency.id === agencyId)?.name ?? `Agency ${agencyId}`
}

export const getAgencyAdminsStore = async () => {
  const data = await loadData()
  return [...data.agencyAdmins]
}

const getAgencyAvatarForSupport = (data: AppData, agencyId: number) =>
  data.agencyAdmins.find(
    (item) =>
      normalizeAgencyId(item.agencyId) === normalizeAgencyId(agencyId) &&
      item.profileImageUrl?.trim()
  )?.profileImageUrl ??
  data.companyProfile.logo_data_url ??
  ''

const getSupportConversationByContext = (
  data: AppData,
  clientId: number,
  conversationType: 'support' | 'agency',
  agencyId: number
) =>
  data.supportConversations.find(
    (conversation) =>
      conversation.clientId === clientId &&
      conversation.conversationType === conversationType &&
      conversation.agencyId === normalizeAgencyId(agencyId)
  ) ?? null

const ensureSupportConversationRecord = (
  data: AppData,
  payload: {
    clientId: number
    conversationType: 'support' | 'agency'
    agencyId?: number
    agencyName?: string
    initialMessage: string
    senderRole: 'client' | 'agency'
  }
) => {
  const agencyId = normalizeAgencyId(payload.agencyId)
  const existing = getSupportConversationByContext(
    data,
    payload.clientId,
    payload.conversationType,
    agencyId
  )
  if (existing) {
    return existing
  }

  const category = inferSupportCategory(payload.initialMessage)
  const conversation: SupportConversationRecord = {
    id: data.counters.supportConversations++,
    clientId: payload.clientId,
    conversationType: payload.conversationType,
    agencyId,
    agencyName: payload.agencyName ?? '',
    subject: buildSupportConversationSubject(
      payload.conversationType,
      category,
      payload.agencyName
    ),
    description:
      payload.conversationType === 'agency'
        ? 'Direct conversation with agency support.'
        : 'General support and follow-up for client inquiries.',
    status: payload.senderRole === 'client' ? 'WAITING_SUPPORT' : 'WAITING_CLIENT',
    category,
    priority: inferSupportPriority(payload.initialMessage),
    lastMessageAt: now(),
    lastMessagePreview: '',
    unreadClient: 0,
    unreadAdmin: 0,
    createdAt: now(),
    updatedAt: now(),
  }

  data.supportConversations.push(conversation)
  return conversation
}

const syncLegacyChatMessageFromSupport = (
  data: AppData,
  message: SupportMessageRecord
) => {
  const existing = data.chatMessages.find((record) => record.id === message.id)
  const legacy: ChatMessageRecord = {
    id: message.id,
    clientId: message.clientId,
    conversationType: message.conversationType,
    agencyId: message.agencyId,
    agencyName: message.agencyName ?? '',
    senderRole: message.senderRole,
    senderName: message.senderName,
    message: message.message,
    createdAt: message.createdAt,
    readByAgency: message.senderRole === 'agency',
    readByClient: message.senderRole === 'client',
  }

  if (existing) {
    Object.assign(existing, legacy)
  } else {
    data.chatMessages.push(legacy)
  }
}

export const getChatMessagesForClientStore = async (
  clientId: number,
  conversationType: 'support' | 'agency' = 'support',
  agencyId: number = DEFAULT_AGENCY_ID,
  options?: { before?: number; limit?: number }
) => {
  const data = await loadData()
  const client = data.clients.find((item) => item.id === clientId)
  if (!client) {
    throw new Error('CLIENT_NOT_FOUND')
  }
  const resolvedAgencyId = normalizeAgencyId(agencyId)
  const agencyProfileImageUrl = getAgencyAvatarForSupport(data, resolvedAgencyId)
  const conversation = getSupportConversationByContext(
    data,
    clientId,
    conversationType,
    resolvedAgencyId
  )
  if (!conversation) return []

  const pageSize = Math.min(options?.limit ?? 200, 200)
  const beforeId = options?.before

  const messages = data.supportMessages
    .filter((message) => {
      if (message.conversationId !== conversation.id) return false
      if (typeof beforeId === 'number' && message.id >= beforeId) return false
      return true
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return messages
    .slice(-pageSize)
    .map((message) => ({
      ...message,
      clientProfileImageUrl: client.profileImageUrl ?? '',
      agencyProfileImageUrl,
    }))
}

export const getLatestChatMessageIdForClientStore = async (clientId: number) => {
  const data = await loadData()
  return data.supportMessages
    .filter((message) => message.clientId === clientId)
    .reduce((maxId, message) => Math.max(maxId, message.id), 0)
}

export const getLatestChatMessageIdForAgencyStore = async (
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  return data.supportMessages
    .filter((message) => message.agencyId === agencyId)
    .reduce((maxId, message) => Math.max(maxId, message.id), 0)
}

export const getChatMessagesAfterIdForClientStore = async (
  clientId: number,
  afterId: number,
  options?: {
    includeAll?: boolean
    conversationType?: 'support' | 'agency'
    agencyId?: number
  }
) => {
  const data = await loadData()
  const conversationType = options?.conversationType ?? 'support'
  const agencyId = normalizeAgencyId(options?.agencyId)
  const client = data.clients.find((item) => item.id === clientId)
  const agencyProfileImageUrl = getAgencyAvatarForSupport(data, agencyId)
  const scopedConversation = getSupportConversationByContext(
    data,
    clientId,
    conversationType,
    agencyId
  )

  return data.supportMessages
    .filter((message) => {
      if (message.clientId !== clientId || message.id <= afterId) return false
      if (options?.includeAll) return true
      return scopedConversation ? message.conversationId === scopedConversation.id : false
    })
    .sort((a, b) => a.id - b.id)
    .map((message) => ({
      ...message,
      clientProfileImageUrl: client?.profileImageUrl ?? '',
      agencyProfileImageUrl,
    }))
}

export const getChatMessagesAfterIdForAgencyStore = async (
  agencyId: number,
  afterId: number
) => {
  const data = await loadData()
  const resolvedAgencyId = normalizeAgencyId(agencyId)
  const agencyProfileImageUrl = getAgencyAvatarForSupport(data, resolvedAgencyId)
  const clientsById = new Map(data.clients.map((client) => [client.id, client] as const))
  return data.supportMessages
    .filter((message) => message.agencyId === resolvedAgencyId && message.id > afterId)
    .sort((a, b) => a.id - b.id)
    .map((message) => {
      const client = clientsById.get(message.clientId)
      return {
        ...message,
        clientProfileImageUrl: client?.profileImageUrl ?? '',
        agencyProfileImageUrl,
      }
    })
}

export const getAgencyChatbotConfigStore = async (
  agencyId: number = DEFAULT_AGENCY_ID,
  agencyName?: string
) => {
  const data = await loadData()
  const normalizedAgencyId = normalizeAgencyId(agencyId)
  const existing = data.agencyChatbotConfigs.find(
    (config) => config.agencyId === normalizedAgencyId
  )
  return normalizeAgencyChatbotConfig(existing, normalizedAgencyId, agencyName)
}

export const upsertAgencyChatbotConfigStore = async (
  agencyId: number,
  payload: Partial<AgencyChatbotConfigRecord>,
  agencyName?: string
) => {
  const data = await loadData()
  const normalizedAgencyId = normalizeAgencyId(agencyId)
  const existing = data.agencyChatbotConfigs.find(
    (config) => config.agencyId === normalizedAgencyId
  )
  const next = normalizeAgencyChatbotConfig(
    {
      ...(existing ?? buildDefaultAgencyChatbotConfig(normalizedAgencyId, agencyName)),
      ...payload,
      agencyId: normalizedAgencyId,
      updatedAt: now(),
    },
    normalizedAgencyId,
    agencyName
  )

  data.agencyChatbotConfigs = existing
    ? data.agencyChatbotConfigs.map((config) =>
        config.agencyId === normalizedAgencyId ? next : config
      )
    : [...data.agencyChatbotConfigs, next]

  await saveData(data)
  return next
}

// ─── Presence (in-memory; the dev backend is a single process) ──────────────
const PRESENCE_WINDOW_MS = 40_000
const presenceLastSeen = new Map<string, { lastSeen: number; agencyId?: number }>()
const presenceKey = (actorType: 'client' | 'admin', actorId: number) =>
  `${actorType}:${actorId}`

// Purge stale presence entries every minute to prevent unbounded Map growth
setInterval(() => {
  const cutoff = Date.now() - PRESENCE_WINDOW_MS
  for (const [key, entry] of presenceLastSeen) {
    if (entry.lastSeen < cutoff) presenceLastSeen.delete(key)
  }
}, 60_000).unref()

export const touchPresenceStore = (
  actorType: 'client' | 'admin',
  actorId: number,
  agencyId?: number
) => {
  presenceLastSeen.set(presenceKey(actorType, actorId), {
    lastSeen: Date.now(),
    agencyId,
  })
}

export const setPresenceOfflineStore = (
  actorType: 'client' | 'admin',
  actorId: number
) => {
  presenceLastSeen.delete(presenceKey(actorType, actorId))
}

export const isClientOnlineStore = (clientId: number) => {
  const entry = presenceLastSeen.get(presenceKey('client', clientId))
  return Boolean(entry && Date.now() - entry.lastSeen < PRESENCE_WINDOW_MS)
}

export const isAgencyOnlineStore = (agencyId: number) => {
  const now = Date.now()
  for (const [key, entry] of presenceLastSeen) {
    if (!key.startsWith('admin:')) continue
    if (now - entry.lastSeen >= PRESENCE_WINDOW_MS) continue
    if (entry.agencyId == null || entry.agencyId === agencyId) return true
  }
  return false
}

export const getChatConversationsStore = async (
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  const resolvedAgencyId = normalizeAgencyId(agencyId)
  const agencyProfileImageUrl = getAgencyAvatarForSupport(data, resolvedAgencyId)
  const clientsById = new Map(data.clients.map((client) => [client.id, client] as const))
  return data.supportConversations
    .filter((conversation) => conversation.agencyId === resolvedAgencyId)
    .map((conversation) => {
      const client = clientsById.get(conversation.clientId)
      if (!client) return null
      return {
        key: buildSupportConversationKey(
          conversation.clientId,
          conversation.conversationType,
          conversation.agencyId
        ),
        id: conversation.id,
        clientId: client.id,
        conversationType: conversation.conversationType,
        agencyId: conversation.agencyId,
        agencyName: conversation.agencyName || '',
        clientName: client.name,
        clientEmail: client.email,
        clientCompany: client.company || '',
        clientProfileImageUrl: client.profileImageUrl ?? '',
        agencyProfileImageUrl,
        lastMessage: conversation.lastMessagePreview,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: conversation.unreadAdmin,
        unreadAdmin: conversation.unreadAdmin,
        unreadClient: conversation.unreadClient,
        status: conversation.status,
        category: conversation.category,
        priority: conversation.priority,
        assignedAdminId: conversation.assignedAdminId,
        assignedAdminName: conversation.assignedAdminName,
        subject: conversation.subject,
        description: conversation.description,
        clientOnline: isClientOnlineStore(client.id),
      }
    })
    .filter(
      (
        conversation
      ): conversation is NonNullable<typeof conversation> => Boolean(conversation)
    )
    .sort(
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
  const conversation = ensureSupportConversationRecord(data, {
    clientId: payload.clientId,
    conversationType: payload.conversationType,
    agencyId: payload.agencyId,
    agencyName: payload.agencyName,
    initialMessage: payload.message,
    senderRole: payload.senderRole,
  })
  const timestamp = now()
  const record: SupportMessageRecord = {
    id: data.counters.supportMessages++,
    conversationId: conversation.id,
    clientId: payload.clientId,
    conversationType: payload.conversationType,
    agencyId: normalizeAgencyId(payload.agencyId),
    agencyName: payload.agencyName ?? '',
    senderRole: payload.senderRole,
    senderName: payload.senderName,
    message: trimSupportText(payload.message),
    attachments: [],
    createdAt: timestamp,
  }

  conversation.lastMessageAt = timestamp
  conversation.updatedAt = timestamp
  conversation.lastMessagePreview = record.message.slice(0, 160)
  conversation.category =
    conversation.category === DEFAULT_SUPPORT_CATEGORY
      ? inferSupportCategory(record.message)
      : conversation.category
  conversation.priority =
    inferSupportPriority(record.message) === 'URGENT'
      ? 'URGENT'
      : conversation.priority === 'LOW'
      ? inferSupportPriority(record.message)
      : conversation.priority
  conversation.status = payload.senderRole === 'client' ? 'WAITING_SUPPORT' : 'WAITING_CLIENT'
  conversation.resolvedAt = undefined
  conversation.closedAt = undefined
  if (payload.senderRole === 'client') {
    conversation.unreadAdmin += 1
  } else {
    conversation.unreadClient += 1
  }

  data.supportMessages.push(record)
  syncLegacyChatMessageFromSupport(data, record)
  data.supportNotifications.push({
    id: data.counters.supportNotifications++,
    conversationId: conversation.id,
    messageId: record.id,
    clientId: payload.clientId,
    agencyId: conversation.agencyId,
    recipientType: payload.senderRole === 'client' ? 'admin' : 'client',
    title:
      payload.senderRole === 'client'
        ? 'New client support message'
        : 'Support replied to your inquiry',
    body: record.message.slice(0, 180),
    createdAt: timestamp,
  })
  await saveData(data)
  return record
}

export const markChatMessagesReadForAgencyStore = async (
  clientId: number,
  conversationType: 'support' | 'agency' = 'support',
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  const conversation = getSupportConversationByContext(
    data,
    clientId,
    conversationType,
    agencyId
  )
  if (conversation) {
    conversation.unreadAdmin = 0
    conversation.adminLastReadAt = now()
    data.supportNotifications = data.supportNotifications.map((notification) =>
      notification.conversationId === conversation.id &&
      notification.recipientType === 'admin' &&
      !notification.readAt
        ? { ...notification, readAt: conversation.adminLastReadAt }
        : notification
    )
  }
  data.chatMessages = data.chatMessages.map((message) =>
    message.clientId === clientId &&
    message.senderRole === 'client' &&
    message.conversationType === conversationType &&
    message.agencyId === agencyId
      ? { ...message, readByAgency: true }
      : message
  )
  await saveData(data)
}

export const markChatMessagesReadForClientStore = async (
  clientId: number,
  conversationType: 'support' | 'agency' = 'support',
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  const conversation = getSupportConversationByContext(
    data,
    clientId,
    conversationType,
    agencyId
  )
  if (conversation) {
    conversation.unreadClient = 0
    conversation.clientLastReadAt = now()
    data.supportNotifications = data.supportNotifications.map((notification) =>
      notification.conversationId === conversation.id &&
      notification.recipientType === 'client' &&
      !notification.readAt
        ? { ...notification, readAt: conversation.clientLastReadAt }
        : notification
    )
  }
  data.chatMessages = data.chatMessages.map((message) =>
    message.clientId === clientId &&
    message.senderRole === 'agency' &&
    message.conversationType === conversationType &&
    message.agencyId === agencyId
      ? { ...message, readByClient: true }
      : message
  )
  await saveData(data)
}

export const getUnreadAgencyChatCountStore = async (
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  return data.supportConversations
    .filter((conversation) => conversation.agencyId === normalizeAgencyId(agencyId))
    .reduce((sum, conversation) => sum + conversation.unreadAdmin, 0)
}

export const createDirectSaleStore = async (
  maidReferenceCode: string,
  clientId: number,
  status: string = 'pending',
  formData?: Record<string, string>,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()

  // ── GENERAL REQUEST ──────────────────────────────────────────────────────────
  // Submitted from ClientRequestsPage — no specific maid, client may not exist
  // in the local store (they may be a Supabase-only user or a guest).
  const isGeneral = maidReferenceCode.trim().toUpperCase() === 'GENERAL'

  if (isGeneral) {
    const client = clientId ? data.clients.find((item) => item.id === clientId) : null

    const record: DirectSaleRecord = {
      id: data.counters.directSales++,
      agencyId,
      maidReferenceCode: 'GENERAL',
      maidName: '',
      clientId: client?.id ?? 0,
      clientName: formData?.clientName ?? client?.name ?? '',
      clientEmail: formData?.clientEmail ?? client?.email ?? '',
      clientPhone: formData?.clientPhone ?? client?.phone ?? '',
      status,
      requestType: 'general',
      maidReferences: [],
      formData,
      createdAt: now(),
      updatedAt: now(),
      updatedBy: client?.id ? `client:${client.id}` : 'client:guest',
    }

    data.directSales.unshift(record)
    await saveData(data)
    return { directSale: record, maid: null }
  }

  // ── SPECIFIC MAID REQUEST ────────────────────────────────────────────────────
  const maidIndex = data.maids.findIndex(
    (maid) => maid.referenceCode === maidReferenceCode && maid.agencyId === agencyId
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
    agencyId,
    maidReferenceCode,
    maidName: data.maids[maidIndex].fullName,
    clientId: client.id,
    clientName: client.name,
    clientEmail: client.email,
    clientPhone: client.phone || '',
    status,
    requestType: 'direct',
    maidReferences: [maidReferenceCode],
    formData,
    createdAt: now(),
    updatedAt: now(),
    updatedBy: `client:${client.id}`,
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

const ensureRequestConversationForSale = (
  data: AppData,
  sale: DirectSaleRecord
): RequestConversationRecord => {
  const requestId = String(sale.id)
  const existing = data.requestConversations.find(
    (conversation) => conversation.requestId === requestId
  )

  if (existing) {
    return existing
  }

  const conversation: RequestConversationRecord = {
    id: randomUUID(),
    requestId,
    agencyId: normalizeAgencyId(sale.agencyId),
    clientId: Number(sale.clientId) || 0,
    createdAt: sale.createdAt ?? now(),
  }

  data.requestConversations.push(conversation)
  return conversation
}

const ensureInitialRequestSystemMessage = (
  data: AppData,
  conversation: RequestConversationRecord,
  text = 'Your request has been received. Our agency will review it shortly.'
) => {
  const hasMessages = data.requestMessages.some(
    (message) => message.conversationId === conversation.id
  )
  if (hasMessages) {
    return
  }

  data.requestMessages.push({
    id: randomUUID(),
    conversationId: conversation.id,
    senderType: 'system',
    senderId: 0,
    message: text,
    createdAt: now(),
  })
}

export const ensureRequestConversationStore = async (
  requestId: string,
  systemMessage = 'Your request has been received. Our agency will review it shortly.'
) => {
  const data = await loadData()
  const sale = data.directSales.find((item) => String(item.id) === String(requestId).trim())
  if (!sale) {
    return null
  }

  const conversation = ensureRequestConversationForSale(data, sale)
  ensureInitialRequestSystemMessage(data, conversation, systemMessage)
  await saveData(data)
  return conversation
}

export const getRequestConversationByIdStore = async (conversationId: string) => {
  const data = await loadData()
  return (
    data.requestConversations.find((conversation) => conversation.id === conversationId) ?? null
  )
}

export const getRequestMessagesStore = async (conversationId: string) => {
  const data = await loadData()
  return data.requestMessages
    .filter((message) => message.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export const createRequestMessageStore = async (payload: {
  conversationId: string
  senderType: RequestMessageRecord['senderType']
  senderId: number
  message: string
  attachments?: unknown
}) => {
  const data = await loadData()
  const conversation = data.requestConversations.find(
    (item) => item.id === payload.conversationId
  )
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }

  const record: RequestMessageRecord = {
    id: randomUUID(),
    conversationId: conversation.id,
    senderType: payload.senderType,
    senderId: Number.isInteger(payload.senderId) ? payload.senderId : 0,
    message: payload.message.trim(),
    createdAt: now(),
    ...(payload.attachments !== undefined ? { attachments: payload.attachments } : {}),
  }

  data.requestMessages.push(record)
  await saveData(data)
  return record
}

export const updateDirectSaleStatusStore = async (
  id: number,
  status: string,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  const directSaleIndex = data.directSales.findIndex(
    (item) => item.id === id && item.agencyId === agencyId
  )
  if (directSaleIndex === -1) {
    return null
  }

  data.directSales[directSaleIndex] = {
    ...data.directSales[directSaleIndex],
    status,
    updatedAt: now(),
  }

  const maidIndex = data.maids.findIndex(
    (maid) =>
      maid.referenceCode === data.directSales[directSaleIndex].maidReferenceCode &&
      maid.agencyId === agencyId
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
          (maid) =>
            maid.referenceCode === sale.maidReferenceCode &&
            maid.agencyId === sale.agencyId
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

  const conversations = data.supportConversations
    .filter((conversation) => conversation.clientId === clientId)
    .map((conversation) => ({
      key: `${conversation.conversationType}:${conversation.agencyId ?? 0}`,
      id: conversation.id,
      clientId,
      conversationType: conversation.conversationType,
      agencyId: conversation.agencyId,
      agencyName: conversation.agencyName || '',
      clientProfileImageUrl: client.profileImageUrl ?? '',
      agencyProfileImageUrl: getAgencyAvatarForSupport(data, conversation.agencyId),
      title:
        conversation.conversationType === 'agency'
          ? conversation.agencyName || 'Agency'
          : 'Agency Support',
      description:
        conversation.description ||
        (conversation.conversationType === 'agency'
          ? 'Direct chat with agency'
          : 'General help, follow-up, and request support'),
      lastMessage: conversation.lastMessagePreview,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: conversation.unreadClient,
      unreadAdmin: conversation.unreadAdmin,
      unreadClient: conversation.unreadClient,
      status: conversation.status,
      category: conversation.category,
      priority: conversation.priority,
      assignedAdminId: conversation.assignedAdminId,
      assignedAdminName: conversation.assignedAdminName,
      subject: conversation.subject,
      agencyOnline: isAgencyOnlineStore(conversation.agencyId),
    }))

  if (!conversations.some((conversation) => conversation.key === 'support:1')) {
    conversations.push({
      id: 0,
      key: 'support:1',
      clientId,
      conversationType: 'support',
      agencyId: DEFAULT_AGENCY_ID,
      agencyName: '',
      clientProfileImageUrl: client.profileImageUrl ?? '',
      agencyProfileImageUrl:
        data.companyProfile.logo_data_url ??
        data.agencyAdmins.find((item) => item.profileImageUrl?.trim())?.profileImageUrl ??
        '',
      title: 'Agency Support',
      description: 'General help, follow-up, and request support',
      lastMessage: '',
      lastMessageAt: client.createdAt,
      unreadCount: 0,
      unreadAdmin: 0,
      unreadClient: 0,
      status: 'OPEN',
      category: 'General Inquiry',
      priority: 'MEDIUM',
      subject: 'Agency Support · General Inquiry',
      assignedAdminId: undefined,
      assignedAdminName: '',
      agencyOnline: isAgencyOnlineStore(DEFAULT_AGENCY_ID),
    })
  }

  return conversations.sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  )
}

export const getUnreadChatCountForAdminStore = async (
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const conversations = await getChatConversationsStore(agencyId)
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

export const updateSupportConversationStore = async (
  clientId: number,
  conversationType: 'support' | 'agency',
  agencyId: number,
  updates: Partial<
    Pick<
      SupportConversationRecord,
      | 'status'
      | 'category'
      | 'priority'
      | 'assignedAdminId'
      | 'assignedAdminName'
      | 'subject'
      | 'description'
    >
  >
) => {
  const data = await loadData()
  const conversation = getSupportConversationByContext(
    data,
    clientId,
    conversationType,
    agencyId
  )
  if (!conversation) return null

  if (updates.status) {
    conversation.status = normalizeSupportConversationStatus(updates.status)
    if (conversation.status === 'RESOLVED') {
      conversation.resolvedAt = now()
    }
    if (conversation.status === 'CLOSED') {
      conversation.closedAt = now()
    }
  }
  if (updates.category) {
    conversation.category = normalizeSupportConversationCategory(updates.category)
  }
  if (updates.priority) {
    conversation.priority = normalizeSupportPriority(updates.priority)
  }
  if (typeof updates.assignedAdminId !== 'undefined') {
    conversation.assignedAdminId = updates.assignedAdminId
  }
  if (typeof updates.assignedAdminName !== 'undefined') {
    conversation.assignedAdminName = updates.assignedAdminName
  }
  if (typeof updates.subject === 'string' && updates.subject.trim()) {
    conversation.subject = updates.subject.trim()
  }
  if (typeof updates.description === 'string') {
    conversation.description = updates.description.trim()
  }
  conversation.updatedAt = now()
  await saveData(data)
  return conversation
}

export const getSupportNotificationsStore = async (options: {
  recipientType: 'client' | 'admin'
  clientId?: number
  agencyId?: number
  unreadOnly?: boolean
}) => {
  const data = await loadData()
  return data.supportNotifications
    .filter((notification) => {
      if (notification.recipientType !== options.recipientType) return false
      if (typeof options.clientId === 'number' && notification.clientId !== options.clientId) {
        return false
      }
      if (typeof options.agencyId === 'number' && notification.agencyId !== options.agencyId) {
        return false
      }
      if (options.unreadOnly && notification.readAt) return false
      return true
    })
    .sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .map((notification) => {
      const conversation =
        data.supportConversations.find(
          (item) => item.id === notification.conversationId
        ) ?? null
      const client =
        conversation
          ? data.clients.find((item) => item.id === conversation.clientId) ?? null
          : data.clients.find((item) => item.id === notification.clientId) ?? null

      return {
        ...notification,
        conversationType: conversation?.conversationType ?? 'support',
        agencyName: conversation?.agencyName ?? '',
        clientName: client?.name ?? '',
        clientEmail: client?.email ?? '',
        status: conversation?.status ?? 'OPEN',
        category: conversation?.category ?? 'General Inquiry',
        priority: conversation?.priority ?? 'MEDIUM',
        subject: conversation?.subject ?? '',
      }
    })
}

export const getClientHistoryStore = async (clientId: number) => {
  const data = await loadData()

  return data.directSales
    .filter((sale) => sale.clientId === clientId)
    .map((sale) => ({
      directSale: sale,
      maid:
        data.maids.find(
          (maid) =>
            maid.referenceCode === sale.maidReferenceCode &&
            maid.agencyId === sale.agencyId
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

  return updateDirectSaleStatusStore(id, status, sale.agencyId)
}

export const getDirectSaleByIdStore = async (
  id: number,
  agencyId?: number
) => {
  const data = await loadData()
  return (
    data.directSales.find(
      (item) => item.id === id && (agencyId == null || item.agencyId === agencyId)
    ) ?? null
  )
}

export const updateDirectSaleMaidsStore = async (
  id: number,
  maidReferences: string[],
  updatedBy: string,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  const directSaleIndex = data.directSales.findIndex(
    (item) => item.id === id && item.agencyId === agencyId
  )
  if (directSaleIndex === -1) {
    return null
  }

  const normalizedReferences = maidReferences.filter((item) => item.trim().length > 0)
  const firstReference = normalizedReferences[0] ?? 'GENERAL'
  const matchedMaid =
    firstReference === 'GENERAL'
      ? null
      : data.maids.find(
          (maid) => maid.referenceCode === firstReference && maid.agencyId === agencyId
        ) ?? null

  data.directSales[directSaleIndex] = {
    ...data.directSales[directSaleIndex],
    maidReferences: normalizedReferences,
    maidReferenceCode: firstReference,
    maidName: matchedMaid?.fullName ?? data.directSales[directSaleIndex].maidName ?? '',
    requestType: normalizedReferences.length > 0 ? 'direct' : 'general',
    updatedAt: now(),
    updatedBy,
  }

  await saveData(data)
  return data.directSales[directSaleIndex]
}

export const addEnquiryStore = async (
  payload: Omit<EnquiryRecord, 'id' | 'agencyId' | 'createdAt'>,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  const record: EnquiryRecord = {
    ...payload,
    agencyId,
    id: data.counters.enquiries++,
    createdAt: now(),
  }
  data.enquiries.unshift(record)
  await saveData(data)
  return record
}

export const deleteEnquiryStore = async (
  id: number,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  const existing = data.enquiries.find(
    (item) => item.id === id && item.agencyId === agencyId
  )
  if (!existing) return null
  data.enquiries = data.enquiries.filter(
    (item) => item.id !== id || item.agencyId !== agencyId
  )
  await saveData(data)
  return existing
}

const formatEmployerRefCode = (value: number) => String(value).padStart(5, '0')

export const getEmployerContractsStore = async (
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  const summaries = data.employmentContracts
    .filter((item) => normalizeAgencyId(item.agencyId) === agencyId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((item) => ({
      refCode: item.refCode,
      agencyId,
      maid: item.maidSnapshot ?? {},
      agency: {
        contractDate: item.contractDate,
        caseReferenceNumber: item.caseReferenceNumber,
        serviceFee: item.serviceFee,
        placementFee: item.placementFee,
        agencyWitness: item.agencyWitness,
      },
      employer: item.employerSnapshot ?? {},
      spouse: {},
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))

  if (summaries.length > 0) {
    return summaries
  }

  return data.employers
    .filter((item) => item.agencyId === agencyId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export const getEmployerContractStore = async (
  refCode: string,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  const code = String(refCode || '').trim()
  if (!code) return null
  return (
    data.employers.find((item) => item.refCode === code && item.agencyId === agencyId) ?? null
  )
}

export const saveEmployerContractStore = async (payload: {
  refCode?: string | null
  maid?: Record<string, unknown>
  agency?: Record<string, unknown>
  employer?: Record<string, unknown>
  spouse?: Record<string, unknown>
  familyMembers?: Array<Record<string, unknown>>
  notificationDate?: Record<string, unknown>
  documents?: Array<{
    category?: string
    fileUrl?: string
    fileName?: string
  }>
}, agencyId: number = DEFAULT_AGENCY_ID) => {
  const data = await loadData()
  const agencyPayload =
    payload.agency && typeof payload.agency === 'object' ? payload.agency : {}
  const maidPayload =
    payload.maid && typeof payload.maid === 'object' ? payload.maid : {}
  const employerPayload =
    payload.employer && typeof payload.employer === 'object' ? payload.employer : {}

  const incomingRef =
    String(payload.refCode ?? '').trim() ||
    toTrimmedString((agencyPayload as { caseReferenceNumber?: unknown }).caseReferenceNumber)
  const index = incomingRef
    ? data.employers.findIndex(
        (item) => item.refCode === incomingRef && item.agencyId === agencyId
      )
    : -1
  const id = index === -1 ? data.counters.employers++ : data.employers[index].id
  const refCode = incomingRef || formatEmployerRefCode(id)
  const normalizedAgency = {
    ...agencyPayload,
    caseReferenceNumber:
      toTrimmedString((agencyPayload as { caseReferenceNumber?: unknown }).caseReferenceNumber) ||
      refCode,
  }

  const record: EmployerContractRecord = {
    refCode,
    id,
    agencyId,
    maid: maidPayload,
    agency: normalizedAgency,
    employer: employerPayload,
    spouse: payload.spouse ?? {},
    familyMembers: Array.isArray(payload.familyMembers)
      ? payload.familyMembers
      : [],
    notificationDate:
      payload.notificationDate && typeof payload.notificationDate === 'object'
        ? payload.notificationDate
        : {},
    documents: Array.isArray(payload.documents)
      ? payload.documents
          .map((document) => ({
            category: String(document.category ?? '').trim(),
            fileUrl: String(document.fileUrl ?? '').trim(),
            fileName: String(document.fileName ?? '').trim(),
          }))
          .filter((document) => document.category && document.fileUrl && document.fileName)
      : [],
    createdAt: index === -1 ? now() : data.employers[index].createdAt,
    updatedAt: now(),
  }

  if (index === -1) data.employers.unshift(record)
  else data.employers[index] = record

  const existingEmploymentContractIndex = data.employmentContracts.findIndex(
    (item) =>
      item.agencyId === agencyId &&
      (item.employerRefCode === refCode || item.refCode === refCode)
  )
  const employmentContractId =
    existingEmploymentContractIndex === -1
      ? data.counters.employmentContracts++
      : data.employmentContracts[existingEmploymentContractIndex].id
  const employmentContractRecord = normalizeEmploymentContractRecord(
    {
      id: employmentContractId,
      agencyId,
      refCode,
      employerRefCode: refCode,
      employerId: id,
      maidId: toNullableNumber((maidPayload as { id?: unknown; maidId?: unknown }).id) ??
        toNullableNumber((maidPayload as { maidId?: unknown }).maidId),
      maidReferenceCode:
        toTrimmedString((maidPayload as { referenceCode?: unknown }).referenceCode),
      maidName:
        toTrimmedString((maidPayload as { fullName?: unknown }).fullName) ||
        toTrimmedString((maidPayload as { name?: unknown }).name),
      employerName: toTrimmedString((employerPayload as { name?: unknown }).name),
      caseReferenceNumber: toTrimmedString(
        (normalizedAgency as { caseReferenceNumber?: unknown }).caseReferenceNumber
      ),
      contractDate: toTrimmedString(
        (normalizedAgency as { contractDate?: unknown }).contractDate
      ),
      serviceFee: toTrimmedString((normalizedAgency as { serviceFee?: unknown }).serviceFee),
      placementFee: toTrimmedString(
        (normalizedAgency as { placementFee?: unknown }).placementFee
      ),
      agencyWitness: toTrimmedString(
        (normalizedAgency as { agencyWitness?: unknown }).agencyWitness
      ),
      employerSnapshot: employerPayload,
      maidSnapshot: maidPayload,
      createdAt:
        existingEmploymentContractIndex === -1
          ? now()
          : data.employmentContracts[existingEmploymentContractIndex].createdAt,
      updatedAt: now(),
    },
    refCode
  )

  if (existingEmploymentContractIndex === -1) {
    data.employmentContracts.unshift(employmentContractRecord)
  } else {
    data.employmentContracts[existingEmploymentContractIndex] = employmentContractRecord
  }

  await saveData(data)
  return record
}

export const deleteEmployerContractStore = async (
  refCode: string,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  const code = String(refCode || '').trim()
  const existing =
    data.employers.find((item) => item.refCode === code && item.agencyId === agencyId) ?? null
  if (!existing) return null
  data.employers = data.employers.filter(
    (item) => item.refCode !== code || item.agencyId !== agencyId
  )
  data.employmentContracts = data.employmentContracts.filter(
    (item) =>
      item.agencyId !== agencyId ||
      (item.refCode !== code && item.employerRefCode !== code)
  )
  data.employerContractFiles = data.employerContractFiles.filter(
    (item) => item.agencyId !== agencyId || String(item.refCode || '').trim() !== code
  )
  await saveData(data)
  return existing
}

export const getEmployerContractFilesStore = async (
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  return data.employerContractFiles
    .filter((item) => item.agencyId === agencyId)
    .sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export const getEmployerContractFileStore = async (
  id: number,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  return (
    data.employerContractFiles.find((item) => item.id === id && item.agencyId === agencyId) ??
    null
  )
}

export const addEmployerContractFilesStore = async (
  files: Array<{
    name: string
    size: number
    type: string
    dataBase64: string
    storagePath?: string
    category?: string
    refCode?: string
  }>,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  const createdAt = now()
  const records: EmployerContractFileRecord[] = await Promise.all(
    files.map(async (file) => {
      const persisted = file.storagePath
        ? {
            storagePath: file.storagePath,
            size: file.size,
          }
        : await persistEmployerContractFilePayload(file, agencyId)
      return {
        id: data.counters.employerContractFiles++,
        agencyId,
        name: file.name,
        size: persisted.size,
        type: file.type,
        dataBase64: '',
        storagePath: persisted.storagePath,
        category: String(file.category ?? ''),
        refCode: String(file.refCode ?? ''),
        createdAt,
      }
    })
  )
  data.employerContractFiles.unshift(...records)
  await saveData(data)
  return records
}

export const deleteEmployerContractFileStore = async (
  id: number,
  agencyId: number = DEFAULT_AGENCY_ID
) => {
  const data = await loadData()
  const existing = data.employerContractFiles.find(
    (item) => item.id === id && item.agencyId === agencyId
  )
  if (!existing) return null
  data.employerContractFiles = data.employerContractFiles.filter(
    (item) => item.id !== id || item.agencyId !== agencyId
  )
  await saveData(data)
  return existing
}
