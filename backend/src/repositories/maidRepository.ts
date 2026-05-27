import { getClient, query } from '../db'

export interface SqlMaidRecord {
  id: number
  agencyId: number
  fullName: string
  referenceCode: string
  status: string
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

type MaidRow = {
  id: number
  agency_id: number
  full_name: string
  reference_code: string
  status: string | null
  type: string
  nationality: string
  date_of_birth: Date | string
  place_of_birth: string
  height: number
  weight: number
  religion: string
  marital_status: string
  number_of_children: number
  number_of_siblings: number
  home_address: string
  airport_repatriation: string
  education_level: string
  language_skills: Record<string, string> | null
  skills_preferences: Record<string, unknown> | null
  work_areas: Record<string, unknown> | null
  employment_history: Array<Record<string, unknown>> | null
  introduction: Record<string, unknown> | null
  agency_contact: Record<string, unknown> | null
  photo_data_urls: string[] | null
  photo_data_url: string | null
  video_data_url: string | null
  is_public: boolean | null
  has_photo: boolean | null
  created_at: Date | string
  updated_at: Date | string
}

const toIsoString = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()

const mapMaidRow = (row: MaidRow): SqlMaidRecord => {
  const normalizedPhotos = Array.isArray(row.photo_data_urls)
    ? row.photo_data_urls.filter((item) => typeof item === 'string' && item.trim().length > 0)
    : row.photo_data_url
    ? [row.photo_data_url]
    : []

  return {
    id: Number(row.id),
    agencyId: Number(row.agency_id),
    fullName: row.full_name ?? '',
    referenceCode: row.reference_code ?? '',
    status: row.status ?? 'available',
    type: row.type ?? '',
    nationality: row.nationality ?? '',
    dateOfBirth: toIsoString(row.date_of_birth).slice(0, 10),
    placeOfBirth: row.place_of_birth ?? '',
    height: Number(row.height ?? 0),
    weight: Number(row.weight ?? 0),
    religion: row.religion ?? '',
    maritalStatus: row.marital_status ?? '',
    numberOfChildren: Number(row.number_of_children ?? 0),
    numberOfSiblings: Number(row.number_of_siblings ?? 0),
    homeAddress: row.home_address ?? '',
    airportRepatriation: row.airport_repatriation ?? '',
    educationLevel: row.education_level ?? '',
    languageSkills:
      row.language_skills && typeof row.language_skills === 'object' ? row.language_skills : {},
    skillsPreferences:
      row.skills_preferences && typeof row.skills_preferences === 'object'
        ? row.skills_preferences
        : {},
    workAreas: row.work_areas && typeof row.work_areas === 'object' ? row.work_areas : {},
    employmentHistory: Array.isArray(row.employment_history) ? row.employment_history : [],
    introduction: row.introduction && typeof row.introduction === 'object' ? row.introduction : {},
    agencyContact:
      row.agency_contact && typeof row.agency_contact === 'object' ? row.agency_contact : {},
    photoDataUrls: normalizedPhotos,
    photoDataUrl: normalizedPhotos[0] ?? row.photo_data_url ?? '',
    videoDataUrl: row.video_data_url ?? '',
    isPublic: Boolean(row.is_public),
    hasPhoto: normalizedPhotos.length > 0 || Boolean(row.has_photo),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }
}

export type SqlMaidPayload = Omit<SqlMaidRecord, 'id' | 'agencyId' | 'createdAt' | 'updatedAt'>

type MaidListFilters = {
  search?: string
  visibility?: string
  agencyId?: number
}

type MaidListOptions = MaidListFilters & {
  offset?: number
  limit?: number
}

const maidColumnsSql = `
  agency_id,
  full_name,
  reference_code,
  status,
  type,
  nationality,
  date_of_birth,
  place_of_birth,
  height,
  weight,
  religion,
  marital_status,
  number_of_children,
  number_of_siblings,
  home_address,
  airport_repatriation,
  education_level,
  language_skills,
  skills_preferences,
  work_areas,
  employment_history,
  introduction,
  agency_contact,
  photo_data_urls,
  photo_data_url,
  video_data_url,
  is_public,
  has_photo
`

const maidListColumnsSql = `
  id,
  agency_id,
  full_name,
  reference_code,
  status,
  type,
  nationality,
  date_of_birth,
  place_of_birth,
  height,
  weight,
  religion,
  marital_status,
  number_of_children,
  number_of_siblings,
  airport_repatriation,
  education_level,
  photo_data_url,
  is_public,
  has_photo,
  created_at,
  updated_at
`

const buildMaidWhereClause = (filters: MaidListFilters) => {
  const conditions: string[] = []
  const values: unknown[] = []

  if (typeof filters.agencyId === 'number') {
    values.push(filters.agencyId)
    conditions.push(`agency_id = $${values.length}`)
  }
  if (filters.search?.trim()) {
    values.push(`%${filters.search.trim().toLowerCase()}%`)
    conditions.push(
      `(LOWER(full_name) LIKE $${values.length} OR LOWER(reference_code) LIKE $${values.length})`
    )
  }
  if (filters.visibility === 'public' || filters.visibility === 'hidden') {
    values.push(filters.visibility === 'public')
    conditions.push(`is_public = $${values.length}`)
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  }
}

const maidValues = (payload: SqlMaidPayload, agencyId: number) => [
  agencyId,
  payload.fullName,
  payload.referenceCode,
  payload.status ?? 'available',
  payload.type,
  payload.nationality,
  payload.dateOfBirth,
  payload.placeOfBirth,
  payload.height,
  payload.weight,
  payload.religion,
  payload.maritalStatus,
  payload.numberOfChildren,
  payload.numberOfSiblings,
  payload.homeAddress,
  payload.airportRepatriation,
  payload.educationLevel,
  JSON.stringify(payload.languageSkills ?? {}),
  JSON.stringify(payload.skillsPreferences ?? {}),
  JSON.stringify(payload.workAreas ?? {}),
  JSON.stringify(payload.employmentHistory ?? []),
  JSON.stringify(payload.introduction ?? {}),
  JSON.stringify(payload.agencyContact ?? {}),
  payload.photoDataUrls ?? [],
  payload.photoDataUrl ?? '',
  payload.videoDataUrl ?? '',
  payload.isPublic ?? false,
  payload.hasPhoto ?? false,
]

export const listMaidRecordsSql = async (filters: MaidListFilters) => {
  const { whereClause, values } = buildMaidWhereClause(filters)
  const result = (await query(
    `
      SELECT *
      FROM maids
      ${whereClause}
      ORDER BY updated_at DESC
    `,
    values
  )) as { rows: MaidRow[] }

  return result.rows.map(mapMaidRow)
}

export const countMaidRecordsSql = async (filters: MaidListFilters) => {
  const { whereClause, values } = buildMaidWhereClause(filters)
  const result = (await query(
    `
      SELECT COUNT(*)::int AS total
      FROM maids
      ${whereClause}
    `,
    values
  )) as { rows: Array<{ total: number }> }

  return Number(result.rows[0]?.total ?? 0)
}

export const listMaidRecordsPageSql = async (options: MaidListOptions) => {
  const { whereClause, values } = buildMaidWhereClause(options)
  const nextValues = [...values]
  let paginationClause = ''

  if (typeof options.limit === 'number' && options.limit > 0) {
    nextValues.push(options.limit)
    paginationClause += ` LIMIT $${nextValues.length}`
  }

  if (typeof options.offset === 'number' && options.offset >= 0) {
    nextValues.push(options.offset)
    paginationClause += ` OFFSET $${nextValues.length}`
  }

  const result = (await query(
    `
      SELECT ${maidListColumnsSql}
      FROM maids
      ${whereClause}
      ORDER BY updated_at DESC
      ${paginationClause}
    `,
    nextValues
  )) as { rows: MaidRow[] }

  return result.rows.map(mapMaidRow)
}

export const getMaidByReferenceCodeSql = async (
  referenceCode: string,
  options: { agencyId?: number; publicOnly?: boolean } = {}
) => {
  const conditions = [`reference_code = $1`]
  const values: unknown[] = [referenceCode]

  if (typeof options.agencyId === 'number') {
    values.push(options.agencyId)
    conditions.push(`agency_id = $${values.length}`)
  }
  if (options.publicOnly) {
    conditions.push(`is_public = true`)
  }

  const result = (await query(
    `
      SELECT *
      FROM maids
      WHERE ${conditions.join(' AND ')}
      LIMIT 1
    `,
    values
  )) as { rows: MaidRow[] }

  return result.rows[0] ? mapMaidRow(result.rows[0]) : null
}

export const createMaidSql = async (payload: SqlMaidPayload, agencyId: number) => {
  try {
    const result = (await query(
      `
        INSERT INTO maids (
          ${maidColumnsSql}
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18::jsonb, $19::jsonb, $20::jsonb, $21::jsonb, $22::jsonb,
          $23::jsonb, $24::jsonb, $25, $26, $27, $28
        )
        RETURNING *
      `,
      maidValues(payload, agencyId)
    )) as { rows: MaidRow[] }

    return mapMaidRow(result.rows[0])
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    ) {
      throw new Error('REFERENCE_CODE_EXISTS')
    }
    throw error
  }
}

