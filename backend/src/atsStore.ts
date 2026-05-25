import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { getMaidsStore, type MaidRecord } from './store'

export type RecruitmentStage =
  | 'New Applicant'
  | 'Documents Submitted'
  | 'Resume Parsed'
  | 'Screening Interview'
  | 'Background Check'
  | 'Approved'
  | 'Ready For Client Matching'
  | 'Placed'
  | 'Rejected'

export type QualificationCategory =
  | 'Excellent'
  | 'Highly Recommended'
  | 'Qualified'
  | 'Needs Review'
  | 'Not Qualified'

export interface MaidApplicationDocumentRecord {
  id: string
  type:
    | 'resume'
    | 'passport'
    | 'work_permit'
    | 'medical'
    | 'certificate'
    | 'reference'
    | 'video'
    | 'other'
  name: string
  url: string
  required: boolean
  uploadedAt: string
  status: 'missing' | 'submitted' | 'verified' | 'rejected'
}

export interface MaidInterviewRecord {
  id: string
  applicationId: string
  interviewDate: string
  interviewer: string
  questions: Array<{ question: string; answer: string; rating: number }>
  notes: string
  ratings: {
    communication: number
    experience: number
    attitude: number
    confidence: number
    overall: number
  }
  recordingUrl?: string
  interviewResult: 'Pending' | 'Passed' | 'Failed' | 'Requires Follow Up'
  score: number
  createdAt: string
  updatedAt: string
}

export interface MaidBackgroundCheckRecord {
  id: string
  applicationId: string
  passportVerified: boolean
  identityVerified: boolean
  employmentHistoryVerified: boolean
  referenceVerified: boolean
  medicalClearanceVerified: boolean
  completionPercentage: number
  result: 'Passed' | 'Failed' | 'Pending'
  notes: string
  updatedAt: string
}

export interface MaidQualificationScoreRecord {
  id: string
  applicationId: string
  score: number
  category: QualificationCategory
  explanation: string
  strengths: string[]
  weaknesses: string[]
  factors: {
    experience: number
    skillMatch: number
    certifications: number
    references: number
    languageSkills: number
    interviewRating: number
  }
  updatedAt: string
}

export interface MaidStatusHistoryRecord {
  id: string
  applicationId: string
  fromStage?: RecruitmentStage
  toStage: RecruitmentStage
  actor: string
  reason: string
  createdAt: string
}

export interface MaidReferenceRecord {
  name: string
  relationship: string
  contact: string
  rating: number
  verified: boolean
}

export interface MaidProfileRecord {
  id: string
  applicationId: string
  maidReferenceCode?: string
  fullName: string
  email: string
  whatsappNumber?: string
  nationality: string
  dateOfBirth: string
  age: number | null
  gender: string
  maritalStatus: string
  contactNumber: string
  address: string
  yearsOfExperience: number
  previousCountriesWorkedIn: string[]
  childcareExperience: number
  newbornCareExperience: number
  elderlyCareExperience: number
  disabledCareExperience: number
  housekeepingExperience: number
  cookingSkills: string[]
  petCareExperience: number
  languageSkills: string[]
  certifications: string[]
  trainingRecords: string[]
  availableDate: string
  expectedSalary: number | null
  employmentPreference: string
  medicalStatus: 'pending' | 'passed' | 'failed'
  passportStatus: 'missing' | 'submitted' | 'verified'
  certificationStatus: 'missing' | 'submitted' | 'verified'
  introductionVideoUrl?: string
  workHistory: Array<Record<string, unknown>>
  fdwFormData?: Record<string, unknown>
  strengthsTags: string[]
  weaknessesTags: string[]
  clientMatchScore?: number
  createdAt: string
  updatedAt: string
}

export interface MaidApplicationRecord {
  id: string
  agencyId: number
  maidReferenceCode?: string
  profileId: string
  applicationCode: string
  applicantAccessToken?: string
  status: RecruitmentStage
  source: 'manual' | 'resume_upload' | 'imported' | 'synced_from_maid'
  appliedAt: string
  updatedAt: string
  parsedAt?: string
  approvedAt?: string
  placedAt?: string
  rejectedAt?: string
  aiParseSummary: string
  aiParseReviewRequired: boolean
  autoRejectedReason?: string
  notificationLogIds: string[]
}

export interface MaidMatchRecord {
  id: string
  applicationId: string
  requestId?: string
  inquiryId?: number
  compatibilityScore: number
  skillsMatched: string[]
  missingRequirements: string[]
  recommendation: string
  createdAt: string
}

export interface MaidNotificationRecord {
  id: string
  applicationId: string
  event:
    | 'Application Received'
    | 'Documents Missing'
    | 'Interview Scheduled'
    | 'Interview Passed'
    | 'Interview Failed'
    | 'Background Check Completed'
    | 'Approved'
    | 'Rejected'
    | 'Matched To Client'
  channel: 'email' | 'whatsapp' | 'internal'
  recipient: string
  templateKey: string
  message: string
  createdAt: string
}

interface AtsData {
  applications: MaidApplicationRecord[]
  profiles: MaidProfileRecord[]
  interviews: MaidInterviewRecord[]
  backgroundChecks: MaidBackgroundCheckRecord[]
  scores: MaidQualificationScoreRecord[]
  matches: MaidMatchRecord[]
  history: MaidStatusHistoryRecord[]
  notifications: MaidNotificationRecord[]
  documents: Record<string, MaidApplicationDocumentRecord[]>
  savedFilters: Array<{
    id: string
    agencyId: number
    name: string
    filters: Record<string, unknown>
    createdAt: string
  }>
}

export interface PublicApplicantFileInput {
  kind:
    | 'resume'
    | 'passport'
    | 'work_permit'
    | 'medical'
    | 'certificate'
    | 'reference'
    | 'video'
    | 'other'
  name: string
  type: string
  size: number
  buffer: Buffer
}

export interface PublicApplicantSubmissionInput {
  agencyId: number
  fullName: string
  email: string
  contactNumber: string
  nationality: string
  dateOfBirth: string
  gender: string
  maritalStatus: string
  address: string
  yearsOfExperience: number
  previousCountriesWorkedIn: string[]
  childcareExperience: number
  newbornCareExperience: number
  elderlyCareExperience: number
  disabledCareExperience: number
  housekeepingExperience: number
  cookingSkills: string[]
  petCareExperience: number
  languageSkills: string[]
  certifications: string[]
  trainingRecords: string[]
  availableDate: string
  expectedSalary: number | null
  employmentPreference: string
  coverNote: string
  workHistory: Array<Record<string, unknown>>
  fdwFormData: Record<string, unknown>
  files: PublicApplicantFileInput[]
}

const dataDir = path.resolve(__dirname, '../data')
const dataFile = path.join(dataDir, 'ats-data.json')
const uploadsRoot = path.resolve(__dirname, '../data/uploads')
const now = () => new Date().toISOString()

