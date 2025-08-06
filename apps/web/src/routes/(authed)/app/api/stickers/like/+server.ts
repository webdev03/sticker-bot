import { json } from "@sveltejs/kit";
import { assertUserExists } from "$lib/server/assertion";

import { desc, eq, lt, sql } from "@repo/db";
import { db } from "@repo/db/client";
import { stickers } from "@repo/db/schema";

import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ url, locals, request }) => {
  assertUserExists(locals.auth);

  const req = await request.json();
  const newLiked = Boolean(req["liked"]);
  const stickerId = req["id"];

  const userId = locals.auth.user;

  return json({
    success: true,
  });
};
