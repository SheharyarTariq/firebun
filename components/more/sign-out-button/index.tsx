"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";
import Button from "@/components/common/Button";

/** Submit button for the sign-out form; shows progress while the session is cleared. */
export default function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" className="w-full" isLoading={pending} startIcon={<LogOut className="h-4 w-4" />}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
