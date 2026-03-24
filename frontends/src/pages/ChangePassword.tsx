import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ChangePassword = () => {
  const [form, setForm] = useState({ current: "", newPw: "", confirm: "", captcha: "" });
  const captchaCode = "4490";

  return (
    <div className="page-container">
      <h2 className="text-xl font-bold mb-6">Change Password</h2>
      <div className="content-card animate-fade-in-up max-w-lg mx-auto space-y-6">
        <p className="text-sm text-muted-foreground">
          Please enter your existing password first. Then enter your new password and re-confirm it.
        </p>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-primary">Enter Your Current Password:</Label>
            <Input type="password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-primary">Enter Your New Password:</Label>
            <Input type="password" value={form.newPw} onChange={(e) => setForm({ ...form, newPw: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-primary">Re-enter Your New Password:</Label>
            <Input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-primary">Enter the code on the right:</Label>
            <div className="flex items-center gap-3">
              <Input value={form.captcha} onChange={(e) => setForm({ ...form, captcha: e.target.value })} className="flex-1" />
              <span className="bg-primary text-primary-foreground px-4 py-2 rounded font-mono font-bold text-lg">{captchaCode}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center pt-2">
          <Button>Submit</Button>
          <Button variant="outline" onClick={() => setForm({ current: "", newPw: "", confirm: "", captcha: "" })}>Reset</Button>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
