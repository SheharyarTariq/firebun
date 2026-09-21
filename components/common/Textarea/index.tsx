"use client";

import { useId } from "react";
import { cn } from "@/utils/cn";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export default function Textarea({
  label,
  error,
  hint,
  className,
  containerClassName,
  id,
  rows = 3,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const messageId = `${textareaId}-message`;

  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          "w-full resize-none rounded-field border border-border bg-surface px-4 py-3 text-base text-foreground",
          "placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30",
          "disabled:bg-surface-2 disabled:text-muted",
          error && "border-danger focus:border-danger focus:ring-danger/20",
          className
        )}
        {...props}
      />
      {error ? (
        <p id={messageId} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
