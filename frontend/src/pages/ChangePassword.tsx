import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { KeyRound, RefreshCw, ShieldCheck, Eye, EyeOff, Lock } from "lucide-react";

interface FormState {
  current: string;
  newPw: string;
  confirm: string;
  captcha: string;
}

const CAPTCHA_CODE = "5533";

const fields: {
  label: string;
  key: keyof Omit<FormState, "captcha">;
  placeholder: string;
}[] = [
  { label: "Current Password", key: "current", placeholder: "Enter your current password" },
  { label: "New Password", key: "newPw", placeholder: "Enter your new password" },
  { label: "Confirm New Password", key: "confirm", placeholder: "Re-enter your new password" },
];

const ChangePassword = () => {
  const [form, setForm] = useState<FormState>({ current: "", newPw: "", confirm: "", captcha: "" });
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});

  const toggleShow = (key: string) =>
    setShowFields((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = () => {
    if (!form.current) { toast.error("Please enter your current password."); return; }
    if (!form.newPw || !form.confirm) { toast.error("Please enter and confirm your new password."); return; }
    if (form.newPw !== form.confirm) { toast.error("New passwords do not match."); return; }
    if (form.newPw.length < 6) { toast.error("New password must be at least 6 characters."); return; }
    if (form.captcha !== CAPTCHA_CODE) { toast.error("Invalid security code. Please try again."); return; }
    toast.success("Password changed successfully.");
    setForm({ current: "", newPw: "", confirm: "", captcha: "" });
  };

  const handleReset = () => setForm({ current: "", newPw: "", confirm: "", captcha: "" });

  const passwordsMatch = form.newPw && form.confirm && form.newPw === form.confirm;
  const passwordsMismatch = form.newPw && form.confirm && form.newPw !== form.confirm;

  return (
    <div className="flex items-start justify-center pt-2">
      <div className="w-full max-w-md">

        {/* Page title */}
        <div className="mb-5">
          <h2 className="text-[18px] font-bold tracking-tight text-gray-900">Password Management</h2>
          <p className="text-[13px] text-gray-400 mt-0.5">Update your account credentials</p>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          {/* Card header */}
          <div className="flex items-center gap-3 border-b border-gray-100 bg-[#0D6E56] px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
              <Lock className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-white">Change Password</p>
              <p className="text-[11px] text-white/70">All fields are required</p>
            </div>
          </div>

          {/* Card body */}
          <div className="px-5 py-5 space-y-4">

            {/* Security tip */}
            <div className="flex gap-2.5 rounded-lg border border-[#0D6E56]/20 bg-[#E1F5EE] px-3.5 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#0D6E56]" />
              <p className="text-[12px] leading-relaxed text-gray-600">
                Enter your current password first, then your new password. Both new password fields must match before saving.
              </p>
            </div>

            {/* Password fields */}
            <div className="space-y-3.5">
              {fields.map(({ label, key, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-[12px] font-semibold text-gray-700">{label}</Label>
                  <div className="relative">
                    <Input
                      type={showFields[key] ? "text" : "password"}
                      value={form[key]}
                      placeholder={placeholder}
                      onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      className={`h-9 w-full rounded-lg border px-3 pr-9 text-[13px] shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0D6E56]/40 ${
                        key === "confirm" && passwordsMismatch
                          ? "border-red-300 bg-red-50 focus-visible:ring-red-300/40"
                          : key === "confirm" && passwordsMatch
                          ? "border-[#0D6E56]/40 bg-[#E1F5EE]/30"
                          : "border-gray-200"
                      }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => toggleShow(key)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showFields[key] ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  {key === "confirm" && passwordsMismatch && (
                    <p className="text-[11px] text-red-500">Passwords do not match</p>
                  )}
                  {key === "confirm" && passwordsMatch && (
                    <p className="text-[11px] text-[#0D6E56]">Passwords match ✓</p>
                  )}
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-300">Security Verification</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* CAPTCHA */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-gray-700">Security Code</Label>
              <div className="flex items-center gap-2.5">
                <Input
                  type="text"
                  value={form.captcha}
                  placeholder="Enter code"
                  maxLength={6}
                  onChange={(e) => setForm((prev) => ({ ...prev, captcha: e.target.value }))}
                  className="h-9 w-32 rounded-lg border border-gray-200 px-3 text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-[#0D6E56]/40"
                />
                {/* CAPTCHA display */}
                <div className="flex h-9 items-center justify-center rounded-lg border border-[#0D6E56]/30 bg-[#0D6E56] px-4 select-none">
                  <span
                    className="font-mono text-[15px] font-bold tracking-[5px] text-white"
                    style={{ fontStyle: "italic", letterSpacing: "0.25em" }}
                  >
                    {CAPTCHA_CODE}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">← enter this</span>
              </div>
            </div>
          </div>

          {/* Card footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 bg-gray-50/80 px-5 py-4">
            <Button
              onClick={handleReset}
              variant="outline"
              className="h-8 gap-1.5 rounded-lg border-gray-200 bg-white px-4 text-[12px] font-semibold text-gray-600 hover:bg-gray-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button
              onClick={handleSubmit}
              className="h-8 gap-1.5 rounded-lg bg-[#0D6E56] px-5 text-[12px] font-semibold text-white hover:bg-[#0a5c47] active:scale-[0.98]"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Update Password
            </Button>
          </div>
        </div>

        {/* Helper note */}
        <p className="mt-3 text-center text-[11px] text-gray-400">
          Forgotten your password? Contact your system administrator.
        </p>
      </div>
    </div>
  );
};

export default ChangePassword;