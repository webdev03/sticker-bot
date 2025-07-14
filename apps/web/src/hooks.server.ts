import type { Handle } from "@sveltejs/kit";
import type { JWTData } from "$lib/types";
import { redirect } from "@sveltejs/kit";
import { JWT_SIGNING_SECRET } from "$env/static/private";
import jwt from "jsonwebtoken";

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get("token") ?? null;
  if (token === null) {
    event.locals.auth = null;
    return resolve(event);
  } else {
    try {
      const session = jwt.verify(token, JWT_SIGNING_SECRET) as JWTData;
      if (session !== null) {
        event.cookies.set("token", token, {
          path: "/",
        });
        event.locals.auth = session;
      } else throw Error("Bad session");
    } catch {
      event.cookies.delete(token, {
        path: "/",
      });
      event.locals.auth = null;
    }
  }

  if (event.url.pathname.startsWith("/app") && event.locals.auth === null)
    throw redirect(307, "/");

  return resolve(event);
};
