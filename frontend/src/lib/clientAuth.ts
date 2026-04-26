import { supabase } from "@/lib/supabaseClient";

export interface ClientUser {
  id: number;
  name: string;
  company?: string;
  phone?: string;
  email: string;
  emailVerified?: boolean;
  profileImageUrl?: string;
  createdAt: string;
}

let clientUserCache: ClientUser | null = null;
let clientAccessTokenCache: string | null = null;

export const saveClientAuth = (token: string | null, client: ClientUser | null) => {
  clientAccessTokenCache = token || null;
  clientUserCache = client;
};

export const clearClientAuth = () => {
  clientAccessTokenCache = null;
  clientUserCache = null;
};

export const getClientToken = () => clientAccessTokenCache;

export const getStoredClient = (): ClientUser | null => clientUserCache;

export const refreshClientToken = async () => {
  if (!supabase) {
    clientAccessTokenCache = null;
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    clientAccessTokenCache = null;
    throw error;
  }

  clientAccessTokenCache = data.session?.access_token || null;
  return clientAccessTokenCache;
};

export const getClientAuthHeaders = () => {
  const token = getClientToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