const stageOrder: RecruitmentStage[] = [
  'New Applicant',
  'Documents Submitted',
  'Resume Parsed',
  'Screening Interview',
  'Background Check',
  'Approved',
  'Ready For Client Matching',
  'Placed',
  'Rejected',
]

const defaultData = (): AtsData => ({
  applications: [],
  profiles: [],
  interviews: [],
  backgroundChecks: [],
  scores: [],
  matches: [],
  history: [],
  notifications: [],
  documents: {},
  savedFilters: [],
})

const ensureDataDir = async () => mkdir(dataDir, { recursive: true })

const readData = async () => {
  try {
    const raw = await readFile(dataFile, 'utf8')
    const parsed = JSON.parse(raw) as Partial<AtsData>
    return {
      ...defaultData(),
      ...parsed,
      applications: parsed.applications ?? [],
      profiles: parsed.profiles ?? [],
      interviews: parsed.interviews ?? [],
      backgroundChecks: parsed.backgroundChecks ?? [],
      scores: parsed.scores ?? [],
      matches: parsed.matches ?? [],
      history: parsed.history ?? [],
      notifications: parsed.notifications ?? [],
      documents: parsed.documents ?? {},
      savedFilters: parsed.savedFilters ?? [],
    }
  } catch {
    const seed = defaultData()
    await writeData(seed)
    return seed
  }
}

const writeData = async (data: AtsData) => {
  await ensureDataDir()
  await writeFile(dataFile, JSON.stringify(data, null, 2), 'utf8')
}

const normalizeStringArray = (values: unknown[]): string[] =>
  Array.from(
    new Set(
      values
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
    )
  )

const sanitizePathSegment = (value: string, fallback: string) => {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized || fallback
}

const buildApplicationCode = () => `APP-${randomUUID().slice(0, 8).toUpperCase()}`

const calculateAge = (dateOfBirth?: string) => {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1
  return age
}

const parseLanguageSkills = (maid: MaidRecord) =>
  Object.entries(maid.languageSkills ?? {})
    .filter(([, level]) => String(level ?? '').trim())
    .map(([language]) => language)

const inferCookingSkills = (maid: MaidRecord) => {
  const notes = JSON.stringify(maid.skillsPreferences ?? {}).toLowerCase()
  const tags: string[] = []
  if (notes.includes('chinese')) tags.push('Chinese food')
  if (notes.includes('indian')) tags.push('Indian food')
  if (notes.includes('western')) tags.push('Western food')
  if (maid.workAreas && Object.prototype.hasOwnProperty.call(maid.workAreas, 'Cooking')) {
    tags.push('General cooking')
  }
  return normalizeStringArray(tags)
}

const inferEmploymentPreference = (maid: MaidRecord) => {
  const type = maid.type.toLowerCase()
  if (type.includes('transfer')) return 'Transfer'
  if (type.includes('ex-singapore')) return 'Ex-Singapore'
  return 'New Placement'
}

const inferExperienceYears = (maid: MaidRecord) => {
  const jobs = Array.isArray(maid.employmentHistory) ? maid.employmentHistory : []
  return Math.max(
    jobs.length,
    jobs.reduce((sum, item) => {
      const maybeYears = Number((item as Record<string, unknown>).yearsOfExperience ?? 0)
      return sum + (Number.isFinite(maybeYears) ? maybeYears : 0)
    }, 0)
  )
}

const inferCountriesWorked = (maid: MaidRecord) =>
  normalizeStringArray(
    (Array.isArray(maid.employmentHistory) ? maid.employmentHistory : []).map(
      (item) => (item as Record<string, unknown>).country ?? (item as Record<string, unknown>).location ?? ''
    )
  )

const inferAreaYears = (maid: MaidRecord, areaName: string) => {
  const workAreas = maid.workAreas as Record<string, unknown>
  const area = (workAreas?.[areaName] as Record<string, unknown>) ?? {}
  const years = Number(area.yearsOfExperience ?? 0)
  return Number.isFinite(years) ? years : 0
}

const profileFromMaid = (maid: MaidRecord, applicationId: string): MaidProfileRecord => {
  const introduction = maid.introduction as Record<string, unknown>
  const agencyContact = maid.agencyContact as Record<string, unknown>
  const certifications = normalizeStringArray([
    ...(Array.isArray(introduction.certifications) ? introduction.certifications : []),
    ...(Array.isArray(introduction.trainingRecords) ? introduction.trainingRecords : []),
  ])
  const availableDate = String(introduction.availability || '').trim()
  const expectedSalary = Number(introduction.expectedSalary ?? introduction.presentSalary ?? NaN)
  return {
    id: randomUUID(),
    applicationId,
    maidReferenceCode: maid.referenceCode,
    fullName: maid.fullName,
    email: '',
    whatsappNumber: String(agencyContact.phone || agencyContact.homeCountryContactNumber || ''),
    nationality: maid.nationality,
    dateOfBirth: maid.dateOfBirth,
    age: calculateAge(maid.dateOfBirth),
    gender: String(introduction.gender || 'Female'),
    maritalStatus: maid.maritalStatus,
    contactNumber: String(agencyContact.phone || agencyContact.homeCountryContactNumber || ''),
    address: maid.homeAddress,
    yearsOfExperience: inferExperienceYears(maid),
    previousCountriesWorkedIn: inferCountriesWorked(maid),
    childcareExperience: inferAreaYears(maid, 'Care of infants/children'),
    newbornCareExperience: inferAreaYears(maid, 'Care of infants/children'),
    elderlyCareExperience: inferAreaYears(maid, 'Care of elderly'),
    disabledCareExperience: inferAreaYears(maid, 'Care of disabled'),
    housekeepingExperience: inferAreaYears(maid, 'General housework'),
    cookingSkills: inferCookingSkills(maid),
    petCareExperience: Number(
      ((maid.skillsPreferences as Record<string, unknown>)?.otherInformation as Record<string, unknown>)?.[
        'Able to care for dog/cat?'
      ] ? 1 : 0
    ),
    languageSkills: parseLanguageSkills(maid),
    certifications,
    trainingRecords: certifications,
    availableDate,
    expectedSalary: Number.isFinite(expectedSalary) ? expectedSalary : null,
    employmentPreference: inferEmploymentPreference(maid),
    medicalStatus: String(introduction.otherIllnesses || '').trim() ? 'pending' : 'passed',
    passportStatus: String(agencyContact.passportNo || '').trim() ? 'submitted' : 'missing',
    certificationStatus: certifications.length > 0 ? 'submitted' : 'missing',
    introductionVideoUrl: maid.videoDataUrl || '',
    workHistory: Array.isArray(maid.employmentHistory) ? maid.employmentHistory : [],
    fdwFormData: {},
    strengthsTags: [],
    weaknessesTags: [],
    createdAt: now(),
    updatedAt: now(),
  }
}

