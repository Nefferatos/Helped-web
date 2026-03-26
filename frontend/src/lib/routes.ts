export const ADMIN_BASE = "/agencyadmin";

export const adminPath = (path = "") => {
  if (!path || path === "/") {
    return ADMIN_BASE;
  }

  return `${ADMIN_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};
