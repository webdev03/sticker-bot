import { test } from "node:test";
import assert from "node:assert/strict";
import {
  downloadSlackImage,
  validDimensions,
  validateStickerInput,
  validateImageMetadata,
} from "./security.ts";
import { emojiProxyRequest } from "./emoji-proxy.ts";

const mockFetch = (
  fn: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Response | Promise<Response>,
) => fn as typeof fetch;

test("dimensions and names reject malicious or excessive inputs", () => {
  for (const n of [-1, 0, 17, Infinity, NaN, 1.5])
    assert.equal(validDimensions(n, 2), false);
  assert.equal(validDimensions(16, 16), true);
  for (const title of ["<@everyone>", "../name", "a".repeat(51), "old+name"])
    assert.throws(() => validateStickerInput(title, 2, 2));
  validateStickerInput("a-good_name", 2, 3);
  assert.throws(() =>
    validateImageMetadata({
      width: 100,
      height: 100,
      format: "gif",
      pages: 51,
    }),
  );
  assert.throws(() =>
    validateImageMetadata({ width: 10000, height: 10000, format: "png" }),
  );
});

test("private file downloads reject untrusted hosts before sending credentials", async () => {
  for (const url of [
    "http://files.slack.com/x",
    "https://files.slack.com.evil.test/x",
    "https://127.0.0.1/x",
    "https://user@files.slack.com/x",
  ]) {
    await assert.rejects(
      downloadSlackImage(
        url,
        "secret",
        mockFetch(() => {
          throw Error("must not fetch");
        }),
      ),
      /Untrusted/,
    );
  }
  const data = await downloadSlackImage(
    "https://files.slack.com/x",
    "secret",
    mockFetch((_url, init) => {
      assert.equal(init?.redirect, "error");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer secret",
      );
      return new Response("image");
    }),
  );
  assert.equal(data.toString(), "image");
});

test("download enforces streamed size and HTTP status", async () => {
  await assert.rejects(
    downloadSlackImage(
      "https://files.slack.com/x",
      "s",
      mockFetch(() => new Response("no", { status: 403 })),
    ),
  );
  await assert.rejects(
    downloadSlackImage(
      "https://files.slack.com/x",
      "s",
      mockFetch(() => new Response(new Uint8Array(10 * 1024 * 1024 + 1))),
    ),
    /10 MiB/,
  );
});

test("proxy uses bearer auth and multipart file contract without following redirects", async () => {
  const form = new FormData();
  form.set("name", "test");
  form.set("file", new Blob(["image"]), "image.png");
  await emojiProxyRequest(
    "https://proxy.test",
    "secret",
    "upload",
    { method: "POST", body: form },
    mockFetch((url, init) => {
      assert.equal(String(url), "https://proxy.test/api/emoji/upload");
      assert.equal(init?.redirect, "error");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer secret",
      );
      assert.equal((init?.body as FormData).get("name"), "test");
      assert.ok((init?.body as FormData).get("file") instanceof Blob);
      return Response.json({ ok: true });
    }),
  );
});

test("proxy fails closed on all errors and does not replay mutations", async () => {
  for (const response of [
    Response.json({ ok: false }),
    Response.json({ ok: false }, { status: 403 }),
    new Response("bad"),
    Response.json({ ok: true }, { status: 429 }),
  ]) {
    let calls = 0;
    await assert.rejects(
      emojiProxyRequest(
        "https://proxy.test",
        "secret",
        "remove",
        { method: "DELETE" },
        mockFetch(() => {
          calls++;
          return response;
        }),
      ),
    );
    assert.equal(calls, 1);
  }
  await assert.rejects(
    emojiProxyRequest("http://proxy.test", "secret", "upload", {}),
    /Invalid/,
  );
});
