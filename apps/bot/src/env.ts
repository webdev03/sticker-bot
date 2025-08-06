import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    SLACK_SIGNING_SECRET: z.string().min(1),
    SLACK_BOT_TOKEN: z.string().min(1),
    SLACK_APP_TOKEN: z.string().min(1),
    SLACK_USER_XOXC: z.string().min(1),
    SLACK_COOKIE: z.string().min(1),
    SLACK_CHANNELS: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    EMOJI_CACHE_UPDATE_URL: z.string().min(1).optional(),
    EMOJI_CACHE_UPDATE_TOKEN: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