const getReferencesForProfile = (profile: MaidProfileRecord): MaidReferenceRecord[] => {
  const refs: MaidReferenceRecord[] = []
  profile.workHistory.forEach((item, index) => {
    const row = item as Record<string, unknown>
    if (!String(row.employer || '').trim()) return
    refs.push({
      name: String(row.employer || `Reference ${index + 1}`),
      relationship: 'Previous Employer',
      contact: String(row.contact || ''),
      rating: 4,
      verified: false,
    })
  })
  return refs
}

const qualificationCategory = (score: number): QualificationCategory => {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Highly Recommended'
  if (score >= 60) return 'Qualified'
  if (score >= 40) return 'Needs Review'
  return 'Not Qualified'
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

const computeScore = (
  profile: MaidProfileRecord,
  interview?: MaidInterviewRecord | null
): MaidQualificationScoreRecord => {
  const references = getReferencesForProfile(profile)
  const experienceFactor = clamp((profile.yearsOfExperience / 8) * 100)
  const skillFactor = clamp(
    ((Number(profile.childcareExperience > 0) +
      Number(profile.newbornCareExperience > 0) +
      Number(profile.elderlyCareExperience > 0) +
      Number(profile.disabledCareExperience > 0) +
      Number(profile.housekeepingExperience > 0) +
      Number(profile.cookingSkills.length > 0) +
      Number(profile.petCareExperience > 0)) /
      7) *
      100
  )
  const certificationsFactor = clamp((profile.certifications.length / 4) * 100)
  const referencesFactor = clamp(
    references.length > 0
      ? (references.reduce((sum, item) => sum + item.rating, 0) / (references.length * 5)) * 100
      : 20
  )
  const languagesFactor = clamp((profile.languageSkills.length / 4) * 100)
  const interviewFactor = clamp(interview?.score ?? 0)
  const score = Math.round(
    experienceFactor * 0.25 +
      skillFactor * 0.25 +
      certificationsFactor * 0.15 +
      referencesFactor * 0.15 +
      languagesFactor * 0.1 +
      interviewFactor * 0.1
  )
  const strengths = [
    profile.yearsOfExperience >= 3 ? 'Strong hands-on experience' : '',
    profile.languageSkills.length >= 2 ? 'Multi-language communication' : '',
    profile.cookingSkills.length > 0 ? 'Cooking capability documented' : '',
    certificationsFactor >= 50 ? 'Relevant certifications/training available' : '',
    interviewFactor >= 75 ? 'Strong interview performance' : '',
  ].filter(Boolean)
  const weaknesses = [
    profile.passportStatus === 'missing' ? 'Passport not submitted' : '',
    profile.certificationStatus === 'missing' ? 'Certificates missing' : '',
    profile.medicalStatus === 'failed' ? 'Medical clearance failed' : '',
    profile.yearsOfExperience < 2 ? 'Limited verified work experience' : '',
    interview && interview.interviewResult === 'Failed' ? 'Interview result failed' : '',
  ].filter(Boolean)
  const category = qualificationCategory(score)
  return {
    id: randomUUID(),
    applicationId: profile.applicationId,
    score,
    category,
    explanation: `${profile.fullName} is ${category.toLowerCase()} based on experience, skills, language coverage, references, and interview performance.`,
    strengths,
    weaknesses,
    factors: {
      experience: Math.round(experienceFactor),
      skillMatch: Math.round(skillFactor),
      certifications: Math.round(certificationsFactor),
      references: Math.round(referencesFactor),
      languageSkills: Math.round(languagesFactor),
      interviewRating: Math.round(interviewFactor),
    },
    updatedAt: now(),
  }
}

const createDefaultBackgroundCheck = (applicationId: string): MaidBackgroundCheckRecord => ({
  id: randomUUID(),
  applicationId,
  passportVerified: false,
  identityVerified: false,
  employmentHistoryVerified: false,
  referenceVerified: false,
  medicalClearanceVerified: false,
  completionPercentage: 0,
  result: 'Pending',
  notes: '',
  updatedAt: now(),
})

const createDefaultDocuments = (profile: MaidProfileRecord): MaidApplicationDocumentRecord[] => [
  {
    id: randomUUID(),
    type: 'resume',
    name: 'Resume/CV',
    url: '',
    required: true,
    uploadedAt: now(),
    status: profile.workHistory.length > 0 ? 'submitted' : 'missing',
  },
  {
    id: randomUUID(),
    type: 'passport',
    name: 'Passport',
    url: '',
    required: true,
    uploadedAt: now(),
    status: profile.passportStatus === 'submitted' ? 'submitted' : 'missing',
  },
  {
    id: randomUUID(),
    type: 'medical',
    name: 'Medical Records',
    url: '',
    required: true,
    uploadedAt: now(),
    status: profile.medicalStatus === 'passed' ? 'verified' : 'missing',
  },
  {
    id: randomUUID(),
    type: 'certificate',
    name: 'Certificates',
    url: '',
    required: false,
    uploadedAt: now(),
    status: profile.certifications.length > 0 ? 'submitted' : 'missing',
  },
]

const createPublicDocuments = (
  uploaded: Array<Pick<MaidApplicationDocumentRecord, 'type' | 'name' | 'url' | 'uploadedAt'>>
): MaidApplicationDocumentRecord[] => {
  const defaults: Array<Pick<MaidApplicationDocumentRecord, 'type' | 'name' | 'required'>> = [
    { type: 'resume', name: 'Resume/CV', required: true },
    { type: 'passport', name: 'Passport', required: false },
    { type: 'work_permit', name: 'Work Permit Documents', required: false },
    { type: 'medical', name: 'Medical Records', required: false },
    { type: 'certificate', name: 'Certificates', required: false },
    { type: 'reference', name: 'References', required: false },
    { type: 'video', name: 'Introduction Video', required: false },
  ]

  return defaults.map((item) => {
    const match = uploaded.find((entry) => entry.type === item.type)
    return {
      id: randomUUID(),
      type: item.type,
      name: match?.name || item.name,
      url: match?.url || '',
      required: item.required,
      uploadedAt: match?.uploadedAt || now(),
      status: match ? 'submitted' : 'missing',
    }
  })
}

const persistPublicApplicantFile = async (
  agencyId: number,
  applicationId: string,
  file: PublicApplicantFileInput
) => {
  const kind = sanitizePathSegment(file.kind, 'other')
  const originalName = sanitizePathSegment(file.name, `file-${kind}`)
  const extension = path.extname(originalName) || ''
  const baseName = path.basename(originalName, extension) || `file-${kind}`
  const fileName = `${baseName}-${randomUUID()}${extension}`
  const relativePath = path
    .posix
    .join('ats-applicants', `agency-${agencyId}`, sanitizePathSegment(applicationId, 'application'), kind, fileName)
  const absolutePath = path.join(uploadsRoot, relativePath)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, file.buffer)
  return `/uploads/${relativePath.replace(/\\/g, '/')}`
}

