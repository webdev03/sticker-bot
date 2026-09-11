import { error, json } from "@sveltejs/kit";
import { assertUserExists } from "$lib/server/assertion";

import { and, eq } from "@repo/db";
import { db } from "@repo/db/client";
import { stickerLikes } from "@repo/db/schema";

import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ url, locals, request }) => {
  assertUserExists(locals.auth);

  if (request.headers.get("origin") !== url.origin)
    error(403, "Invalid origin");
  const req = await request.json().catch(() => null);
  if (
    !req ||
    typeof req !== "object" ||
    typeof req.liked !== "boolean" ||
    !Number.isSafeInteger(req.id) ||
    req.id < 1
  )
    error(400, "Invalid request");
  const newLiked = req["liked"] === true;
  const stickerId = Number(req["id"]);

  const userId = locals.auth.user;

  if (newLiked) {
    await db
      .insert(stickerLikes)
      .values({ stickerId, userId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(stickerLikes)
      .where(
        and(
          eq(stickerLikes.stickerId, stickerId),
          eq(stickerLikes.userId, userId),
        ),
      );
  }

  return json({
    success: true,
  });
};
