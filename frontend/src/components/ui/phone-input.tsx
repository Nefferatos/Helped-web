import * as React from "react";
import PhoneInputWithCountrySelect, {
  getCountries,
  getCountryCallingCode,
  isPossiblePhoneNumber,
  parsePhoneNumber,
  type Country,
} from "react-phone-number-input";
import en from "react-phone-number-input/locale/en";
import "react-phone-number-input/style.css";
import "./phone-input.css";
import { cn } from "@/lib/utils";

/** Every phone field in the app opens on Singapore unless told otherwise. */
export const DEFAULT_PHONE_COUNTRY: Country = "SG";

/** Matches the look of <Input>, for call sites that used a bare shadcn input. */
export const phoneFieldBaseClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm";

/** Country names shown in the selector, each with its dial code: "Singapore (+65)". */
const countryLabels: Record<string, string> = (() => {
  const base = en as unknown as Record<string, string>;
  const labels: Record<string, string> = { ...base };
  for (const country of getCountries()) {
    const name = base[country];
    if (name) labels[country] = `${name} (+${getCountryCallingCode(country)})`;
  }
  return labels;
})();

/**
 * Best-effort conversion of a stored number into E.164, so numbers saved before
 * this component existed ("91234567", "+65 9123 4567", "65-9123 4567") still
 * show up in the field instead of being silently dropped.
 */
const toE164 = (raw: string | null | undefined, country: Country): string | undefined => {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    return digits ? `+${digits}` : undefined;
  }

  try {
    const parsed = parsePhoneNumber(trimmed, country);
    if (parsed?.number) return parsed.number;
  } catch {
    /* fall through to the raw-digits guess below */
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return undefined;

  const callingCode = getCountryCallingCode(country);
  return digits.startsWith(callingCode) ? `+${digits}` : `+${callingCode}${digits}`;
};

export interface PhoneNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** Stored value. Anything parseable is accepted; the field emits E.164. */
  value?: string | null;
  /** Receives the number in E.164 format ("+6591234567"), or "" when cleared. */
  onChange: (value: string) => void;
  /** Applied to the field wrapper, so existing field classes keep working. */
  className?: string;
  /** Applied to the number input inside the wrapper. */
  inputClassName?: string;
  /** Country preselected in the dropdown when the field is empty. */
  defaultCountry?: Country;
}

/**
 * Phone field with a country selector (flag + dial code) in place of a plain
 * text input. Use this for every phone/WhatsApp/contact number field.
 */
export const PhoneNumberInput = React.forwardRef<HTMLInputElement, PhoneNumberInputProps>(
  (
    {
      value,
      onChange,
      className,
      inputClassName,
      defaultCountry = DEFAULT_PHONE_COUNTRY,
      required,
      ...inputProps
    },
    forwardedRef,
  ) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const normalized = React.useMemo(() => toE164(value, defaultCountry), [value, defaultCountry]);

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    // The input always carries the dial code ("+65"), so `required` alone would
    // accept an empty number — validate the number itself instead.
    React.useEffect(() => {
      const node = innerRef.current;
      if (!node) return;
      const valid = !required || (!!normalized && isPossiblePhoneNumber(normalized));
      node.setCustomValidity(valid ? "" : "Please enter a valid phone number.");
    }, [normalized, required]);

    return (
      <PhoneInputWithCountrySelect
        {...inputProps}
        // The library types this as a class instance ref, but at runtime it
        // forwards the ref to the underlying <input/>.
        ref={setRefs as unknown as React.ComponentPropsWithRef<typeof PhoneInputWithCountrySelect>["ref"]}
        international
        withCountryCallingCode
        countryCallingCodeEditable={false}
        addInternationalOption={false}
        defaultCountry={defaultCountry}
        labels={countryLabels}
        value={normalized}
        onChange={(next) => onChange(next ?? "")}
        required={required}
        className={cn("phone-input-field", className)}
        numberInputProps={inputClassName ? { className: inputClassName } : undefined}
      />
    );
  },
);

PhoneNumberInput.displayName = "PhoneNumberInput";

export default PhoneNumberInput;
