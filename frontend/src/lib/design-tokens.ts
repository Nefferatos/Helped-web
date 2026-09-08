/**
 * Global Design System Tokens
 * Based on the reference UI/UX design
 */

export const tokens = {
  colors: {
    bg: {
      page: "#F6F4EF",
      card: "#FFFFFF",
      surface: "#F0EEE7",
      hover: "#F6F4EF",
      sidebar: "#FFFFFF",
      header: "#FFFFFF",
    },
    primary: {
      DEFAULT: "#1E6F52",
      dark: "#175C43",
      light: "#E4F1EA",
      foreground: "#FFFFFF",
    },
    text: {
      primary: "#1C231F",
      secondary: "#6B7268",
      muted: "#8B8F86",
      inverse: "#FFFFFF",
    },
    border: {
      DEFAULT: "#E3DFD4",
      light: "#F0EEE7",
    },
    status: {
      open: { color: "#1E6F52", bg: "#E4F1EA" },
      waiting: { color: "#B8781E", bg: "#FEF3E2" },
      resolved: { color: "#8B8F86", bg: "#F0EEE7" },
      closed: { color: "#8B8F86", bg: "#F0EEE7" },
    },
    priority: {
      urgent: { color: "#A23B3B", bg: "#FDE8E8" },
      high: { color: "#B8781E", bg: "#FEF3E2" },
      medium: { color: "#6B7268", bg: "#F0EEE7" },
      low: { color: "#8B8F86", bg: "#F6F4EF" },
    },
    destructive: { DEFAULT: "#A23B3B", light: "#FDE8E8", foreground: "#FFFFFF" },
    warning: { DEFAULT: "#B8781E", light: "#FEF3E2", foreground: "#FFFFFF" },
    success: { DEFAULT: "#1E6F52", light: "#E4F1EA", foreground: "#FFFFFF" },
  },
  spacing: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "20px", "2xl": "24px", "3xl": "32px" },
  radius: { sm: "6px", md: "8px", lg: "10px", xl: "12px", "2xl": "16px", full: "9999px" },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontSize: { xs: "12px", sm: "13px", base: "14px", lg: "16px", xl: "18px", "2xl": "20px", "3xl": "24px" },
    fontWeight: { normal: "400", medium: "500", semibold: "600", bold: "700" },
    lineHeight: { tight: "1.25", normal: "1.5", relaxed: "1.625" },
  },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.05)",
    md: "0 4px 6px -1px rgba(0,0,0,0.1)",
    lg: "0 10px 15px -3px rgba(0,0,0,0.1)",
    card: "0 1px 3px rgba(0,0,0,0.08)",
    dropdown: "0 12px 40px rgba(0,0,0,0.1)",
  },
  transitions: { fast: "150ms ease", normal: "200ms ease", slow: "300ms cubic-bezier(0.4,0,0.2,1)" },
} as const;

export function getStatusConfig(status?: string) {
  switch (status) {
    case "OPEN": return tokens.colors.status.open;
    case "WAITING_CLIENT": case "WAITING_SUPPORT": return tokens.colors.status.waiting;
    case "RESOLVED": return tokens.colors.status.resolved;
    case "CLOSED": return tokens.colors.status.closed;
    default: return tokens.colors.status.open;
  }
}

export function getPriorityConfig(priority?: string) {
  switch (priority) {
    case "URGENT": return tokens.colors.priority.urgent;
    case "HIGH": return tokens.colors.priority.high;
    case "MEDIUM": return tokens.colors.priority.medium;
    default: return tokens.colors.priority.low;
  }
}