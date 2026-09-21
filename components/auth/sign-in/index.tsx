"use client";

import { startTransition, useActionState, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { signInAction, type SignInState } from "@/app/auth/sign-in/actions";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { validateAndSetErrors } from "@/utils/validation";
import { signInSchema } from "../schema";

interface SignInProps {
  /** Path to return to after signing in (set by the proxy). */
  next?: string;
}

export default function SignIn({ next }: SignInProps) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signInAction,
    {}
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [offline, setOffline] = useState(false);
  // The "wrong password" banner belongs to the attempt that produced it; typing hides it.
  const [dismissed, setDismissed] = useState<SignInState | null>(null);

  const bannerError = offline
    ? "No connection. Check your internet and try again."
    : dismissed === state
      ? undefined
      : state.error;

  const emailError = errors.email || state.fieldErrors?.email;
  const passwordError = errors.password || state.fieldErrors?.password;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(await validateAndSetErrors(signInSchema, { email, password }, setErrors))) {
      return;
    }
    // A failed request while offline would land on the error screen and lose what was typed.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOffline(true);
      return;
    }
    setOffline(false);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);
    if (next) formData.set("next", next);
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Input
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        placeholder="you@example.com"
        autoFocus
        startIcon={<Mail className="h-5 w-5" />}
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setDismissed(state);
          if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
        }}
        error={emailError}
      />
      <Input
        label="Password"
        name="password"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        placeholder="••••••••"
        startIcon={<LockKeyhole className="h-5 w-5" />}
        endIcon={
          <Button
            variant="ghost"
            size="icon"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
            className="-mr-3 rounded-full text-muted"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>
        }
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setDismissed(state);
          if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
        }}
        error={passwordError}
      />

      {bannerError && (
        <p role="alert" className="rounded-field bg-danger-bg px-4 py-3 text-sm text-danger">
          {bannerError}
        </p>
      )}

      <Button type="submit" size="lg" isLoading={pending} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
