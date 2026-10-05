import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { query, sql } from '../db'
import { getAuthenticatedAgencyAdmin, getRequestAgencyId } from '../auth'
import {
  bulkUpdateApplications,
  createPublicAtsApplication,
  ensureApplicationForMaid,
  getAtsApplication,
  getAtsDashboard,
  getAtsFilterPresets,
  getUnreadAtsApplicationCount,
  getPublicAtsApplicationSummary,
  initializeAtsStore,
  listAtsApplications,
  matchApplicationsToRequirement,
  markAtsApplicationsViewed,
  saveAtsFilterPreset,
  updateApplicationStage,
  upsertBackgroundCheck,
  upsertInterview,
  type PublicApplicantFileInput,
} from '../atsStore'
import { getMaidsStore } from '../store'
import { sendWorkflowToMake } from '../services/workflowOrchestrationService'

const publicMaidReferralController = async (req: Request, res: Response) => {
  const stringField = (value: unknown) =>
    typeof value === 'string' ? value.trim() : ''

  const referrerName = stringField(req.body?.referrerName)
  const referrerPhone = stringField(req.body?.referrerPhone)
  const maidName = stringField(req.body?.maidName)
  const maidPhone = stringField(req.body?.maidPhone)
  const maidNationality = stringField(req.body?.maidNationality)
  const relationship = stringField(req.body?.relationship)
  const notes = stringField(req.body?.notes)

  if (!referrerName || referrerName.length > 160) {
    return res.status(400).json({ error: 'A valid referrer name is required' })
  }
  if (!maidName || maidName.length > 160) {
    return res.status(400).json({ error: 'A valid maid name is required' })
  }
  if (!/^[+\d()\s.-]{7,40}$/.test(referrerPhone) || referrerPhone.replace(/\D/g, '').length < 7) {
    return res.status(400).json({ error: 'A valid referrer phone number is required' })
  }
  if (maidPhone && (!/^[+\d()\s.-]{7,40}$/.test(maidPhone) || maidPhone.replace(/\D/g, '').length < 7)) {
    return res.status(400).json({ error: 'Enter a valid maid phone number or leave it blank' })
  }
  if (maidNationality.length > 100 || relationship.length > 160 || notes.length > 1000) {
    return res.status(400).json({ error: 'Referral details are too long' })
  }
  if (req.body?.consent !== true) {
    return res.status(400).json({ error: 'Permission to share the maid’s contact details is required' })
  }

  const webhookUrl = process.env.MAKE_WEBHOOK_URL_MAID_REFERRAL?.trim()
  if (!webhookUrl) {
    return res.status(503).json({ error: 'Maid referrals are temporarily unavailable' })
  }
  try {
    if (new URL(webhookUrl).protocol !== 'https:') {
      return res.status(503).json({ error: 'Maid referral webhook must use HTTPS' })
    }
  } catch {
    return res.status(503).json({ error: 'Maid referral webhook is not configured correctly' })
  }

  try {
    const referralId = randomUUID()
    const result = await sendWorkflowToMake({
      scenario: 'maid_referral',
      url: webhookUrl,
      payload: {
        scenario: 'maid_referral',
        referralId,
        submittedAt: new Date().toISOString(),
        source: 'fdw_application_referral_chat',
        referrerName,
        referrerPhone,
        maidName,
        maidPhone,
        maidNationality,
        relationship,
        notes,
        consentToShareContact: true,
      },
    })
    if (!result.ok) {
      console.error('Maid referral Make delivery failed:', result.delivery.error)
      return res.status(502).json({ error: 'Referral could not be delivered. Please try again later.' })
    }
    return res.status(201).json({ referralId, message: 'Referral submitted successfully' })
  } catch (error) {
    console.error('Maid referral submission failed:', error)
    return res.status(500).json({ error: 'Referral could not be submitted. Please try again later.' })
  }
}

const actorNameFromRequest = async (req: Request) => {
  const admin = await getAuthenticatedAgencyAdmin(req)
  return admin?.username?.trim() || admin?.email?.trim() || 'Agency Staff'
}

