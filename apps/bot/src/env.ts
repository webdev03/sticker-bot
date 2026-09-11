import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    SLACK_SIGNING_SECRET: z.string().min(1),
    SLACK_BOT_TOKEN: z.string().min(1),
    SLACK_APP_TOKEN: z.string().min(1),
    SLACK_EMOJI_PROXY_URL: z.url().refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      );
    }, "Use an HTTPS proxy URL without credentials, query, or fragment"),
    SLACK_EMOJI_PROXY_TOKEN: z.string().min(1),
    PUBLIC_SLACK_CHANNELS: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    EMOJI_CACHE_UPDATE_URL: z.string().min(1).optional(),
    EMOJI_CACHE_UPDATE_TOKEN: z.string().min(1).optional(),
    BASE_URL: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
