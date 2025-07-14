import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  if (locals.auth) return redirect(307, "/app");
}) satisfies PageServerLoad;
