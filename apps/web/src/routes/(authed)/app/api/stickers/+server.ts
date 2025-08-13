import { json } from "@sveltejs/kit";
import { assertUserExists } from "$lib/server/assertion";

import { and, desc, eq, exists, lt } from "@repo/db";
import { db } from "@repo/db/client";
import { stickerLikes, stickers } from "@repo/db/schema";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, locals }) => {
  assertUserExists(locals.auth);

  const cursor = Number(url.searchParams.get("cursor"));
  const userId = locals.auth.user;
  const likedOnly = url.searchParams.get("liked") === "true";

  const rows = await db.query.stickers.findMany({
    where: and(
      cursor ? lt(stickers.id, cursor) : undefined,
      likedOnly
        ? exists(
            db
              .select()
              .from(stickerLikes)
              .where(
                and(
                  eq(stickerLikes.stickerId, stickers.id),
                  eq(stickerLikes.userId, userId),
                ),
              ),
          )
        : undefined,
    ),
    with: { stickerLikes: true },
    orderBy: desc(stickers.id),
    limit: 15,
  });

  const stickersSafe = rows.map((sticker) => {
    const { stickerLikes, ...stickerData } = sticker; // remove 'stickerLikes' from data to prevent leak of users who liked a sticker
    return {
      ...stickerData,
      likedByMe: sticker.stickerLikes.some((x) => x.userId === userId),
    };
  });

  return json(stickersSafe);
};

export type Sticker = Omit<typeof stickers.$inferSelect, "likes"> & {
  likedByMe: boolean;
};
