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
    return {};
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
    return false;
  }
  return true;
}
