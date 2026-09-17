"use client";

import { useState, useTransition } from "react";
import { KeyRound, ShieldCheck, UserRoundCheck, UserRoundX } from "lucide-react";
import toast from "react-hot-toast";
import {
  resetUserPasswordAction,
  updateUserAction,
} from "@/app/(app)/(admin)/users/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import Input from "@/components/common/Input";
import type { UserRow } from "@/server/users/queries";
import { validateAndSetErrors } from "@/utils/validation";
import { resetPasswordSchema } from "../schema";

interface UserActionsSheetProps {
  user: UserRow | null;
  isSelf: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "menu" | "reset" | "confirm-active" | "confirm-role";

export default function UserActionsSheet({ user, isSelf, onOpenChange }: UserActionsSheetProps) {
  const [step, setStep] = useState<Step>("menu");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const close = () => {
    setStep("menu");
    setPassword("");
    setErrors({});
    onOpenChange(false);
  };

  if (!user) return null;

  const otherRole = user.role === "admin" ? "staff" : "admin";

  const runUpdate = (input: Parameters<typeof updateUserAction>[1], success: string) => {
    startTransition(async () => {
      const result = await updateUserAction(user.id, input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      close();
    });
  };

  const handleReset = async () => {
    if (!(await validateAndSetErrors(resetPasswordSchema, { password }, setErrors))) return;
    startTransition(async () => {
      const result = await resetUserPasswordAction(user.id, { password });
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(`Password updated for ${user.name}`);
      close();
    });
  };

  if (step === "reset") {
    return (
      <BottomSheet
        open
        onOpenChange={(open) => !open && close()}
        title={`Reset password — ${user.name}`}
        description="They will be signed out on other devices."
        footer={
          <Button size="lg" className="w-full" isLoading={isPending} onClick={handleReset}>
            Save new password
          </Button>
        }
      >
        <Input
          label="New password"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors({});
          }}
          error={errors.password}
        />
      </BottomSheet>
    );
  }

  if (step === "confirm-active") {
    const deactivating = user.isActive;
    return (
      <ConfirmSheet
        open
        onOpenChange={(open) => !open && close()}
        title={deactivating ? `Deactivate ${user.name}?` : `Reactivate ${user.name}?`}
        description={
          deactivating
            ? "They will be signed out immediately and cannot sign in again until reactivated. Their past orders and records stay."
            : "They will be able to sign in again with their existing password."
        }
        confirmLabel={deactivating ? "Deactivate" : "Reactivate"}
        destructive={deactivating}
        isLoading={isPending}
        onConfirm={() =>
          runUpdate(
            { isActive: !deactivating },
            deactivating ? `${user.name} deactivated` : `${user.name} reactivated`
          )
        }
      />
    );
  }

  if (step === "confirm-role") {
    return (
      <ConfirmSheet
        open
        onOpenChange={(open) => !open && close()}
        title={`Make ${user.name} ${otherRole === "admin" ? "an admin" : "staff"}?`}
        description={
          otherRole === "admin"
            ? "Admins can change inventory, menu, prices, finance and accounts."
            : "Staff can only take orders, view orders and add expenses."
        }
        confirmLabel="Change role"
        isLoading={isPending}
        onConfirm={() => runUpdate({ role: otherRole }, `${user.name} is now ${otherRole}`)}
      />
    );
  }

  return (
    <BottomSheet
      open
      onOpenChange={(open) => !open && close()}
      title={user.name}
      description={user.email}
    >
      <div className="space-y-2">
        <Button
          variant="outline"
          size="lg"
          className="w-full justify-start"
          startIcon={<KeyRound className="h-5 w-5 text-muted" />}
          onClick={() => setStep("reset")}
        >
          Reset password
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full justify-start"
          startIcon={<ShieldCheck className="h-5 w-5 text-muted" />}
          disabled={isSelf}
          onClick={() => setStep("confirm-role")}
        >
          {otherRole === "admin" ? "Make admin" : "Make staff"}
        </Button>
        <Button
          variant={user.isActive ? "outline" : "primary"}
          size="lg"
          className="w-full justify-start"
          startIcon={
            user.isActive ? (
              <UserRoundX className="h-5 w-5 text-danger" />
            ) : (
              <UserRoundCheck className="h-5 w-5" />
            )
          }
          disabled={isSelf}
          onClick={() => setStep("confirm-active")}
        >
          {user.isActive ? "Deactivate account" : "Reactivate account"}
        </Button>
        {isSelf && (
          <p className="pt-1 text-xs text-muted">
            You cannot change your own role or deactivate yourself.
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
