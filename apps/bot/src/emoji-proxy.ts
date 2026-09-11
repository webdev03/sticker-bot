/** Never replay mutations automatically: a timeout can follow a successful upload. */
export async function emojiProxyRequest(
  baseUrl: string,
  token: string,
  operation: "upload" | "remove",
  init: RequestInit,
  fetcher: typeof fetch = fetch,
) {
  const base = new URL(baseUrl);
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new Error("Invalid emoji proxy URL");
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetcher(
      new URL(`api/emoji/${operation}`, base.href.replace(/\/?$/, "/")),
      {
        ...init,
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch {
    throw new Error(
      "Emoji proxy request failed; check proxy activity before retrying",
    );
  }
  const data: unknown = await response.json().catch(() => null);
  if (
    !response.ok ||
    !data ||
    typeof data !== "object" ||
    !("ok" in data) ||
    data.ok !== true
  ) {
    // Do not echo upstream bodies or credentials into logs or Slack.
    throw new Error(
      `Emoji proxy rejected ${operation} (HTTP ${response.status})`,
    );
  }
}
