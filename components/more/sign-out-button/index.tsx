"use client";

import { useRef, useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import Button from "@/components/common/Button";
import ConfirmSheet from "@/components/common/ConfirmSheet";

/**
 * Sign out, behind a confirmation.
 *
 * It used to be a single unguarded tap styled identically to "Change password" directly above
 * it. On a shared shop phone that ends the shift's session by accident, and getting back in
 * costs typing an email and password mid-service. It is also demoted to `ghost`, so the two
 * buttons no longer look like the same kind of thing.
 */
export default function SignOutButton({ action }: { action: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      {/* Still a real form posting to the Server Action, so the session cookie is cleared server-side. */}
      <form ref={formRef} action={action}>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted"
          startIcon={<LogOut className="h-4 w-4" />}
          onClick={() => setConfirming(true)}
        >
          Sign out
        </Button>
      </form>

      <ConfirmSheet
        open={confirming}
        onOpenChange={setConfirming}
        title="Sign out?"
        description="You will need your email and password to get back in."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        destructive
        isLoading={pending}
        onConfirm={() => startTransition(() => formRef.current?.requestSubmit())}
      />
    </>
  );
}
