import { json } from "@sveltejs/kit";
import { assertUserExists } from "$lib/server/assertion";

import { desc, lt } from "@repo/db";
import { db } from "@repo/db/client";
import { stickers } from "@repo/db/schema";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, locals }) => {
  assertUserExists(locals.auth);

  const cursor = Number(url.searchParams.get("cursor"));
  const userId = locals.auth.user;

  const rows = await db
    .select()
    .from(stickers)
    .where(cursor ? lt(stickers.id, cursor) : undefined)
    .limit(15)
    .orderBy(desc(stickers.id));

  const stickersSafe = rows.map((sticker) => {
    const { likes, ...stickerData } = sticker; // remove 'likes' from data to prevent leak of users who liked a sticker
    return {
      ...stickerData,
      likedByMe: sticker.likes.includes(userId),
    };
  });

  return json(stickersSafe);
};

export type Sticker = Omit<typeof stickers.$inferSelect, "likes"> & {
  likedByMe: boolean;
};
