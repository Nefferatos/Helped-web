import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { KeyRound, RefreshCw, ShieldCheck } from "lucide-react";

interface FormState {
  current: string;
  newPw: string;
  confirm: string;
  captcha: string;
}

const CAPTCHA_CODE = "5533";

const fields: { label: string; key: keyof FormState; type: string; placeholder: string }[] = [
  { label: "Current Password", key: "current", type: "password", placeholder: "Enter your current password" },
  { label: "New Password", key: "newPw", type: "password", placeholder: "Enter your new password" },
  { label: "Re-enter New Password", key: "confirm", type: "password", placeholder: "Confirm your new password" },
];

const ChangePassword = () => {
  const [form, setForm] = useState<FormState>({ current: "", newPw: "", confirm: "", captcha: "" });

  const handleSubmit = () => {
    if (!form.current) { toast.error("Please enter your current password."); return; }
    if (!form.newPw || !form.confirm) { toast.error("Please enter and confirm your new password."); return; }
    if (form.newPw !== form.confirm) { toast.error("New passwords do not match."); return; }
    if (form.captcha !== CAPTCHA_CODE) { toast.error("Invalid CAPTCHA code. Please try again."); return; }
    toast.success("Password changed successfully.");
    setForm({ current: "", newPw: "", confirm: "", captcha: "" });
  };

  const handleReset = () => setForm({ current: "", newPw: "", confirm: "", captcha: "" });

  return (
    <div className="page-container flex items-start justify-center">
      <div className="w-full max-w-lg animate-fade-in-up">

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">

          {/* Card header */}
          <div className="bg-[#003399] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <KeyRound className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Change Password</h2>
                <p className="text-xs text-blue-200">Update your account credentials</p>
              </div>
            </div>
          </div>

          {/* Card body */}
          <div className="px-6 py-6 space-y-5">

            {/* Instructions */}
            <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#003399]" />
              <p className="text-xs leading-relaxed text-gray-700">
                Enter your existing password first. If it matches, enter your new password and re-confirm it.
                Your password will be updated once both new passwords match.
              </p>
            </div>

            {/* Password fields */}
            <div className="space-y-4">
              {fields.map(({ label, key, type, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-sm font-bold text-[#003399]">{label}</Label>
                  <Input
                    type={type}
                    value={form[key]}
                    placeholder={placeholder}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-black shadow-none focus-visible:ring-2 focus-visible:ring-[#003399]"
                  />
                </div>
              ))}
            </div>

            {/* Divider */}
            <hr className="border-gray-200" />

            {/* CAPTCHA */}
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-[#003399]">Security Code</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  value={form.captcha}
                  placeholder="Enter code"
                  onChange={(e) => setForm((prev) => ({ ...prev, captcha: e.target.value }))}
                  className="h-10 w-36 rounded-lg border border-gray-300 px-3 text-sm text-black shadow-none focus-visible:ring-2 focus-visible:ring-[#003399]"
                />
                <div className="flex h-10 items-center justify-center rounded-lg bg-[#003399] px-4">
                  <span className="select-none text-base font-bold tracking-[4px] text-white">
                    {CAPTCHA_CODE}
                  </span>
                </div>
                <span className="text-xs text-gray-400">← enter this code</span>
              </div>
            </div>
          </div>

          {/* Card footer */}
          <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
            <Button
              onClick={handleReset}
              variant="outline"
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex items-center gap-2 rounded-lg bg-[#003399] px-6 py-2 text-sm font-semibold text-white hover:bg-[#002277]"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;