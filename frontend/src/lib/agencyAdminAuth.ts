export interface AgencyAdminUser {
  id: number;
  username: string;
  email?: string;
  emailVerified?: boolean;
  agencyName: string;
  profileImageUrl?: string;
  createdAt: string;
}

const TOKEN_KEY = "agency_admin_token";
const ADMIN_KEY = "agency_admin_user";

export const saveAgencyAdminAuth = (token: string, admin: AgencyAdminUser) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
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
    return JSON.parse(raw) as AgencyAdminUser;
  } catch {
    return null;
  }
};

export const getAgencyAdminAuthHeaders = () => {
  const token = getAgencyAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