const parseMultipartRequest = async (req: Request) => {
  const requestUrl = `${req.protocol}://${req.get('host') || 'localhost'}${req.originalUrl || req.url}`
  const requestCtor = (globalThis as typeof globalThis & {
    Request: new (
      input: string,
      init: {
        method: string
        headers: Record<string, string>
        body: unknown
        duplex: 'half'
      }
    ) => {
      formData: () => Promise<FormData>
    }
  }).Request

  const webRequest = new requestCtor(requestUrl, {
    method: req.method,
    headers: Object.fromEntries(
      Object.entries(req.headers).flatMap(([key, value]) =>
        typeof value === 'string' ? [[key, value]] : Array.isArray(value) ? [[key, value.join(', ')]] : []
      )
    ),
    body: req,
    duplex: 'half',
  })

  return await webRequest.formData()
}

const splitList = (value: unknown) =>
  Array.from(
    new Set(
      String(value ?? '')
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )

const toTrimmedString = (value: unknown) => String(value ?? '').trim()

const toBoolean = (value: unknown) => ['true', '1', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase())

const buildEmploymentHistoryRows = (formData: FormData) =>
  [1, 2, 3].flatMap((row) => {
    const record = {
      from: toTrimmedString(formData.get(`employmentHistory${row}From`)),
      to: toTrimmedString(formData.get(`employmentHistory${row}To`)),
      country: toTrimmedString(formData.get(`employmentHistory${row}Country`)),
      employer: toTrimmedString(formData.get(`employmentHistory${row}Employer`)),
      duties: toTrimmedString(formData.get(`employmentHistory${row}Duties`)),
      remarks: toTrimmedString(formData.get(`employmentHistory${row}Remarks`)),
    }

    return Object.values(record).some(Boolean) ? [record] : []
  })

const toFileInput = async (
  entry: unknown,
  kind: PublicApplicantFileInput['kind']
): Promise<PublicApplicantFileInput | null> => {
  if (!(entry instanceof File)) return null
  const arrayBuffer = await entry.arrayBuffer()
  return {
    kind,
    name: entry.name,
    type: entry.type || 'application/octet-stream',
    size: entry.size,
    buffer: Buffer.from(arrayBuffer),
  }
}

const toRequiredPhotoInput = async (
  formData: FormData,
  field: string,
  kind: PublicApplicantFileInput['kind'],
  label: string,
  width: number,
  height: number,
): Promise<PublicApplicantFileInput> => {
  const entry = formData.get(field)
  if (!(entry instanceof File) || entry.size === 0) {
    throw new Error(`${label} is required`)
  }
  if (entry.size > 5 * 1024 * 1024) {
    throw new Error(`${label} must be no larger than 5 MB`)
  }

  const source = Buffer.from(await entry.arrayBuffer())
  const image = sharp(source, { limitInputPixels: 40_000_000 })
  let metadata
  try {
    metadata = await image.metadata()
  } catch {
    throw new Error(`${label} must be a valid JPG or PNG image`)
  }
  if (metadata.format !== 'jpeg' && metadata.format !== 'png') {
    throw new Error(`${label} must be a JPG or PNG image`)
  }

  let buffer: Buffer
  try {
    buffer = await sharp(source, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 90 })
      .toBuffer()
  } catch {
    throw new Error(`${label} could not be processed. Please upload another image.`)
  }

  return {
    kind,
    name: `${label}.jpg`,
    type: 'image/jpeg',
    size: buffer.length,
    buffer,
  }
}

export const getAtsDashboardController = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    res.status(200).json(await getAtsDashboard(agencyId))
  } catch (error) {
    console.error('Error loading ATS dashboard:', error)
    res.status(500).json({ error: 'Failed to load ATS dashboard' })
  }
}

export const listAtsApplicationsController = async (req: Request, res: Response) => {
  try {
    await initializeAtsStore()
    const agencyId = await getRequestAgencyId(req)
    let filters: Record<string, unknown> = {}
    if (typeof req.query.filters === 'string' && req.query.filters.trim()) {
      try {
        const parsed = JSON.parse(req.query.filters)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          filters = parsed as Record<string, unknown>
        }
      } catch {
        return res.status(400).json({ error: 'Invalid filters JSON' })
      }
    }
    const result = await listAtsApplications(agencyId, {
      query: typeof req.query.q === 'string' ? req.query.q : undefined,
      sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
      page: Number(req.query.page ?? 1),
      pageSize: Number(req.query.pageSize ?? 20),
      filters,
    })
    res.status(200).json(result)
  } catch (error) {
    console.error('Error listing ATS applications:', error)
    res.status(500).json({ error: 'Failed to list ATS applications' })
  }
}

