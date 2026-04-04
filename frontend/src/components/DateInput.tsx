import { useEffect, useMemo, useState } from "react";

type Props = {
  value: string;
  onChange: (nextIsoDate: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const isIsoDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const isoToDmy = (iso: string) => {
  if (!isIsoDateOnly(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const dmyToIso = (raw: string) => {
  const match = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
};

// Date input that displays and accepts DD/MM/YYYY while storing YYYY-MM-DD (ISO date-only).
const DateInput = ({ value, onChange, disabled, className, placeholder = "DD/MM/YYYY" }: Props) => {
  const formattedFromProp = useMemo(() => (value ? isoToDmy(value) : ""), [value]);
  const [displayValue, setDisplayValue] = useState(formattedFromProp);

  useEffect(() => {
    setDisplayValue(formattedFromProp);
  }, [formattedFromProp]);

  const handleBlur = () => {
    const raw = displayValue.trim();
    if (!raw) {
      onChange("");
      return;
    }

    const iso = dmyToIso(raw);
    if (iso) {
      onChange(iso);
      setDisplayValue(isoToDmy(iso));
      return;
    }

    // Revert to last known good value.
    setDisplayValue(formattedFromProp);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      disabled={disabled}
      value={displayValue}
      onChange={(e) => {
        const next = e.target.value
          .replace(/[^\d/]/g, "")
          .replace(/\/{2,}/g, "/")
          .slice(0, 10);
        setDisplayValue(next);

        const iso = dmyToIso(next);
        if (iso) {
          onChange(iso);
        }
      }}
      onBlur={handleBlur}
      className={className ?? "w-full rounded-md border bg-background px-3 py-2 text-sm"}
    />
  );
};

export default DateInput;

