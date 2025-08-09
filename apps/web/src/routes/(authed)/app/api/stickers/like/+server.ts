import { json } from "@sveltejs/kit";
import { assertUserExists } from "$lib/server/assertion";

import { and, eq } from "@repo/db";
import { db } from "@repo/db/client";
import { stickerLikes } from "@repo/db/schema";

import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ url, locals, request }) => {
  assertUserExists(locals.auth);

  const req = await request.json();
  const newLiked = req["liked"] === true;
  const stickerId = req["id"];

  const userId = locals.auth.user;

  if (newLiked) {
    await db.insert(stickerLikes).values({ stickerId, userId });
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
