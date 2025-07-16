import { desc, lt } from "@repo/db";
import { db } from "@repo/db/client";
import { stickers } from "@repo/db/schema";

import type { PageServerLoad } from "./$types";

export const load = (async () => {
  return {
    stickers: await db
      .select()
      .from(stickers)
      .limit(15)
      .orderBy(desc(stickers.id)),
  };
}) satisfies PageServerLoad;
