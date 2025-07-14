import type { JWTData } from "$lib/types";
import { error, redirect } from "@sveltejs/kit";
import { dev } from "$app/environment";
import {
  JWT_SIGNING_SECRET,
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET,
} from "$env/static/private";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

import { db } from "@repo/db/client";
import { authAttempt } from "@repo/db/schema";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get("code");
  const state = Number(url.searchParams.get("state"));
  if (!code || !state || Number.isNaN(state))
    return new Response("Invalid params", { status: 400 });
  const result = await db.query.authAttempt.findFirst({
    where: eq(authAttempt.state, state),
  });
  if (!result) return new Response("Not found", { status: 404 });

  const slackReq = await fetch(
    `https://api.slack.com/api/openid.connect.token?client_id=${encodeURIComponent(SLACK_CLIENT_ID)}&client_secret=${encodeURIComponent(SLACK_CLIENT_SECRET)}&code=${encodeURIComponent(code)}&grant_type=authorization_code&redirect_uri=${encodeURIComponent(result.redirectUri)}`,
  );

  const slackReqJSON = await slackReq.json();

  if (!slackReq.ok || !slackReqJSON.ok) error(500, "Please try again");

  const jwtData = jwt.decode(slackReqJSON.id_token);

  if (!jwtData || typeof jwtData === "string") error(500, "Please try again");

  if (jwtData.nonce !== result.nonce)
    error(500, "Nonce verification failed, please try again");

  cookies.set(
    "token",
    jwt.sign(
      {
        user: jwtData.sub!,
        name: jwtData.name || jwtData.given_name || "<Unknown>",
        image: jwtData.picture,
      } satisfies JWTData,
      JWT_SIGNING_SECRET,
      {
        // 1 year if in the development server
        expiresIn: dev ? "1 year" : "24 hours",
      },
    ),
    {
      path: "/",
      httpOnly: true,
    },
  );

  redirect(307, "/app");
};