export const getUnreadAtsApplicationCountController = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const unreadCount = await getUnreadAtsApplicationCount(agencyId)
    res.status(200).json({ unreadCount, count: unreadCount })
  } catch (error) {
    console.error('Error fetching unread applicant count:', error)
    res.status(500).json({ error: 'Failed to fetch unread applicant count' })
  }
}

export const markAtsApplicationsViewedController = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const markedCount = await markAtsApplicationsViewed(agencyId)
    res.status(200).json({ ok: true, markedCount })
  } catch (error) {
    console.error('Error marking applicants viewed:', error)
    res.status(500).json({ error: 'Failed to mark applicants viewed' })
  }
}

export const getAtsApplicationController = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const bundle = await getAtsApplication(agencyId, String(req.params.applicationId ?? ''))
    if (!bundle) return res.status(404).json({ error: 'Application not found' })
    res.status(200).json(bundle)
  } catch (error) {
    console.error('Error loading ATS application:', error)
    res.status(500).json({ error: 'Failed to load ATS application' })
  }
}

export const syncAtsFromMaidsController = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const maids = await getMaidsStore(undefined, undefined, agencyId)
    const created = []
    for (const maid of maids) {
      created.push(await ensureApplicationForMaid(maid))
    }
    res.status(200).json({ synced: created.length })
  } catch (error) {
    console.error('Error syncing ATS from maids:', error)
    res.status(500).json({ error: 'Failed to sync ATS applications from maids' })
  }
}

export const updateAtsStageController = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const actor = await actorNameFromRequest(req)
    const { stage, reason } = req.body as { stage?: string; reason?: string }
    if (!stage?.trim()) return res.status(400).json({ error: 'stage is required' })
    const result = await updateApplicationStage(
      agencyId,
      String(req.params.applicationId ?? ''),
      stage as never,
      actor,
      reason?.trim() || `Stage changed to ${stage}`
    )
    res.status(200).json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'APPLICATION_NOT_FOUND') {
      return res.status(404).json({ error: 'Application not found' })
    }
    console.error('Error updating ATS stage:', error)
    res.status(500).json({ error: 'Failed to update application stage' })
  }
}

export const upsertInterviewController = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const applicationId = String(req.params.applicationId ?? '')
    const payload = req.body
    const result = await upsertInterview(agencyId, applicationId, payload)
    res.status(200).json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'APPLICATION_NOT_FOUND') {
      return res.status(404).json({ error: 'Application not found' })
    }
    console.error('Error saving interview:', error)
    res.status(500).json({ error: 'Failed to save interview' })
  }
}

export const upsertBackgroundCheckController = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const applicationId = String(req.params.applicationId ?? '')
    const payload = req.body
    const result = await upsertBackgroundCheck(agencyId, applicationId, payload)
    res.status(200).json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'APPLICATION_NOT_FOUND') {
      return res.status(404).json({ error: 'Application not found' })
    }
    console.error('Error saving background check:', error)
    res.status(500).json({ error: 'Failed to save background check' })
  }
}

export const bulkAtsActionController = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const actor = await actorNameFromRequest(req)
    const { applicationIds, action } = req.body as {
      applicationIds?: string[]
      action?: 'approve' | 'reject' | 'request_documents' | 'assign_interview'
    }
    if (!Array.isArray(applicationIds) || applicationIds.length === 0 || !action) {
      return res.status(400).json({ error: 'applicationIds and action are required' })
    }
    const result = await bulkUpdateApplications(agencyId, { applicationIds, action, actor })
    res.status(200).json({ updated: result.length, data: result })
  } catch (error) {
    console.error('Error processing bulk ATS action:', error)
    res.status(500).json({ error: 'Failed to process bulk ATS action' })
  }
}

export const matchAtsApplicationsController = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const { requestId, inquiryId, requirementText, top } = req.body as {
      requestId?: string
      inquiryId?: number
      requirementText?: string
      top?: number
    }
    if (!requirementText?.trim()) {
      return res.status(400).json({ error: 'requirementText is required' })
    }
    const matches = await matchApplicationsToRequirement(agencyId, {
      requestId,
      inquiryId,
      requirementText,
      top,
    })
    res.status(200).json({ matches })
  } catch (error) {
    console.error('Error matching ATS applications:', error)
    res.status(500).json({ error: 'Failed to match applications' })
  }
}

export const listAtsPresetsController = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    res.status(200).json({ presets: await getAtsFilterPresets(agencyId) })
  } catch (error) {
    console.error('Error loading ATS presets:', error)
    res.status(500).json({ error: 'Failed to load ATS presets' })
  }
}

