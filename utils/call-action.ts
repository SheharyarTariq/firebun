import { fail, type ActionResult } from "@/utils/action-result";

export const OFFLINE_ERROR = "No connection. Check the internet and try again — nothing was saved.";
export const UNREACHABLE_ERROR = "Could not reach the server. Check the connection and try again.";

/**
 * Client-side companion of `runAction`: a Server Action call that never reaches the
 * server (offline, flaky Wi-Fi, expired deploy) rejects instead of returning a result.
 * Wrap the call so every screen handles it like any other failure (a toast), not a crash.
 *
 *   const result = await callAction(placeOrderAction(input));
 */
export async function callAction<T>(
  call: Promise<ActionResult<T>>,
  messages: { offline?: string; unreachable?: string } = {}
): Promise<ActionResult<T>> {
  try {
    return await call;
  } catch (error) {
    console.error("[action:client]", error);
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    return fail(offline ? (messages.offline ?? OFFLINE_ERROR) : (messages.unreachable ?? UNREACHABLE_ERROR));
  }
}
