import { redirect } from "@sveltejs/kit";
import { BASE_URL, SLACK_CLIENT_ID, SLACK_TEAM } from "$env/static/private";

import { db } from "@repo/db/client";
import { authAttempt } from "@repo/db/schema";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
  const { state, nonce, redirectUri } = (
    await db
      .insert(authAttempt)
      .values({
        redirectUri: BASE_URL + "/sign-in/slack-handler",
      })
      .returning()
  )[0];
  
  redirect(
    307,
    `https://slack.com/openid/connect/authorize?response_type=code&scope=openid%20profile&client_id=${encodeURIComponent(SLACK_CLIENT_ID)}&state=${encodeURIComponent(state)}&team=${encodeURIComponent(SLACK_TEAM)}&nonce=${encodeURIComponent(nonce)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
  );
};
