export interface AgencyAdminUser {
  id: number;
  agencyId: number;
  agency_id?: number;
  username: string;
  email?: string;
  emailVerified?: boolean;
  role?: "admin" | "agency" | "staff";
  agencyName: string;
  profileImageUrl?: string;
  createdAt: string;
}

const TOKEN_KEY = "agency_admin_token";
const ADMIN_KEY = "agency_admin_user";

export const saveAgencyAdminAuth = (token: string, admin: AgencyAdminUser) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(
    ADMIN_KEY,
    JSON.stringify({
      ...admin,
      agencyId:
        typeof admin.agencyId === "number"
          ? admin.agencyId
          : typeof admin.agency_id === "number"
            ? admin.agency_id
            : 1,
      agency_id:
        typeof admin.agency_id === "number"
          ? admin.agency_id
          : typeof admin.agencyId === "number"
            ? admin.agencyId
            : 1,
    }),
  );
};

export const clearAgencyAdminAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
};

export const getAgencyAdminToken = () => localStorage.getItem(TOKEN_KEY);

export const getStoredAgencyAdmin = (): AgencyAdminUser | null => {
  const raw = localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;

  try {
    const admin = JSON.parse(raw) as AgencyAdminUser;
    const normalizedAgencyId =
      typeof admin.agencyId === "number"
        ? admin.agencyId
        : typeof admin.agency_id === "number"
          ? admin.agency_id
          : null;
    if (normalizedAgencyId == null) return null;
    return {
      ...admin,
      agencyId: normalizedAgencyId,
      agency_id: normalizedAgencyId,
    };
  } catch {
    return null;
  }
};

export const getAgencyAdminAuthHeaders = () => {
  const token = getAgencyAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