const transition = (
  data: AtsData,
  application: MaidApplicationRecord,
  nextStage: RecruitmentStage,
  actor: string,
  reason: string
) => {
  const previous = application.status
  application.status = nextStage
  application.updatedAt = now()
  if (nextStage === 'Approved') application.approvedAt = now()
  if (nextStage === 'Placed') application.placedAt = now()
  if (nextStage === 'Rejected') application.rejectedAt = now()
  data.history.unshift({
    id: randomUUID(),
    applicationId: application.id,
    fromStage: previous,
    toStage: nextStage,
    actor,
    reason,
    createdAt: now(),
  })
}

const buildNotification = (
  applicationId: string,
  event: MaidNotificationRecord['event'],
  recipient: string,
  channel: MaidNotificationRecord['channel'],
  message: string
): MaidNotificationRecord => ({
  id: randomUUID(),
  applicationId,
  event,
  channel,
  recipient,
  templateKey: event.toLowerCase().replace(/\s+/g, '_'),
  message,
  createdAt: now(),
})

const meetsDocumentsRequirement = (docs: MaidApplicationDocumentRecord[]) =>
  docs.every((doc) => !doc.required || doc.status === 'submitted' || doc.status === 'verified')

const applyAutomationRules = (
  data: AtsData,
  application: MaidApplicationRecord,
  profile: MaidProfileRecord,
  score: MaidQualificationScoreRecord,
  interview: MaidInterviewRecord | null,
  backgroundCheck: MaidBackgroundCheckRecord,
  actor = 'system'
) => {
  const docs = data.documents[application.id] ?? []
  if (!meetsDocumentsRequirement(docs)) {
    application.autoRejectedReason = 'Missing required documents'
    if (application.status !== 'Rejected') {
      transition(data, application, 'Rejected', actor, 'Auto reject: missing required documents')
    }
    return
  }
  if (profile.medicalStatus === 'failed') {
    application.autoRejectedReason = 'Failed medical check'
    if (application.status !== 'Rejected') {
      transition(data, application, 'Rejected', actor, 'Auto reject: failed medical check')
    }
    return
  }
  if (backgroundCheck.identityVerified === false && backgroundCheck.result === 'Failed') {
    application.autoRejectedReason = 'Failed identity verification'
    if (application.status !== 'Rejected') {
      transition(data, application, 'Rejected', actor, 'Auto reject: failed identity verification')
    }
    return
  }
  if (profile.yearsOfExperience < 1) {
    application.autoRejectedReason = 'Minimum experience requirements not met'
    if (application.status !== 'Rejected') {
      transition(data, application, 'Rejected', actor, 'Auto reject: minimum experience not met')
    }
    return
  }
  const readyForMatching =
    score.score > 90 &&
    interview?.interviewResult === 'Passed' &&
    backgroundCheck.result === 'Passed' &&
    meetsDocumentsRequirement(docs)
  if (readyForMatching && application.status !== 'Ready For Client Matching') {
    transition(data, application, 'Ready For Client Matching', actor, 'Auto approval queue')
  }
}

export const initializeAtsStore = async () => {
  const data = await readData()
  if (data.applications.length === 0) {
    const maids = await getMaidsStore()
    for (const maid of maids) {
      await ensureApplicationForMaid(maid)
    }
  }
}

export const ensureApplicationForMaid = async (maid: MaidRecord) => {
  const data = await readData()
  const existing = data.applications.find(
    (item) => item.agencyId === maid.agencyId && item.maidReferenceCode === maid.referenceCode
  )
  if (existing) return existing

  const applicationId = randomUUID()
  const profile = profileFromMaid(maid, applicationId)
  const interview: MaidInterviewRecord | null = null
  const score = computeScore(profile, interview)
  const backgroundCheck = createDefaultBackgroundCheck(applicationId)
  const application: MaidApplicationRecord = {
    id: applicationId,
    agencyId: maid.agencyId,
    maidReferenceCode: maid.referenceCode,
    profileId: profile.id,
    applicationCode: buildApplicationCode(),
    status: 'New Applicant',
    source: 'synced_from_maid',
    appliedAt: maid.createdAt,
    updatedAt: now(),
    aiParseSummary: `Profile seeded from maid record ${maid.referenceCode}.`,
    aiParseReviewRequired: false,
    notificationLogIds: [],
  }

  data.applications.unshift(application)
  data.profiles.unshift(profile)
  data.scores.unshift(score)
  data.backgroundChecks.unshift(backgroundCheck)
  data.documents[application.id] = createDefaultDocuments(profile)
  data.history.unshift({
    id: randomUUID(),
    applicationId,
    toStage: 'New Applicant',
    actor: 'system',
    reason: 'Seeded from maid profile',
    createdAt: now(),
  })

  applyAutomationRules(data, application, profile, score, interview, backgroundCheck)
  await writeData(data)
  return application
}