export const updateMaidSql = async (
  referenceCode: string,
  payload: SqlMaidPayload,
  agencyId: number
) => {
  try {
    const result = (await query(
      `
        UPDATE maids
        SET
          full_name = $3,
          reference_code = $4,
          status = $5,
          type = $6,
          nationality = $7,
          date_of_birth = $8::date,
          place_of_birth = $9,
          height = $10,
          weight = $11,
          religion = $12,
          marital_status = $13,
          number_of_children = $14,
          number_of_siblings = $15,
          home_address = $16,
          airport_repatriation = $17,
          education_level = $18,
          language_skills = $19::jsonb,
          skills_preferences = $20::jsonb,
          work_areas = $21::jsonb,
          employment_history = $22::jsonb,
          introduction = $23::jsonb,
          agency_contact = $24::jsonb,
          photo_data_urls = $25::jsonb,
          photo_data_url = $26,
          video_data_url = $27,
          is_public = $28,
          has_photo = $29,
          updated_at = CURRENT_TIMESTAMP
        WHERE reference_code = $1 AND agency_id = $2
        RETURNING *
      `,
      [
        referenceCode,
        agencyId,
        payload.fullName,
        payload.referenceCode,
        payload.status ?? 'available',
        payload.type,
        payload.nationality,
        payload.dateOfBirth,
        payload.placeOfBirth,
        payload.height,
        payload.weight,
        payload.religion,
        payload.maritalStatus,
        payload.numberOfChildren,
        payload.numberOfSiblings,
        payload.homeAddress,
        payload.airportRepatriation,
        payload.educationLevel,
        JSON.stringify(payload.languageSkills ?? {}),
        JSON.stringify(payload.skillsPreferences ?? {}),
        JSON.stringify(payload.workAreas ?? {}),
        JSON.stringify(payload.employmentHistory ?? []),
        JSON.stringify(payload.introduction ?? {}),
        JSON.stringify(payload.agencyContact ?? {}),
        JSON.stringify(payload.photoDataUrls ?? []),
        payload.photoDataUrl ?? '',
        payload.videoDataUrl ?? '',
        payload.isPublic ?? false,
        payload.hasPhoto ?? false,
      ]
    )) as { rows: MaidRow[] }

    return result.rows[0] ? mapMaidRow(result.rows[0]) : null
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    ) {
      throw new Error('REFERENCE_CODE_EXISTS')
    }
    throw error
  }
}