export const saveAtsPresetController = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const { name, filters } = req.body as { name?: string; filters?: Record<string, unknown> }
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
    const preset = await saveAtsFilterPreset(agencyId, name.trim(), filters ?? {})
    res.status(201).json({ preset })
  } catch (error) {
    console.error('Error saving ATS preset:', error)
    res.status(500).json({ error: 'Failed to save ATS preset' })
  }
}

export const submitPublicMaidReferralController = publicMaidReferralController

export const createPublicAtsApplicationController = async (req: Request, res: Response) => {
  try {
    const formData = await parseMultipartRequest(req)
    const rawAgencyId = formData.get('agencyId')
    const agencyId = Number(rawAgencyId)
    if (!rawAgencyId || !Number.isInteger(agencyId) || agencyId <= 0) {
      return res.status(400).json({ error: 'agencyId is required' })
    }
    const fullName = String(formData.get('fullName') ?? '').trim()
    const contactNumber = String(formData.get('contactNumber') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()

    if (!fullName) return res.status(400).json({ error: 'fullName is required' })
    if (!contactNumber) return res.status(400).json({ error: 'contactNumber is required' })
    if (!email) return res.status(400).json({ error: 'email is required' })

    const requiredAddMaidFields: Array<[string, string]> = [
      ['nationality', 'nationality'],
      ['dateOfBirth', 'date of birth'],
    ]
    const missingField = requiredAddMaidFields.find(([field]) => !toTrimmedString(formData.get(field)))
    if (missingField) {
      return res.status(400).json({ error: `${missingField[1]} is required` })
    }

    const filePairs: Array<[string, PublicApplicantFileInput['kind']]> = [
      ['resume', 'resume'],
      ['passport', 'passport'],
      ['workPermit', 'work_permit'],
      ['medical', 'medical'],
      ['introVideo', 'video'],
      ['references', 'reference'],
      ['otherDocuments', 'other'],
      ['certificates', 'certificate'],
    ]

    const files: PublicApplicantFileInput[] = []
    for (const [field, kind, label, width, height] of [
      ['passportPhoto', 'passport_photo', 'Passport-size photo', 100, 125],
      ['fullBodyPhoto', 'full_body_photo', 'Full-body photo', 240, 400],
    ] as const) {
      try {
        files.push(await toRequiredPhotoInput(formData, field, kind, label, width, height))
      } catch (error) {
        return res.status(400).json({
          error: error instanceof Error ? error.message : `${label} is invalid`,
        })
      }
    }

    const employmentPreference = toTrimmedString(formData.get('employmentPreference')).toLowerCase()
    const workedInSingapore = toTrimmedString(formData.get('workedInSingapore')).toLowerCase() === 'yes'
    const workPermitRequired =
      employmentPreference.includes('transfer') ||
      employmentPreference.includes('singapore') ||
      workedInSingapore
    const hasValidWorkPermitFile = (file: File) =>
      ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) ||
      /\.(pdf|jpe?g|png)$/i.test(file.name)
    let workPermitUploadCount = 0
    for (const entry of formData.getAll('workPermit')) {
      if (!(entry instanceof File) || entry.size === 0) continue
      workPermitUploadCount += 1
      if (!hasValidWorkPermitFile(entry)) {
        return res.status(400).json({ error: 'Work Permit card must be a PDF, JPG, or PNG file' })
      }
    }
    if (workPermitRequired && workPermitUploadCount === 0) {
      return res.status(400).json({ error: 'Work Permit card is required for transfer and ex-Singapore applicants' })
    }

    for (const [field, kind] of filePairs) {
      for (const entry of formData.getAll(field)) {
        const file = await toFileInput(entry, kind)
        if (file) files.push(file)
      }
    }

    const fdwFieldNames = [
      'placeOfBirth',
      'heightCm',
      'weightKg',
      'residentialAddressLine1',
      'residentialAddressLine2',
      'repatriationPort',
      'homeCountryContactNumber',
      'religion',
      'educationLevel',
      'numberOfSiblings',
      'numberOfChildren',
      'childrenAges',
      'allergies',
      'physicalDisabilities',
      'dietaryRestrictions',
      'foodPreference',
      'foodPreferenceOther',
      'restDayPreference',
      'otherRemarksA3',
      'sgInfantsChildrenAssessment',
      'sgElderlyAssessment',
      'sgDisabledAssessment',
      'sgHouseworkAssessment',
      'sgCookingAssessment',
      'sgLanguageAssessment',
      'sgOtherSkills',
      'sgOtherSkillsAssessment',
      'foreignTrainingCentreName',
      'thirdPartyCertificationDetails',
      'overseasInfantsChildrenAssessment',
      'overseasElderlyAssessment',
      'overseasDisabledAssessment',
      'overseasHouseworkAssessment',
      'overseasCookingAssessment',
      'overseasLanguageAssessment',
      'overseasOtherSkills',
      'overseasOtherSkillsAssessment',
      'feedbackEmployer1',
      'feedbackEmployer2',
      'otherRemarksE',
      'medicalConditions',
    ] as const

    const fdwBooleanFieldNames = [
      'workedInSingapore',
      'willingToHandleInfants',
      'willingToHandleElderly',
      'willingToHandleDisabled',
      'willingToDoHousework',
      'willingToCook',
    ] as const

    const fdwFormData = Object.fromEntries([
      ...fdwFieldNames.map((field) => [field, toTrimmedString(formData.get(field))]),
      ...fdwBooleanFieldNames.map((field) => [field, toBoolean(formData.get(field))]),
    ])

    const workHistory = buildEmploymentHistoryRows(formData)

    const created = await createPublicAtsApplication({
      agencyId,
      fullName,
      email,
      contactNumber,
      nationality: String(formData.get('nationality') ?? '').trim(),
      dateOfBirth: String(formData.get('dateOfBirth') ?? '').trim(),
      gender: String(formData.get('gender') ?? 'Female').trim(),
      maritalStatus: String(formData.get('maritalStatus') ?? '').trim(),
      address: String(formData.get('address') ?? '').trim(),
      yearsOfExperience: Number(formData.get('yearsOfExperience') ?? 0) || 0,
      previousCountriesWorkedIn: splitList(formData.get('previousCountriesWorkedIn')),
      childcareExperience: Number(formData.get('childcareExperience') ?? 0) || 0,
      newbornCareExperience: Number(formData.get('newbornCareExperience') ?? 0) || 0,
      elderlyCareExperience: Number(formData.get('elderlyCareExperience') ?? 0) || 0,
      disabledCareExperience: Number(formData.get('disabledCareExperience') ?? 0) || 0,
      housekeepingExperience: Number(formData.get('housekeepingExperience') ?? 0) || 0,
      cookingSkills: splitList(formData.get('cookingSkills')),
      petCareExperience: Number(formData.get('petCareExperience') ?? 0) || 0,
      languageSkills: splitList(formData.get('languageSkills')),
      certifications: splitList(formData.get('certifications')),
      trainingRecords: splitList(formData.get('trainingRecords')),
      availableDate: String(formData.get('availableDate') ?? '').trim(),
      expectedSalary: Number.isFinite(Number(formData.get('expectedSalary') ?? NaN))
        ? Number(formData.get('expectedSalary'))
        : null,
      employmentPreference: String(formData.get('employmentPreference') ?? '').trim(),
      coverNote: String(formData.get('coverNote') ?? '').trim(),
      workHistory,
      fdwFormData,
      files,
    })
    const referralCode = String(formData.get('referralCode') ?? '').trim()
    if (referralCode) {
      void query(sql`
        INSERT INTO public.referrals (agency_id, referrer_id, application_id)
        SELECT ${agencyId}, id, ${created.applicationId} FROM public.referrers
        WHERE agency_id = ${agencyId} AND referral_code = ${referralCode} AND active = TRUE
        ON CONFLICT (referrer_id, application_id) DO NOTHING
      `).catch((error) => console.warn('Referral recording failed (non-fatal):', error))
    }

    res.status(201).json(created)
  } catch (error) {
    console.error('Error creating public ATS application:', error)
    res.status(500).json({ error: 'Failed to submit application' })
  }
}

export const getPublicAtsApplicationSummaryController = async (req: Request, res: Response) => {
  try {
    const accessToken = String(req.query.token ?? '').trim()
    if (!accessToken) return res.status(400).json({ error: 'token is required' })
    const summary = await getPublicAtsApplicationSummary(String(req.params.applicationId ?? ''), accessToken)
    if (!summary) return res.status(404).json({ error: 'Application not found' })
    res.status(200).json(summary)
  } catch (error) {
    console.error('Error loading public ATS application summary:', error)
    res.status(500).json({ error: 'Failed to load application summary' })
  }
}
