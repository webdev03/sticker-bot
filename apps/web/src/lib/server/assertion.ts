import type { JWTData } from "$lib/types";

export function assertUserExists(
  authLocal: App.Locals["auth"],
): asserts authLocal is JWTData {
  if (!authLocal) throw new Error("User must be logged in");
}
