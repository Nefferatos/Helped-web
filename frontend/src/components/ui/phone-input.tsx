import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import PhoneInputWithCountrySelect, {
  getCountries,
  getCountryCallingCode,
  isPossiblePhoneNumber,
  parsePhoneNumber,
  type Country,
} from "react-phone-number-input";
import flagIcons from "react-phone-number-input/flags";
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

type CountryOption = { value?: string; label: string; divider?: boolean };

type CountrySelectorProps = {
  value?: string;
  options: CountryOption[];
  onChange: (value?: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  "aria-label"?: string;
};

const CountrySelector = ({
  value,
  options,
  onChange,
  disabled,
  readOnly,
  name,
  "aria-label": ariaLabel,
}: CountrySelectorProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const menuId = React.useId();
  const selected = options.find((option) => option.value === value);
  const SelectedFlag = value ? flagIcons[value as Country] : undefined;
  const filteredOptions = options.filter((option) => {
    if (option.divider || !option.value) return false;
    return option.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
      || option.value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  });

  React.useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const button = buttonRef.current;
      if (!button) return;
      const bounds = button.getBoundingClientRect();
      const width = Math.min(320, window.innerWidth - 24);
      const height = Math.min(320, window.innerHeight - 24);
      const left = Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12));
      const top = bounds.bottom + height + 8 > window.innerHeight && bounds.top >= height + 8
        ? bounds.top - height - 8
        : Math.min(bounds.bottom + 8, window.innerHeight - height - 12);
      setMenuStyle({ position: "fixed", left, top, width, maxHeight: height, zIndex: 10000 });
    };

    updatePosition();
    searchRef.current?.focus();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || (!buttonRef.current?.contains(target) && !document.getElementById(menuId)?.contains(target))) {
        setIsOpen(false);
        setSearch("");
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearch("");
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, menuId]);

  return (
    <div className="PhoneInputCountry phone-country-selector">
      <button
        ref={buttonRef}
        type="button"
        className="phone-country-trigger"
        role="combobox"
        aria-label={ariaLabel || "Country"}
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup="listbox"
        aria-valuetext={selected?.label || "Select country"}
        name={name}
        disabled={disabled || readOnly}
        onClick={() => {
          setIsOpen((open) => !open);
          setSearch("");
        }}
      >
        <span className="phone-country-flag" aria-hidden="true">
          {SelectedFlag && <SelectedFlag />}
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {isOpen && menuStyle && createPortal(
        <div
          id={menuId}
          className="phone-country-menu"
          style={menuStyle}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && event.target === searchRef.current) {
              event.preventDefault();
              (event.currentTarget.querySelector('[role="option"]') as HTMLButtonElement | null)?.focus();
            }
          }}
        >
          <div className="phone-country-search">
            <Search size={15} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search country or code"
              aria-label="Search countries"
            />
          </div>
          <div className="phone-country-options" role="listbox" aria-label="Countries">
            {filteredOptions.length ? filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className="phone-country-option"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setSearch("");
                  buttonRef.current?.focus();
                }}
              >
                <span className="phone-country-option-flag" aria-hidden="true">
                  {option.value && flagIcons[option.value as Country] && React.createElement(
                    flagIcons[option.value as Country],
                  )}
                </span>
                <span className="phone-country-option-label">{option.label}</span>
                {option.value === value && <Check size={16} aria-hidden="true" />}
              </button>
            )) : (
              <p className="phone-country-empty">No countries found.</p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

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
        countrySelectComponent={CountrySelector}
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
