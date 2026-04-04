import { useMemo } from "react";

type Props = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

// Minimal 6-digit OTP input UI (mobile friendly).
// Keeps code in a single string while rendering 6 separate inputs.
const OtpInput = ({ length = 6, value, onChange, disabled }: Props) => {
  const digits = useMemo(() => {
    const normalized = (value || "").replace(/\D+/g, "").slice(0, length);
    return Array.from({ length }, (_, index) => normalized[index] ?? "");
  }, [length, value]);

  const setDigit = (index: number, digit: string) => {
    const next = [...digits];
    next[index] = digit.replace(/\D+/g, "").slice(-1);
    onChange(next.join(""));
  };

  return (
    <div className="flex items-center justify-between gap-2">
      {digits.map((digit, index) => (
        <input
          key={`otp-${index}`}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          value={digit}
          disabled={disabled}
          onChange={(event) => setDigit(index, event.target.value)}
          className="h-11 w-11 rounded-lg border bg-background text-center text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      ))}
    </div>
  );
};

export default OtpInput;
