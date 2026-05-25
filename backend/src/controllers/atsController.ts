import { Request, Response } from 'express'
import { getAuthenticatedAgencyAdmin, getRequestAgencyId } from '../auth'
import {
  bulkUpdateApplications,
  createPublicAtsApplication,
  ensureApplicationForMaid,
  getAtsApplication,
  getAtsDashboard,
  getAtsFilterPresets,
  getPublicAtsApplicationSummary,
  initializeAtsStore,
  listAtsApplications,
  matchApplicationsToRequirement,
  saveAtsFilterPreset,
  updateApplicationStage,
  upsertBackgroundCheck,
  upsertInterview,
  type PublicApplicantFileInput,
} from '../atsStore'
import { getMaidsStore } from '../store'

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
    const filters =
      typeof req.query.filters === 'string' && req.query.filters.trim()
        ? (JSON.parse(req.query.filters) as Record<string, unknown>)
        : {}
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

export const createPublicAtsApplicationController = async (req: Request, res: Response) => {
  try {
    const formData = await parseMultipartRequest(req)
    const agencyId = Number(formData.get('agencyId') ?? 1) || 1
    const fullName = String(formData.get('fullName') ?? '').trim()
    const contactNumber = String(formData.get('contactNumber') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()

    if (!fullName) return res.status(400).json({ error: 'fullName is required' })
    if (!contactNumber) return res.status(400).json({ error: 'contactNumber is required' })
    if (!email) return res.status(400).json({ error: 'email is required' })

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
