/**
 * Reusable Design System Components
 * Common patterns used across the application
 */

import React from "react";
import { tokens, getStatusConfig, getPriorityConfig } from "@/lib/design-tokens";

// Status Badge Component
export function StatusBadge({ status, className = "" }: { status?: string; className?: string }) {
  const config = getStatusConfig(status);
  const label = status?.replace(/_/g, " ") || "Unknown";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
      style={{ background: config.bg, color: config.color }}
    >
      {label}
    </span>
  );
}

// Priority Badge Component
export function PriorityBadge({ priority, className = "" }: { priority?: string; className?: string }) {
  const config = getPriorityConfig(priority);
  const label = priority || "Low";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
      style={{ background: config.bg, color: config.color }}
    >
      {label}
    </span>
  );
}

// Page Header Component
export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: tokens.colors.primary.DEFAULT }}
          >
            {icon}
          </div>
        )}
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: tokens.colors.text.primary }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-sm mt-0.5"
              style={{ color: tokens.colors.text.secondary }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// Empty State Component
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
        style={{ background: tokens.colors.primary.light }}
      >
        {icon}
      </div>
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: tokens.colors.text.primary }}
      >
        {title}
      </h3>
      <p
        className="text-sm max-w-md mb-6"
        style={{ color: tokens.colors.text.secondary }}
      >
        {description}
      </p>
      {action}
    </div>
  );
}

// Card with consistent styling
export function DesignCard({
  children,
  className = "",
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border ${padding ? "p-5" : ""} ${className}`}
      style={{
        background: tokens.colors.bg.card,
        borderColor: tokens.colors.border.DEFAULT,
      }}
    >
      {children}
    </div>
  );
}

// Section Header
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2
          className="text-base font-semibold"
          style={{ color: tokens.colors.text.primary }}
        >
          {title}
        </h2>
        {description && (
          <p
            className="text-sm mt-0.5"
            style={{ color: tokens.colors.text.secondary }}
          >
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

// Avatar with initials
export function AvatarInitials({
  name,
  size = 36,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        background: tokens.colors.primary.light,
        color: tokens.colors.primary.DEFAULT,
        fontSize: size * 0.35,
      }}
    >
      {initials}
    </div>
  );
}

// Info Row for details panels
export function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex justify-between py-2">
      <span
        className="text-sm"
        style={{ color: tokens.colors.text.secondary }}
      >
        {label}
      </span>
      <span
        className="text-sm font-medium"
        style={{ color: tokens.colors.text.primary }}
      >
        {value}
      </span>
    </div>
  );
}

// Tag pill component
export function TagPill({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        background: tokens.colors.primary.light,
        color: tokens.colors.primary.DEFAULT,
      }}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:opacity-70"
          style={{ color: tokens.colors.primary.DEFAULT }}
        >
          ×
        </button>
      )}
    </span>
  );
}
