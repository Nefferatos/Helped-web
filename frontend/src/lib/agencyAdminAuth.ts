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
const LOGIN_SESSION_KEY = "agency_admin_login_session";
const WELCOME_SHOWN_SESSION_KEY = "agency_admin_welcome_shown_session";

const createLoginSessionId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

type SaveAgencyAdminAuthOptions = {
  refreshLoginSession?: boolean;
};

export const saveAgencyAdminAuth = (
  token: string,
  admin: AgencyAdminUser,
  options?: SaveAgencyAdminAuthOptions,
) => {
  const refreshLoginSession = options?.refreshLoginSession ?? true;

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

  if (refreshLoginSession || !localStorage.getItem(LOGIN_SESSION_KEY)) {
    localStorage.setItem(LOGIN_SESSION_KEY, createLoginSessionId());
  }
};

export const clearAgencyAdminAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
  localStorage.removeItem(LOGIN_SESSION_KEY);
  localStorage.removeItem(WELCOME_SHOWN_SESSION_KEY);
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

export const shouldShowAgencyAdminWelcome = () => {
  const loginSession = localStorage.getItem(LOGIN_SESSION_KEY);
  if (!loginSession || !getAgencyAdminToken()) return false;
  return localStorage.getItem(WELCOME_SHOWN_SESSION_KEY) !== loginSession;
};

export const markAgencyAdminWelcomeShown = () => {
  const loginSession = localStorage.getItem(LOGIN_SESSION_KEY);
  if (!loginSession) return;
  localStorage.setItem(WELCOME_SHOWN_SESSION_KEY, loginSession);
};
