export const AGENCY_ROLES = [
  'SUPER_ADMIN', 'DOCUMENT_REVIEWER', 'RECRUITER', 'CONTRACTOR', 'EMPLOYER', 'CANDIDATE',
] as const

export type AgencyRole = typeof AGENCY_ROLES[number]
export type LegacyAgencyRole = 'admin' | 'agency' | 'staff' | 'contractor'
export type StoredAgencyRole = AgencyRole | LegacyAgencyRole

export const normalizeAgencyRole = (value: unknown): StoredAgencyRole => {
  const role = String(value ?? '').trim().toUpperCase()
  if ((AGENCY_ROLES as readonly string[]).includes(role)) return role as AgencyRole
  if (value === 'agency' || value === 'staff' || value === 'contractor' || value === 'admin') return value
  return 'RECRUITER'
}

export const hasAgencyRole = (role: StoredAgencyRole | undefined, allowed: readonly (AgencyRole | LegacyAgencyRole)[]) =>
  Boolean(role && allowed.includes(role))

export const isAgencyAdministrator = (role: StoredAgencyRole | undefined) =>
  hasAgencyRole(role, ['SUPER_ADMIN', 'admin', 'agency'])
