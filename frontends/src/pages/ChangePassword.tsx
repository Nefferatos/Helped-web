import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ChangePassword = () => {
  const [form, setForm] = useState({ current: "", newPw: "", confirm: "" });

  const handleSave = () => {
    console.log("Saved password:", form);
    setForm({ current: "", newPw: "", confirm: "" }); 
  };

  const handleCancel = () => {
    setForm({ current: "", newPw: "", confirm: "" });
  };

  return (
    <div className="page-container">
      <h2 className="text-xl font-bold mb-6">Change Password</h2>
      <div className="content-card animate-fade-in-up max-w-lg mx-auto space-y-6">
        <p className="text-sm text-muted-foreground">
          Please enter your existing password first. Then enter your new password and re-confirm it.
        </p>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-primary">
              Enter Your Current Password:
            </Label>
            <Input
              type="password"
              value={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-semibold text-primary">
              Enter Your New Password:
            </Label>
            <Input
              type="password"
              value={form.newPw}
              onChange={(e) => setForm({ ...form, newPw: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-semibold text-primary">
              Re-enter Your New Password:
            </Label>
            <Input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-center pt-2">
          <Button onClick={handleSave}>Save</Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;