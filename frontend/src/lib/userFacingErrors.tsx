import type { ReactNode } from "react";
import { AlertTriangle, CircleAlert } from "lucide-react";

export type UserFacingErrorKind =
  | "general"
  | "network"
  | "server"
  | "validation"
  | "unauthorized"
  | "notFound"
  | "database";

export interface UserFacingErrorMessage {
  kind: UserFacingErrorKind;
  title: string;
  description: string;
  actionLabel: "Try Again" | "Retry" | "Refresh" | "Contact Support" | "Go Back" | "Close";
  icon: ReactNode;
}

const TECHNICAL_ERROR_PATTERNS = [
  /\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bwhere\b|\bjoin\b/i,
  /\bSQL\b|\bPostgres\b|\bPrisma\b|\bSupabase\b|\bdatabase query\b/i,
  /\bTypeError\b|\bReferenceError\b|\bSyntaxError\b|\bstack\b|\bat\s+\w+/i,
  /\bECONNREFUSED\b|\bETIMEDOUT\b|\bENOTFOUND\b|\bEAI_AGAIN\b/i,
  /\{[\s\S]*\}|\[[\s\S]*\]/,
  /<html|<!doctype/i,
];

const hasTechnicalDetails = (message: string) =>
  TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message));

const textFromUnknown = (error: unknown): string => {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
};

export const getUserFacingError = (error: unknown): UserFacingErrorMessage => {
  const rawMessage = textFromUnknown(error).trim();
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("connection") ||
    normalized.includes("offline")
  ) {
    return {
      kind: "network",
      title: "Connection Lost",
      description: "Please check your internet connection and try again.",
      actionLabel: "Retry",
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />,
    };
  }

  if (
    normalized.includes("unauthorized") ||
    normalized.includes("session") ||
    normalized.includes("sign in") ||
    normalized.includes("login")
  ) {
    return {
      kind: "unauthorized",
      title: "Session Expired",
      description: "Your session has expired. Please sign in again to continue.",
      actionLabel: "Go Back",
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />,
    };
  }

  if (normalized.includes("not found") || normalized.includes("404")) {
    return {
      kind: "notFound",
      title: "Page Not Found",
      description: "The page you're looking for doesn't exist or has been moved.",
      actionLabel: "Go Back",
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />,
    };
  }

  if (
    normalized.includes("required") ||
    normalized.includes("invalid") ||
    normalized.includes("missing") ||
    normalized.includes("review")
  ) {
    return {
      kind: "validation",
      title: "Please review your information",
      description: "Some required fields are missing or contain invalid information.",
      actionLabel: "Close",
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />,
    };
  }

  if (normalized.includes("database") || normalized.includes("sql") || normalized.includes("postgres")) {
    return {
      kind: "database",
      title: "Unable to Process Request",
      description: "We couldn't complete your request at this time. Please try again later.",
      actionLabel: "Contact Support",
      icon: <CircleAlert className="h-5 w-5 text-red-600" aria-hidden="true" />,
    };
  }

  if (
    normalized.includes("500") ||
    normalized.includes("server") ||
    normalized.includes("temporarily unavailable") ||
    hasTechnicalDetails(rawMessage)
  ) {
    return {
      kind: "server",
      title: "Server Temporarily Unavailable",
      description: "Our server is experiencing an issue. Please try again later.",
      actionLabel: "Refresh",
      icon: <CircleAlert className="h-5 w-5 text-red-600" aria-hidden="true" />,
    };
  }

  return {
    kind: "general",
    title: "Something went wrong",
    description: "We're unable to complete your request right now. Please try again in a few moments.",
    actionLabel: "Try Again",
    icon: <CircleAlert className="h-5 w-5 text-red-600" aria-hidden="true" />,
  };
};

export const logTechnicalError = (context: string, error: unknown) => {
  if (typeof console === "undefined") return;
  console.error(`[${context}]`, error);
};
