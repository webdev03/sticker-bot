import { redirect } from "@sveltejs/kit";

import type { LayoutServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  if (!locals.auth) {
    return redirect(307, "/sign-in");
  }
  return {
    auth: locals.auth,
  };
}) satisfies LayoutServerLoad;
