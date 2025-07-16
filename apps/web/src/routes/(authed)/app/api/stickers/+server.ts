import { json } from "@sveltejs/kit";

import { desc, lt } from "@repo/db";
import { db } from "@repo/db/client";
import { stickers } from "@repo/db/schema";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
  const cursor = Number(url.searchParams.get("cursor"));
  return json(
    await db
      .select()
      .from(stickers)
      .where(cursor ? lt(stickers.id, cursor) : undefined)
      .limit(15)
      .orderBy(desc(stickers.id)),
  );
};

export type Sticker = typeof stickers.$inferSelect;
