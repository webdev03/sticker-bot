# Security review and proxy migration

Review scope: bot handlers, image processing, website authentication and API
routes, configuration, Docker context, and dependency audit. This is a source
review with mocked regression tests, not a penetration test of the deployed
services. No real Slack credentials, production database, or live emoji
mutations were used.

## Findings addressed

- **High — login CSRF:** `sign-in` stored a predictable numeric state without
  binding it to the initiating browser. A signed, HTTP-only, ten-minute browser
  cookie now binds state and nonce; callbacks atomically consume the DB row.
- **High — workspace restriction missing:** the callback trusted the workspace
  selector in the authorisation URL rather than enforcing the returned team.
  It now verifies the RS256 signature using Slack's fixed JWKS endpoint,
  issuer, audience, expiry, nonce, and configured workspace. Previously it
  merely decoded the token received over TLS; this is not evidence that an
  attacker could directly submit arbitrary unsigned tokens to the callback.
- **High impact if an image was built with secrets present — Docker context:**
  `COPY . .` had no `.dockerignore`, allowing local `.env` files into an image.
  Environment files, Git metadata and local dependencies are now excluded.
  If an existing image contained credentials, rotate those credentials and
  remove affected images from distribution.
- **Credential exposure reduction:** sticker-bot no longer stores or sends a
  Slack browser token/cookie. Emoji mutations use a server-only revocable proxy
  API key. The proxy still holds privileged credentials; this change removes
  them from sticker-bot, not from the overall architecture.
- **Resource abuse and input validation:** private downloads now enforce a
  fixed HTTPS host, reject redirects, check status, time out, and enforce a
  streamed 10 MiB limit. Image pixel/frame and grid limits are checked in the
  creation path, including after the original message may have been edited.
  Names match the proxy's accepted character set. Creation is limited to two
  jobs per bot process, and reservations are released on failures.
- **Mutation failure handling:** uploads and removals require both HTTP success
  and `{ ok: true }`. No automatic mutation retries occur after uncertain
  outcomes. Failed deletion keeps the sticker record. This avoids the old
  behaviour that reported success and discarded records after rejected calls.
- **Session/API hardening:** invalid session cookies are deleted by their
  correct name; session JWTs permit only HS256. Likes require same-origin
  requests and validated IDs/booleans; repeat likes are idempotent.

Slack identity checks follow the endpoints and claims in
[Slack's Sign in with Slack documentation](https://docs.slack.dev/authentication/sign-in-with-slack/).

## Operational limitations

- Proxy ownership belongs to the configured key's user. Existing sticker
  creator checks remain necessary because multiple people share that key.
- Legacy emoji require reviewed ownership backfill or manual handling. Partial
  mutations cannot be rolled back atomically across Slack, the proxy and the
  sticker database. Inspect proxy activity before retrying failed jobs.
- Rotate `JWT_SIGNING_SECRET` on rollout to expire previously issued sessions.
- Run a single bot process for the in-memory creation limit. This is not a
  distributed rate limiter; sustained authenticated spam still needs deployment
  rate limiting. Abandoned login-attempt rows need periodic cleanup.
- Existing sessions are not continuously checked for Slack deactivation; they
  remain valid until expiry or signing-key rotation.
- The GitHub snapshot contained no AGENTS.md instructions. History and deployed
  secret inventories were not inspected.

## Dependency audit

Bun's audit initially reported 64 findings (1 critical, 27 high, 32 moderate,
4 low). Updates within existing dependency ranges removed 62 findings,
including affected sharp, SvelteKit, Axios, ws, tar and request-parser versions.
The minimum direct sharp/SvelteKit versions are also raised in their manifests.
The lockfile was regenerated and a frozen install was checked.

Two transitive findings remain:

- **Low:** `cookie@0.6.0` via SvelteKit —
  [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x).
  The application uses fixed cookie names, paths and same-site options; no
  attacker-controlled cookie name/domain/path is supplied by these routes.
  Resolving it requires a parent update or a compatibility-tested override
  outside the parent's current cookie range.
- **Moderate, development tooling:** `esbuild@0.18.20` via
  `drizzle-kit > @esbuild-kit/core-utils` —
  [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
  This concerns esbuild's development server. No application code invokes that
  server. Do not expose development tooling as the production service. A fix
  requires changing the parent's esbuild range.

Audit severity does not establish exploitability of every transitive package
in this deployment.

## Validation

- Six regression tests pass with Node 24 and Bun 1.4.2, covering hostile file
  URLs, streamed size limits, grid/name validation, proxy request shape and
  failure handling, and signed Slack identity claims.
- Bot TypeScript check passes; `git diff --check` passes.
- Full workspace typechecking remains blocked: the DB package does not expose
  `process` types to its checker, and the installed TypeScript 7 package is
  incompatible with Svelte-check's compiler API. A local diagnostic run using
  TypeScript 5.9.3 reports three `data.auth` errors in the unchanged app layout
  and page; no errors in the modified authentication code. That temporary
  checker is not a repository dependency change.
- No live Slack upload/deletion or production database test was performed.
