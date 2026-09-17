import type * as yup from "yup";
import { isServiceError } from "@/server/errors";
import { fail, ok, type ActionResult } from "@/utils/action-result";
import { validateForm } from "@/utils/validation";

export const GENERIC_ACTION_ERROR = "Something went wrong. Nothing was saved — please try again.";

/**
 * Wraps a Server Action body: expected domain failures (ServiceError) become
 * `{ ok: false }` with their message; anything else is logged and turned into a
 * generic failure so the phone shows a toast instead of a broken page.
 * Do not call `redirect()` inside `fn` — call it after the result is checked.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (error) {
    if (isServiceError(error)) return fail(error.message, error.fieldErrors);
    if (isNextControlFlow(error)) throw error;
    console.error("[action]", error);
    return fail(GENERIC_ACTION_ERROR);
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

/** `redirect()` / `notFound()` throw special errors that Next.js must see. */
function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown })?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"));
}