export const createPublicAtsApplication = async (payload: PublicApplicantSubmissionInput) => {
  const data = await readData()
  const applicationId = randomUUID()
  const createdAt = now()
  const uploadedDocs: Array<Pick<MaidApplicationDocumentRecord, 'type' | 'name' | 'url' | 'uploadedAt'>> = []

  for (const file of payload.files) {
    const url = await persistPublicApplicantFile(payload.agencyId, applicationId, file)
    uploadedDocs.push({
      type: file.kind,
      name: file.name,
      url,
      uploadedAt: createdAt,
    })
  }

  const profile: MaidProfileRecord = {
    id: randomUUID(),
    applicationId,
    fullName: payload.fullName,
    email: payload.email,
    whatsappNumber: payload.contactNumber,
    nationality: payload.nationality,
    dateOfBirth: payload.dateOfBirth,
    age: calculateAge(payload.dateOfBirth),
    gender: payload.gender || 'Female',
    maritalStatus: payload.maritalStatus,
    contactNumber: payload.contactNumber,
    address: payload.address,
    yearsOfExperience: payload.yearsOfExperience,
    previousCountriesWorkedIn: payload.previousCountriesWorkedIn,
    childcareExperience: payload.childcareExperience,
    newbornCareExperience: payload.newbornCareExperience,
    elderlyCareExperience: payload.elderlyCareExperience,
    disabledCareExperience: payload.disabledCareExperience,
    housekeepingExperience: payload.housekeepingExperience,
    cookingSkills: payload.cookingSkills,
    petCareExperience: payload.petCareExperience,
    languageSkills: payload.languageSkills,
    certifications: payload.certifications,
    trainingRecords: payload.trainingRecords,
    availableDate: payload.availableDate,
    expectedSalary: payload.expectedSalary,
    employmentPreference: payload.employmentPreference,
    medicalStatus: uploadedDocs.some((item) => item.type === 'medical') ? 'pending' : 'pending',
    passportStatus: uploadedDocs.some((item) => item.type === 'passport') ? 'submitted' : 'missing',
    certificationStatus: uploadedDocs.some((item) => item.type === 'certificate') ? 'submitted' : 'missing',
    introductionVideoUrl: uploadedDocs.find((item) => item.type === 'video')?.url,
    workHistory: payload.workHistory,
    fdwFormData: payload.fdwFormData,
    strengthsTags: normalizeStringArray([
      ...payload.languageSkills.slice(0, 2),
      payload.childcareExperience > 0 ? 'Childcare' : '',
      payload.newbornCareExperience > 0 ? 'Newborn care' : '',
      payload.elderlyCareExperience > 0 ? 'Elderly care' : '',
      payload.disabledCareExperience > 0 ? 'Disabled care' : '',
      payload.housekeepingExperience > 0 ? 'Housekeeping' : '',
      payload.cookingSkills[0] ?? '',
    ]).slice(0, 6),
    weaknessesTags: normalizeStringArray([
      payload.files.some((item) => item.kind === 'passport') ? '' : 'Passport missing',
      payload.files.some((item) => item.kind === 'certificate') ? '' : 'Certificates missing',
      payload.yearsOfExperience < 2 ? 'Limited experience' : '',
    ]),
    createdAt,
    updatedAt: createdAt,
  }

  const application: MaidApplicationRecord = {
    id: applicationId,
    agencyId: payload.agencyId,
    profileId: profile.id,
    applicationCode: buildApplicationCode(),
    applicantAccessToken: randomUUID(),
    status: 'New Applicant',
    source: 'resume_upload',
    appliedAt: createdAt,
    updatedAt: createdAt,
    aiParseSummary: `Applicant self-submitted profile and ${payload.files.length} attachment(s). Review recruiter validation before advancing to Resume Parsed.`,
    aiParseReviewRequired: true,
    notificationLogIds: [],
  }

  const score = computeScore(profile, null)
  const backgroundCheck = createDefaultBackgroundCheck(applicationId)
  const documents = createPublicDocuments(uploadedDocs)

  data.applications.unshift(application)
  data.profiles.unshift(profile)
  data.scores = data.scores.filter((item) => item.applicationId !== applicationId)
  data.scores.unshift(score)
  data.backgroundChecks.unshift(backgroundCheck)
  data.documents[applicationId] = documents
  data.history.unshift({
    id: randomUUID(),
    applicationId,
    toStage: 'New Applicant',
    actor: 'applicant',
    reason: 'Application submitted through the public maid applicant portal',
    createdAt,
  })

  const confirmationMessage = `Thank you ${payload.fullName}. Your application has been received with reference ${application.applicationCode}. Our recruitment team will review your profile shortly.`
  const notifications: MaidNotificationRecord[] = [
    buildNotification(applicationId, 'Application Received', payload.contactNumber, 'whatsapp', confirmationMessage),
    buildNotification(applicationId, 'Application Received', payload.email, 'email', confirmationMessage),
    buildNotification(applicationId, 'Application Received', `agency-${payload.agencyId}`, 'internal', `${payload.fullName} submitted a new applicant portal form.`),
  ]
  notifications.forEach((item) => data.notifications.unshift(item))
  application.notificationLogIds = notifications.map((item) => item.id)

  await writeData(data)

  return {
    applicationId,
    applicationCode: application.applicationCode,
    applicantAccessToken: application.applicantAccessToken!,
    submittedAt: application.appliedAt,
  }
}

const getApplicationBundleInternal = (data: AtsData, application: MaidApplicationRecord) => {
  const profile = data.profiles.find((item) => item.applicationId === application.id) ?? null
  const score = data.scores.find((item) => item.applicationId === application.id) ?? null
  const interview = data.interviews.find((item) => item.applicationId === application.id) ?? null
  const backgroundCheck =
    data.backgroundChecks.find((item) => item.applicationId === application.id) ?? null
  const history = data.history
    .filter((item) => item.applicationId === application.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const documents = data.documents[application.id] ?? []
  const matches = data.matches
    .filter((item) => item.applicationId === application.id)
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
  const notifications = data.notifications.filter((item) => item.applicationId === application.id)

  return {
    application,
    profile,
    score,
    interview,
    backgroundCheck,
    history,
    documents,
    matches,
    notifications,
    references: profile ? getReferencesForProfile(profile) : [],
  }
}

export const getAtsApplication = async (agencyId: number, applicationId: string) => {
  const data = await readData()
  const application = data.applications.find(
    (item) => item.id === applicationId && item.agencyId === agencyId
  )
  if (!application) return null
  return getApplicationBundleInternal(data, application)
}

export const getPublicAtsApplicationSummary = async (applicationId: string, accessToken: string) => {
  const data = await readData()
  const application = data.applications.find(
    (item) => item.id === applicationId && item.applicantAccessToken === accessToken
  )
  if (!application) return null

  const bundle = getApplicationBundleInternal(data, application)
  return {
    application: {
      id: application.id,
      applicationCode: application.applicationCode,
      status: application.status,
      appliedAt: application.appliedAt,
      aiParseSummary: application.aiParseSummary,
    },
    profile: bundle.profile
      ? {
          fullName: bundle.profile.fullName,
          email: bundle.profile.email,
          contactNumber: bundle.profile.contactNumber,
          nationality: bundle.profile.nationality,
          availableDate: bundle.profile.availableDate,
          expectedSalary: bundle.profile.expectedSalary,
        }
      : null,
    documents: bundle.documents.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      status: item.status,
      required: item.required,
      url: item.url,
    })),
    history: bundle.history.map((item) => ({
      id: item.id,
      toStage: item.toStage,
      reason: item.reason,
      createdAt: item.createdAt,
    })),
    notifications: bundle.notifications.map((item) => ({
      id: item.id,
      channel: item.channel,
      event: item.event,
      message: item.message,
      createdAt: item.createdAt,
    })),
  }
}

