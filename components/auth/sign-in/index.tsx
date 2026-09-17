"use client";

import { startTransition, useActionState, useState } from "react";
import { LockKeyhole, Mail } from "lucide-react";
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const emailError = errors.email || state.fieldErrors?.email;
  const passwordError = errors.password || state.fieldErrors?.password;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(await validateAndSetErrors(signInSchema, { email, password }, setErrors))) {
      return;
    }

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
        startIcon={<Mail className="h-5 w-5" />}
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
        }}
        error={emailError}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        startIcon={<LockKeyhole className="h-5 w-5" />}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
        }}
        error={passwordError}
      />

      {state.error && (
        <p role="alert" className="rounded-field bg-danger-bg px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" isLoading={pending} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
