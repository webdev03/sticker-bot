import type { JWTData } from "$lib/types";
import { error, redirect } from "@sveltejs/kit";
import { dev } from "$app/environment";
import {
  JWT_SIGNING_SECRET,
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET,
  SLACK_TEAM,
} from "$env/static/private";
import jwt from "jsonwebtoken";

import { verifySlackIdentity } from "$lib/server/slack-identity";
import { and, eq } from "@repo/db";
import { db } from "@repo/db/client";
import { authAttempt } from "@repo/db/schema";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get("code");
  const state = Number(url.searchParams.get("state"));
  if (!code || !state || Number.isNaN(state))
    return new Response("Invalid params", { status: 400 });
  const attemptToken = cookies.get("oauth_attempt");
  cookies.delete("oauth_attempt", { path: "/sign-in" });
  if (!attemptToken) error(400, "Please start sign-in again");
  let attempt;
  try {
    attempt = jwt.verify(attemptToken, JWT_SIGNING_SECRET, {
      algorithms: ["HS256"],
      audience: "slack-login",
    });
  } catch {
    error(400, "Sign-in expired; please start again");
  }
  if (
    typeof attempt === "string" ||
    attempt.state !== state ||
    typeof attempt.nonce !== "string"
  )
    error(400, "Invalid sign-in state");
  // Consume atomically so parallel callbacks cannot reuse a login attempt.
  const [result] = await db
    .delete(authAttempt)
    .where(
      and(eq(authAttempt.state, state), eq(authAttempt.nonce, attempt.nonce)),
    )
    .returning();
  if (!result) error(400, "Sign-in already used; please start again");

  const slackReq = await fetch("https://slack.com/api/openid.connect.token", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: result.redirectUri,
    }),
  });
  const slackReqJSON = await slackReq.json();
  if (
    !slackReq.ok ||
    !slackReqJSON.ok ||
    typeof slackReqJSON.id_token !== "string"
  )
    error(502, "Please try again");
  let jwtData;
  try {
    jwtData = await verifySlackIdentity(
      slackReqJSON.id_token,
      SLACK_CLIENT_ID,
      SLACK_TEAM,
      result.nonce,
    );
  } catch {
    error(403, "Slack identity could not be verified for this workspace");
  }

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
        expiresIn: dev ? "1 year" : "2 days",
      },
    ),
    {
      path: "/",
      httpOnly: true,
      secure: !dev,
      sameSite: "lax",
      maxAge: 2 * 24 * 60 * 60,
    },
  );

  redirect(307, "/app");
};