export const listAtsApplications = async (
  agencyId: number,
  options?: {
    query?: string
    filters?: Record<string, unknown>
    sort?: string
    page?: number
    pageSize?: number
  }
) => {
  const data = await readData()
  const query = String(options?.query ?? '').trim().toLowerCase()
  const page = Math.max(1, Number(options?.page ?? 1))
  const pageSize = Math.max(1, Math.min(100, Number(options?.pageSize ?? 20)))
  const filters = options?.filters ?? {}
  const profilesByApplication = new Map(data.profiles.map((profile) => [profile.applicationId, profile]))
  const scoresByApplication = new Map(data.scores.map((score) => [score.applicationId, score]))
  const interviewsByApplication = new Map(data.interviews.map((interview) => [interview.applicationId, interview]))
  const matchesByApplication = new Map<string, number>()
  data.matches.forEach((match) => {
    const current = matchesByApplication.get(match.applicationId) ?? 0
    if (match.compatibilityScore > current) matchesByApplication.set(match.applicationId, match.compatibilityScore)
  })

  let items = data.applications.filter(
    (application) => application.agencyId === agencyId && application.source === 'resume_upload'
  )

  items = items.filter((application) => {
    const profile = profilesByApplication.get(application.id)
    if (!profile) return false

    const text = [
      profile.fullName,
      profile.email,
      profile.contactNumber,
      profile.nationality,
      profile.languageSkills.join(' '),
      profile.cookingSkills.join(' '),
      profile.certifications.join(' '),
      profile.employmentPreference,
      profile.strengthsTags.join(' '),
      application.status,
      profile.maidReferenceCode ?? '',
    ]
      .join(' ')
      .toLowerCase()
    if (query && !text.includes(query)) return false

    const nationality = filters.nationality as string[] | undefined
    if (nationality?.length && !nationality.includes(profile.nationality)) return false

    const status = filters.status as string[] | undefined
    if (status?.length && !status.includes(application.status)) return false

    const languages = filters.languages as string[] | undefined
    if (languages?.length && !languages.some((item) => profile.languageSkills.includes(item))) return false

    const minExperience = Number(filters.minExperience ?? NaN)
    if (Number.isFinite(minExperience) && profile.yearsOfExperience < minExperience) return false

    const minScore = Number(filters.minScore ?? NaN)
    const score = scoresByApplication.get(application.id)?.score ?? 0
    if (Number.isFinite(minScore) && score < minScore) return false

    const ageMin = Number(filters.ageMin ?? NaN)
    if (Number.isFinite(ageMin) && (profile.age ?? 0) < ageMin) return false
    const ageMax = Number(filters.ageMax ?? NaN)
    if (Number.isFinite(ageMax) && (profile.age ?? 0) > ageMax) return false

    const salaryMax = Number(filters.salaryMax ?? NaN)
    if (Number.isFinite(salaryMax) && (profile.expectedSalary ?? 0) > salaryMax) return false

    const hasEmail = Boolean(filters.hasEmail)
    if (hasEmail && !profile.email.trim()) return false

    const hasWhatsApp = Boolean(filters.hasWhatsApp)
    if (hasWhatsApp && !profile.contactNumber.trim()) return false

    const availableOnly = Boolean(filters.availableImmediately)
    if (availableOnly && !profile.availableDate) return false

    const hasChildcare = Boolean(filters.childcareExperience)
    if (hasChildcare && profile.childcareExperience <= 0) return false

    const hasNewborn = Boolean(filters.newbornCareExperience)
    if (hasNewborn && profile.newbornCareExperience <= 0) return false

    const hasElderly = Boolean(filters.elderlyCareExperience)
    if (hasElderly && profile.elderlyCareExperience <= 0) return false

    const hasCooking = filters.cookingSkills as string[] | undefined
    if (hasCooking?.length && !hasCooking.some((item) => profile.cookingSkills.includes(item))) return false

    const medicalStatus = filters.medicalStatus as string[] | undefined
    if (medicalStatus?.length && !medicalStatus.includes(profile.medicalStatus)) return false

    const passportStatus = filters.passportStatus as string[] | undefined
    if (passportStatus?.length && !passportStatus.includes(profile.passportStatus)) return false

    const certificationStatus = filters.certificationStatus as string[] | undefined
    if (certificationStatus?.length && !certificationStatus.includes(profile.certificationStatus))
      return false

    return true
  })

  const sort = String(options?.sort ?? 'qualificationScore:desc')
  items.sort((left, right) => {
    const leftProfile = profilesByApplication.get(left.id)!
    const rightProfile = profilesByApplication.get(right.id)!
    const leftScore = scoresByApplication.get(left.id)?.score ?? 0
    const rightScore = scoresByApplication.get(right.id)?.score ?? 0
    const leftInterview = interviewsByApplication.get(left.id)?.score ?? 0
    const rightInterview = interviewsByApplication.get(right.id)?.score ?? 0
    const leftMatch = matchesByApplication.get(left.id) ?? 0
    const rightMatch = matchesByApplication.get(right.id) ?? 0

    switch (sort) {
      case 'experience:desc':
        return rightProfile.yearsOfExperience - leftProfile.yearsOfExperience
      case 'availability:asc':
        return String(leftProfile.availableDate).localeCompare(String(rightProfile.availableDate))
      case 'applicationDate:desc':
        return new Date(right.appliedAt).getTime() - new Date(left.appliedAt).getTime()
      case 'applicationDate:asc':
        return new Date(left.appliedAt).getTime() - new Date(right.appliedAt).getTime()
      case 'interviewRating:desc':
        return rightInterview - leftInterview
      case 'referenceRating:desc':
        return (
          getReferencesForProfile(rightProfile).reduce((sum, item) => sum + item.rating, 0) -
          getReferencesForProfile(leftProfile).reduce((sum, item) => sum + item.rating, 0)
        )
      case 'numberOfLanguages:desc':
        return rightProfile.languageSkills.length - leftProfile.languageSkills.length
      case 'clientMatchScore:desc':
        return rightMatch - leftMatch
      case 'expectedSalary:asc':
        return (leftProfile.expectedSalary ?? Number.MAX_SAFE_INTEGER) - (rightProfile.expectedSalary ?? Number.MAX_SAFE_INTEGER)
      case 'name:asc':
        return leftProfile.fullName.localeCompare(rightProfile.fullName)
      default:
        return rightScore - leftScore
    }
  })

  const total = items.length
  const paged = items.slice((page - 1) * pageSize, page * pageSize)
  return {
    data: paged.map((application) => {
      const profile = profilesByApplication.get(application.id)!
      const score = scoresByApplication.get(application.id) ?? null
      const interview = interviewsByApplication.get(application.id) ?? null
      return {
        ...application,
        profile,
        score,
        interview,
        clientMatchScore: matchesByApplication.get(application.id) ?? 0,
      }
    }),
    pageInfo: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}

export const upsertInterview = async (
  agencyId: number,
  applicationId: string,
  payload: Omit<MaidInterviewRecord, 'id' | 'applicationId' | 'createdAt' | 'updatedAt' | 'score'>
) => {
  const data = await readData()
  const application = data.applications.find((item) => item.id === applicationId && item.agencyId === agencyId)
  if (!application) throw new Error('APPLICATION_NOT_FOUND')
  const existingIndex = data.interviews.findIndex((item) => item.applicationId === applicationId)
  const score = Math.round(
    ((payload.ratings.communication +
      payload.ratings.experience +
      payload.ratings.attitude +
      payload.ratings.confidence +
      payload.ratings.overall) /
      25) *
      100
  )
  const interview: MaidInterviewRecord = {
    id: existingIndex === -1 ? randomUUID() : data.interviews[existingIndex].id,
    applicationId,
    interviewDate: payload.interviewDate,
    interviewer: payload.interviewer,
    questions: payload.questions,
    notes: payload.notes,
    ratings: payload.ratings,
    recordingUrl: payload.recordingUrl,
    interviewResult: payload.interviewResult,
    score,
    createdAt: existingIndex === -1 ? now() : data.interviews[existingIndex].createdAt,
    updatedAt: now(),
  }
  if (existingIndex === -1) data.interviews.unshift(interview)
  else data.interviews[existingIndex] = interview

  const profile = data.profiles.find((item) => item.applicationId === applicationId)
  if (profile) {
    const newScore = computeScore(profile, interview)
    data.scores = data.scores.filter((item) => item.applicationId !== applicationId)
    data.scores.unshift(newScore)
    transition(data, application, 'Screening Interview', interview.interviewer, 'Interview updated')
    data.notifications.unshift(
      buildNotification(
        applicationId,
        interview.interviewResult === 'Passed' ? 'Interview Passed' : 'Interview Failed',
        profile.contactNumber,
        'internal',
        `Interview result recorded: ${interview.interviewResult}`
      )
    )
    const background = data.backgroundChecks.find((item) => item.applicationId === applicationId) ?? createDefaultBackgroundCheck(applicationId)
    applyAutomationRules(data, application, profile, newScore, interview, background, interview.interviewer)
  }

  await writeData(data)
  return getAtsApplication(agencyId, applicationId)
}

export const upsertBackgroundCheck = async (
  agencyId: number,
  applicationId: string,
  payload: Omit<MaidBackgroundCheckRecord, 'id' | 'applicationId' | 'completionPercentage' | 'updatedAt'>
) => {
  const data = await readData()
  const application = data.applications.find((item) => item.id === applicationId && item.agencyId === agencyId)
  if (!application) throw new Error('APPLICATION_NOT_FOUND')
  const existingIndex = data.backgroundChecks.findIndex((item) => item.applicationId === applicationId)
  const checklist = [
    payload.passportVerified,
    payload.identityVerified,
    payload.employmentHistoryVerified,
    payload.referenceVerified,
    payload.medicalClearanceVerified,
  ]
  const completionPercentage = Math.round((checklist.filter(Boolean).length / checklist.length) * 100)
  const record: MaidBackgroundCheckRecord = {
    id: existingIndex === -1 ? randomUUID() : data.backgroundChecks[existingIndex].id,
    applicationId,
    ...payload,
    completionPercentage,
    updatedAt: now(),
  }
  if (existingIndex === -1) data.backgroundChecks.unshift(record)
  else data.backgroundChecks[existingIndex] = record

  const profile = data.profiles.find((item) => item.applicationId === applicationId)
  const score = data.scores.find((item) => item.applicationId === applicationId)
  const interview = data.interviews.find((item) => item.applicationId === applicationId) ?? null
  if (profile && score) {
    transition(data, application, 'Background Check', 'recruiter', 'Background check updated')
    data.notifications.unshift(
      buildNotification(
        applicationId,
        'Background Check Completed',
        profile.contactNumber,
        'internal',
        `Background check result: ${record.result}`
      )
    )
    applyAutomationRules(data, application, profile, score, interview, record, 'system')
  }

  await writeData(data)
  return getAtsApplication(agencyId, applicationId)
}

export const updateApplicationStage = async (
  agencyId: number,
  applicationId: string,
  nextStage: RecruitmentStage,
  actor: string,
  reason: string
) => {
  const data = await readData()
  const application = data.applications.find((item) => item.id === applicationId && item.agencyId === agencyId)
  if (!application) throw new Error('APPLICATION_NOT_FOUND')
  transition(data, application, nextStage, actor, reason)
  const profile = data.profiles.find((item) => item.applicationId === applicationId)
  if (profile) {
    const event =
      nextStage === 'Approved'
        ? 'Approved'
        : nextStage === 'Rejected'
        ? 'Rejected'
        : nextStage === 'Placed'
        ? 'Matched To Client'
        : 'Application Received'
    data.notifications.unshift(
      buildNotification(applicationId, event, profile.contactNumber, 'internal', `${profile.fullName} moved to ${nextStage}`)
    )
  }
  await writeData(data)
  return getAtsApplication(agencyId, applicationId)
}

export const bulkUpdateApplications = async (
  agencyId: number,
  payload: {
    applicationIds: string[]
    action: 'approve' | 'reject' | 'request_documents' | 'assign_interview'
    actor: string
  }
) => {
  const results = []
  for (const applicationId of payload.applicationIds) {
    if (payload.action === 'approve') {
      results.push(await updateApplicationStage(agencyId, applicationId, 'Approved', payload.actor, 'Bulk approval'))
    } else if (payload.action === 'reject') {
      results.push(await updateApplicationStage(agencyId, applicationId, 'Rejected', payload.actor, 'Bulk rejection'))
    } else if (payload.action === 'request_documents') {
      results.push(await updateApplicationStage(agencyId, applicationId, 'Documents Submitted', payload.actor, 'Bulk document request'))
    } else if (payload.action === 'assign_interview') {
      results.push(await updateApplicationStage(agencyId, applicationId, 'Screening Interview', payload.actor, 'Bulk interview assignment'))
    }
  }
  return results
}

const requirementIncludes = (text: string, terms: string[]) =>
  terms.some((term) => text.includes(term.toLowerCase()))

export const matchApplicationsToRequirement = async (
  agencyId: number,
  payload: {
    requestId?: string
    inquiryId?: number
    requirementText: string
    top?: number
  }
) => {
  const data = await readData()
  const applications = data.applications.filter(
    (item) =>
      item.agencyId === agencyId &&
      ['Approved', 'Ready For Client Matching', 'Placed'].includes(item.status)
  )
  const profilesByApplication = new Map(data.profiles.map((profile) => [profile.applicationId, profile]))
  const scoresByApplication = new Map(data.scores.map((score) => [score.applicationId, score]))
  const requirement = payload.requirementText.toLowerCase()

  const ranked = applications
    .map((application) => {
      const profile = profilesByApplication.get(application.id)
      const score = scoresByApplication.get(application.id)
      if (!profile || !score) return null
      let compatibility = score.score * 0.55
      const skillsMatched: string[] = []
      const missingRequirements: string[] = []

      if (requirementIncludes(requirement, ['indonesian', 'filipino', 'myanmar', 'indian'])) {
        if (requirement.includes(profile.nationality.toLowerCase().split(' ')[0])) {
          compatibility += 15
          skillsMatched.push(`Nationality: ${profile.nationality}`)
        } else {
          missingRequirements.push('Preferred nationality mismatch')
        }
      }
      if (requirementIncludes(requirement, ['newborn'])) {
        if (profile.newbornCareExperience > 0) {
          compatibility += 10
          skillsMatched.push('Newborn care experience')
        } else missingRequirements.push('No newborn care experience')
      }
      if (requirementIncludes(requirement, ['childcare', 'child'])) {
        if (profile.childcareExperience > 0) {
          compatibility += 8
          skillsMatched.push('Childcare experience')
        } else missingRequirements.push('No childcare experience')
      }
      if (requirementIncludes(requirement, ['elderly'])) {
        if (profile.elderlyCareExperience > 0) {
          compatibility += 8
          skillsMatched.push('Elderly care experience')
        } else missingRequirements.push('No elderly care experience')
      }
      if (requirementIncludes(requirement, ['disabled'])) {
        if (profile.disabledCareExperience > 0) {
          compatibility += 8
          skillsMatched.push('Disabled care experience')
        } else missingRequirements.push('No disabled care experience')
      }
      if (requirementIncludes(requirement, ['chinese food', 'chinese'])) {
        if (profile.cookingSkills.some((item) => item.toLowerCase().includes('chinese'))) {
          compatibility += 8
          skillsMatched.push('Can cook Chinese food')
        } else missingRequirements.push('Chinese cooking not confirmed')
      }
      if (requirementIncludes(requirement, ['english'])) {
        if (profile.languageSkills.some((item) => item.toLowerCase().includes('english'))) {
          compatibility += 6
          skillsMatched.push('Speaks English')
        } else missingRequirements.push('English not confirmed')
      }
      const budgetMatch = requirement.match(/(\d{3,4})/)
      if (budgetMatch && profile.expectedSalary != null) {
        const budget = Number(budgetMatch[1])
        if (profile.expectedSalary <= budget) {
          compatibility += 8
          skillsMatched.push(`Salary within budget (${profile.expectedSalary})`)
        } else {
          missingRequirements.push(`Salary above budget (${profile.expectedSalary})`)
        }
      }
      if (requirementIncludes(requirement, ['immediately', 'immediate'])) {
        if (!profile.availableDate || new Date(profile.availableDate).getTime() <= Date.now() + 7 * 86400000) {
          compatibility += 5
          skillsMatched.push('Available immediately')
        } else {
          missingRequirements.push('Not immediately available')
        }
      }
      compatibility = clamp(Math.round(compatibility))
      const recommendation =
        compatibility >= 85
          ? 'Strong fit for the inquiry'
          : compatibility >= 70
          ? 'Good fit with minor gaps'
          : compatibility >= 55
          ? 'Potential fit that needs recruiter review'
          : 'Low confidence match'
      return { application, profile, compatibility, skillsMatched, missingRequirements, recommendation }
    })
    .filter(Boolean)
    .sort((a, b) => (b?.compatibility ?? 0) - (a?.compatibility ?? 0))
    .slice(0, payload.top ?? 10)

  const dataToPersist = await readData()
  for (const item of ranked) {
    if (!item) continue
    dataToPersist.matches = dataToPersist.matches.filter(
      (match) =>
        !(
          match.applicationId === item.application.id &&
          match.requestId === payload.requestId &&
          match.inquiryId === payload.inquiryId
        )
    )
    dataToPersist.matches.unshift({
      id: randomUUID(),
      applicationId: item.application.id,
      requestId: payload.requestId,
      inquiryId: payload.inquiryId,
      compatibilityScore: item.compatibility,
      skillsMatched: item.skillsMatched,
      missingRequirements: item.missingRequirements,
      recommendation: item.recommendation,
      createdAt: now(),
    })
  }
  await writeData(dataToPersist)

  return ranked.map((item) => ({
    applicationId: item!.application.id,
    maidReferenceCode: item!.application.maidReferenceCode,
    candidateName: item!.profile.fullName,
    status: item!.application.status,
    qualificationScore:
      data.scores.find((score) => score.applicationId === item!.application.id)?.score ?? 0,
    matchScore: item!.compatibility,
    skillsMatched: item!.skillsMatched,
    missingRequirements: item!.missingRequirements,
    recommendation: item!.recommendation,
  }))
}

export const getAtsDashboard = async (agencyId: number) => {
  const data = await readData()
  const items = data.applications.filter(
    (item) => item.agencyId === agencyId && item.source === 'resume_upload'
  )
  const scores = data.scores.filter((item) =>
    items.some((application) => application.id === item.applicationId)
  )
  const avgScore =
    scores.length > 0 ? Math.round(scores.reduce((sum, item) => sum + item.score, 0) / scores.length) : 0
  const approved = items.filter((item) => item.status === 'Approved').length
  const placed = items.filter((item) => item.status === 'Placed').length
  const approvalDurations = items
    .filter((item) => item.approvedAt)
    .map((item) => new Date(item.approvedAt!).getTime() - new Date(item.appliedAt).getTime())
  return {
    totalApplicants: items.length,
    newApplicants: items.filter((item) => item.status === 'New Applicant').length,
    interviewedCandidates: items.filter((item) => stageOrder.indexOf(item.status) >= stageOrder.indexOf('Screening Interview')).length,
    approvedCandidates: approved,
    rejectedCandidates: items.filter((item) => item.status === 'Rejected').length,
    readyForMatching: items.filter((item) => item.status === 'Ready For Client Matching').length,
    placedHelpers: placed,
    averageQualificationScore: avgScore,
    averageTimeToApprovalDays:
      approvalDurations.length > 0
        ? Math.round(approvalDurations.reduce((sum, item) => sum + item, 0) / approvalDurations.length / 86400000)
        : 0,
    placementSuccessRate: approved > 0 ? Math.round((placed / approved) * 100) : 0,
    funnel: stageOrder.map((stage) => ({
      stage,
      count: items.filter((item) => item.status === stage).length,
    })),
  }
}

export const saveAtsFilterPreset = async (
  agencyId: number,
  name: string,
  filters: Record<string, unknown>
) => {
  const data = await readData()
  const record = {
    id: randomUUID(),
    agencyId,
    name,
    filters,
    createdAt: now(),
  }
  data.savedFilters.unshift(record)
  await writeData(data)
  return record
}

export const getAtsFilterPresets = async (agencyId: number) => {
  const data = await readData()
  const defaults = [
    { id: 'preset-childcare', agencyId, name: 'Experienced Childcare Helpers', filters: { childcareExperience: true, minExperience: 3 }, createdAt: now() },
    { id: 'preset-newborn', agencyId, name: 'Newborn Specialists', filters: { newbornCareExperience: true }, createdAt: now() },
    { id: 'preset-elderly', agencyId, name: 'Elderly Care Specialists', filters: { elderlyCareExperience: true }, createdAt: now() },
    { id: 'preset-cooking', agencyId, name: 'Cooking Experts', filters: { cookingSkills: ['Chinese food'] }, createdAt: now() },
    { id: 'preset-ready', agencyId, name: 'Ready For Deployment', filters: { status: ['Ready For Client Matching', 'Approved'] }, createdAt: now() },
    { id: 'preset-approved', agencyId, name: 'Approved Helpers', filters: { status: ['Approved'] }, createdAt: now() },
  ]
  return [...defaults, ...data.savedFilters.filter((item) => item.agencyId === agencyId)]
}