export const updateMaidVisibilitySql = async (
  referenceCode: string,
  isPublic: boolean,
  agencyId: number
) => {
  const result = (await query(
    `
      UPDATE maids
      SET is_public = $3, updated_at = CURRENT_TIMESTAMP
      WHERE reference_code = $1 AND agency_id = $2
      RETURNING *
    `,
    [referenceCode, agencyId, isPublic]
  )) as { rows: MaidRow[] }
  return result.rows[0] ? mapMaidRow(result.rows[0]) : null
}

export const updateMaidMediaSql = async (
  referenceCode: string,
  patch: {
    photoDataUrls?: string[]
    photoDataUrl?: string
    videoDataUrl?: string
    hasPhoto?: boolean
  },
  agencyId: number
) => {
  const result = (await query(
    `
      UPDATE maids
      SET
        photo_data_urls = COALESCE($3::jsonb, photo_data_urls),
        photo_data_url = COALESCE($4, photo_data_url),
        video_data_url = COALESCE($5, video_data_url),
        has_photo = COALESCE($6, has_photo),
        updated_at = CURRENT_TIMESTAMP
      WHERE reference_code = $1 AND agency_id = $2
      RETURNING *
    `,
    [
      referenceCode,
      agencyId,
      patch.photoDataUrls !== undefined ? JSON.stringify(patch.photoDataUrls ?? []) : null,
      patch.photoDataUrl ?? null,
      patch.videoDataUrl ?? null,
      patch.hasPhoto ?? null,
    ]
  )) as { rows: MaidRow[] }

  return result.rows[0] ? mapMaidRow(result.rows[0]) : null
}

