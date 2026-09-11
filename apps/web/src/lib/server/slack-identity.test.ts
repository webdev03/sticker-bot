import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import { verifySlackIdentity } from "./slack-identity.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const claims = {
  sub: "U123",
  nonce: "nonce",
  "https://slack.com/team_id": "T123",
};
const sign = (payload = claims, options: jwt.SignOptions = {}) =>
  jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    keyid: "test",
    issuer: "https://slack.com",
    audience: "client",
    expiresIn: "5 minutes",
    ...options,
  });

test("Slack identity verifies signature, issuer, audience, expiry, nonce and workspace", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, options: RequestInit) => {
      assert.equal(url, "https://slack.com/openid/connect/keys");
      assert.equal(options.redirect, "error");
      return Response.json({
        keys: [{ ...publicKey.export({ format: "jwk" }), kid: "test" }],
      });
    },
  );
  assert.equal(
    (await verifySlackIdentity(sign(), "client", "T123", "nonce")).sub,
    "U123",
  );
  for (const token of [
    sign(claims, { issuer: "https://evil.test" }),
    sign(claims, { audience: "other" }),
    sign(claims, { expiresIn: -1 }),
    sign({ ...claims, nonce: "wrong" }),
    sign({ ...claims, "https://slack.com/team_id": "T999" }),
    sign().slice(0, -10) + "0123456789",
  ]) {
    await assert.rejects(verifySlackIdentity(token, "client", "T123", "nonce"));
  }
});
