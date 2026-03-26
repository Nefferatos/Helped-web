export interface ClientUser {
  id: number;
  name: string;
  company?: string;
  email: string;
  createdAt: string;
}

const TOKEN_KEY = "client_auth_token";
const CLIENT_KEY = "client_auth_user";

export const saveClientAuth = (token: string, client: ClientUser) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CLIENT_KEY, JSON.stringify(client));
};

export const clearClientAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CLIENT_KEY);
};

export const getClientToken = () => localStorage.getItem(TOKEN_KEY);

export const getStoredClient = (): ClientUser | null => {
  const raw = localStorage.getItem(CLIENT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ClientUser;
  } catch {
    return null;
  }
};

export const getClientAuthHeaders = () => {
  const token = getClientToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
