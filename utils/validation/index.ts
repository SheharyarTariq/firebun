import * as yup from "yup";

/**
 * Runs a yup object schema and returns `{ field: message }` for the first error per
 * field, or `{}` when valid. Used on the client for instant feedback and again inside
 * Server Actions, which are the source of truth.
 */
export async function validateForm<T extends object>(
  schema: yup.AnyObjectSchema,
  data: T
): Promise<Record<string, string>> {
  try {
    await schema.validate(data, { abortEarly: false });
    return {};
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      const errors: Record<string, string> = {};
      err.inner.forEach((e) => {
        if (e.path && !errors[e.path]) errors[e.path] = e.message;
      });
      return errors;
    }
    // A schema bug must not read as "valid": that would let bad data through, on the server too.
    throw err;
  }
}

/** Client helper: validates, pushes errors into state, returns whether the form is valid. */
export async function validateAndSetErrors<T extends object>(
  schema: yup.AnyObjectSchema,
  data: T,
  setErrors: (errors: Record<string, string>) => void
): Promise<boolean> {
  const errors = await validateForm(schema, data);
  if (Object.keys(errors).length > 0) {
    setErrors(errors);
    revealFirstError();
    return false;
  }
  return true;
}

/**
 * In a tall sheet the first invalid field can sit above the fold while the Save button is
 * pinned below, so a failed save looks like nothing happened. Once the errors have rendered
 * (`Input`/`Select`/`Textarea` set `aria-invalid`), bring the first one into view and focus it.
 */
function revealFirstError() {
  if (typeof window === "undefined") return;
  requestAnimationFrame(() => {
    // An open sheet is where the user is looking, so its errors win over the page behind it.
    const field =
      document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]') ??
      document.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!field) return;
    field.scrollIntoView({ block: "center", behavior: "smooth" });
    field.focus({ preventScroll: true });
  });
}
