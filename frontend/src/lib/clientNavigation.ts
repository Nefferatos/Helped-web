export const DEFAULT_CLIENT_POST_LOGIN_PATH = "/client/home";

export const buildEmployerLoginPath = (redirectTo?: string) => {
  const target = redirectTo?.trim();
  if (!target) return "/employer-login";

  const params = new URLSearchParams();
  params.set("redirectTo", target);
  return `/employer-login?${params.toString()}`;
};

export const getClientPostLoginPath = (redirectTo?: string | null) => {
  const target = redirectTo?.trim();
  if (!target) return DEFAULT_CLIENT_POST_LOGIN_PATH;

  if (!target.startsWith("/")) return DEFAULT_CLIENT_POST_LOGIN_PATH;
  if (target.startsWith("//")) return DEFAULT_CLIENT_POST_LOGIN_PATH;

  return target;
};