export const deleteMaidSql = async (referenceCode: string, agencyId: number) => {
  const result = (await query(
    `
      DELETE FROM maids
      WHERE reference_code = $1 AND agency_id = $2
      RETURNING *
    `,
    [referenceCode, agencyId]
  )) as { rows: MaidRow[] }

  return result.rows[0] ? mapMaidRow(result.rows[0]) : null
}

export const upsertMaidRecordsSql = async (
  records: SqlMaidPayload[],
  agencyId: number
) => {
  if (records.length === 0) {
    return { created: 0, updated: 0 }
  }

  const client = await getClient()

  try {
    await client.query('BEGIN')

    const referenceCodes = records.map((record) => record.referenceCode)
    const existingRows = await client.query<{ reference_code: string }>(
      `
        SELECT reference_code
        FROM maids
        WHERE agency_id = $1 AND reference_code = ANY($2::text[])
      `,
      [agencyId, referenceCodes]
    )
    const existingReferenceCodes = new Set(
      existingRows.rows.map((row) => row.reference_code)
    )

    const chunkSize = 25
    for (let start = 0; start < records.length; start += chunkSize) {
      const chunk = records.slice(start, start + chunkSize)
      const params: unknown[] = []
      const placeholders: string[] = []

      for (const record of chunk) {
        const values = maidValues(record, agencyId)
        const baseIndex = params.length
        params.push(...values)
        placeholders.push(
          `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}::date, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12}, $${baseIndex + 13}, $${baseIndex + 14}, $${baseIndex + 15}, $${baseIndex + 16}, $${baseIndex + 17}, $${baseIndex + 18}::jsonb, $${baseIndex + 19}::jsonb, $${baseIndex + 20}::jsonb, $${baseIndex + 21}::jsonb, $${baseIndex + 22}::jsonb, $${baseIndex + 23}::jsonb, $${baseIndex + 24}, $${baseIndex + 25}, $${baseIndex + 26}, $${baseIndex + 27}, $${baseIndex + 28})`
        )
      }

      await client.query(
        `
          INSERT INTO maids (
            ${maidColumnsSql}
          )
          VALUES
            ${placeholders.join(',\n            ')}
          ON CONFLICT (reference_code) DO UPDATE
          SET
            agency_id = EXCLUDED.agency_id,
            full_name = EXCLUDED.full_name,
            reference_code = EXCLUDED.reference_code,
            status = EXCLUDED.status,
            type = EXCLUDED.type,
            nationality = EXCLUDED.nationality,
            date_of_birth = EXCLUDED.date_of_birth,
            place_of_birth = EXCLUDED.place_of_birth,
            height = EXCLUDED.height,
            weight = EXCLUDED.weight,
            religion = EXCLUDED.religion,
            marital_status = EXCLUDED.marital_status,
            number_of_children = EXCLUDED.number_of_children,
            number_of_siblings = EXCLUDED.number_of_siblings,
            home_address = EXCLUDED.home_address,
            airport_repatriation = EXCLUDED.airport_repatriation,
            education_level = EXCLUDED.education_level,
            language_skills = EXCLUDED.language_skills,
            skills_preferences = EXCLUDED.skills_preferences,
            work_areas = EXCLUDED.work_areas,
            employment_history = EXCLUDED.employment_history,
            introduction = EXCLUDED.introduction,
            agency_contact = EXCLUDED.agency_contact,
            photo_data_urls = EXCLUDED.photo_data_urls,
            photo_data_url = EXCLUDED.photo_data_url,
            video_data_url = EXCLUDED.video_data_url,
            is_public = EXCLUDED.is_public,
            has_photo = EXCLUDED.has_photo,
            updated_at = CURRENT_TIMESTAMP
        `,
        params
      )
    }

    await client.query('COMMIT')
    return {
      created: records.length - existingReferenceCodes.size,
      updated: existingReferenceCodes.size,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
