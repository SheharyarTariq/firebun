"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { changePasswordAction } from "@/app/(app)/more/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { callAction } from "@/utils/call-action";
import { validateAndSetErrors } from "@/utils/validation";
import { changePasswordSchema } from "../schema";

/** "Change password" button + sheet for the signed-in user (More screen). */
export default function ChangePasswordSheet() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
  };

  const handleSubmit = async () => {
    const values = { currentPassword, newPassword, confirmPassword };
    if (!(await validateAndSetErrors(changePasswordSchema, values, setErrors))) return;

    startTransition(async () => {
      const result = await callAction(changePasswordAction(values));
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success("Password changed");
      reset();
      setOpen(false);
    });
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        startIcon={<KeyRound className="h-4 w-4" />}
        onClick={() => setOpen(true)}
      >
        Change password
      </Button>

      <BottomSheet
        open={open}
        onOpenChange={(next) => {
          if (!next) reset();
          setOpen(next);
        }}
        title="Change password"
        description="Other devices signed in to your account will be signed out."
        footer={
          <Button size="lg" className="w-full" isLoading={isPending} onClick={handleSubmit}>
            Save password
          </Button>
        }
      >
        <div className="space-y-4">
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              clearError("currentPassword");
            }}
            error={errors.currentPassword}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              clearError("newPassword");
            }}
            error={errors.newPassword}
          />
          <Input
            label="Repeat new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              clearError("confirmPassword");
            }}
            error={errors.confirmPassword}
          />
        </div>
      </BottomSheet>
    </>
  );
}
