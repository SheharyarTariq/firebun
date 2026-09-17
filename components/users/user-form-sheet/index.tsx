"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createUserAction } from "@/app/(app)/(admin)/users/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import type { UserRole } from "@/db/schema/users";
import { validateAndSetErrors } from "@/utils/validation";
import { createUserSchema } from "../schema";

interface UserFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff — counter and orders" },
  { value: "admin", label: "Admin — everything" },
];

export default function UserFormSheet({ open, onOpenChange }: UserFormSheetProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("staff");
    setErrors({});
  };

  const handleSubmit = async () => {
    const values = { name, email, password, role };
    if (!(await validateAndSetErrors(createUserSchema, values, setErrors))) return;

    startTransition(async () => {
      const result = await createUserAction(values);
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(`${name.trim()} can now sign in`);
      reset();
      onOpenChange(false);
    });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="New account"
      description="Share the email and password with the staff member."
      footer={
        <Button size="lg" className="w-full" isLoading={isPending} onClick={handleSubmit}>
          Create account
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          label="Name"
          placeholder="e.g. Ali"
          autoComplete="off"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearError("name");
          }}
          error={errors.name}
        />
        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoComplete="off"
          placeholder="ali@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearError("email");
          }}
          error={errors.email}
        />
        <Input
          label="Password"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearError("password");
          }}
          error={errors.password}
          hint="Shown in plain text so you can read it out."
        />
        <Select
          label="Role"
          options={ROLE_OPTIONS}
          value={role}
          onChange={(e) => {
            setRole(e.target.value as UserRole);
            clearError("role");
          }}
          error={errors.role}
        />
      </div>
    </BottomSheet>
  );
}
