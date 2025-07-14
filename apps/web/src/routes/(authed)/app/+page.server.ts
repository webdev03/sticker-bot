import { redirect } from "@sveltejs/kit";

import type { Actions } from "./$types";

export const actions = {
  logout: async (event) => {
    event.cookies.delete("token", { path: "/" });
    throw redirect(303, "/");
  },
} satisfies Actions;
