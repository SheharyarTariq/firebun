import type * as yup from "yup";
import { isServiceError } from "@/server/errors";
import { fail, ok, type ActionResult } from "@/utils/action-result";
import { validateForm } from "@/utils/validation";

/**
 * Wraps a Server Action body: expected domain failures (ServiceError) become
 * `{ ok: false }`, anything else propagates so Next.js reports it.
 * Do not call `redirect()` inside `fn` — call it after the result is checked.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (error) {
    if (isServiceError(error)) return fail(error.message, error.fieldErrors);
    throw error;
  }
}

/** Validates `input` with a yup schema first, then runs the action body. */
export async function validatedAction<I extends object, T>(
  schema: yup.AnyObjectSchema,
  input: I,
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  const fieldErrors = await validateForm(schema, input);
  if (Object.keys(fieldErrors).length > 0) {
    return fail("Please fix the highlighted fields.", fieldErrors);
  }
  return runAction(fn);
}
