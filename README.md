# sticker-bot

![Hackatime badge](https://hackatime-badge.hackclub.com/U079QLTJZ7H/sticker-bot)

[Demo](https://sticker-bot.devarsh.me)

A Slack bot that lets you make large emoji images! (I call them stickers, like stickers in other communication apps)

**Inspired by [emojibot](https://github.com/taciturnaxolotl/emojibot)!**

The bot (`apps/bot`) uses [Slack Bolt (JS)](https://api.slack.com/bolt) and the website (`apps/web`) uses [SvelteKit](https://svelte.dev/docs/kit/introduction). [Turborepo](https://turborepo.com) is used as well.

## Setup

You will need [Bun](https://bun.sh) to run this bot. Also, for data storage, you will need a [Neon](https://neon.tech) database.

To set up the `.env` file:

```bash
cp .env.example .env
$EDITOR .env # add the requested environment variables! you can use the slack-manifest.json for assistance creating the Slack app
```

To install dependencies:

```bash
bun install --frozen-lockfile
```

To develop:

```bash
bun run dev
```

To deploy this project, you will need to deploy both the bot and the website.

### Deploying the Bot

To deploy the bot, use the provided `Dockerfile`. Alternatively, run:

```bash
bun run ./apps/bot/src/index.ts
```

### Deploying the Website

The website was designed to be deployed with Vercel and uses the `@sveltejs/adapter-vercel` SvelteKit adapter. If you would like to deploy with a different provider, adjust the configuration in `apps/web/svelte.config.js` and follow the instructions for your preferred adapter.


### Emoji proxy migration

Deploy [slack-emoji-proxy](https://github.com/imdevarsh/slack-emoji-proxy), then
create a dedicated named API key from its Slack App Home. Configure
`SLACK_EMOJI_PROXY_URL` (HTTPS) and `SLACK_EMOJI_PROXY_TOKEN` on the bot server.
Remove the old Slack browser token and cookie from sticker-bot's deployment.
The bot retains its normal bot and Socket Mode tokens. The separate proxy
remains responsible for Slack emoji credentials and audit logging.

All uploads are attributed to the Slack user who owns the proxy key. Keep that
owner consistent when rotating keys so deletions keep working. Sticker-bot
continues to enforce each sticker's creator before allowing deletion.

Old emoji created outside the proxy cannot be deleted through it without a
reviewed ownership backfill. Follow the proxy's backfill documentation; some
old emoji will require manual operator handling. A refused deletion keeps the
sticker database record. Partial uploads/deletions and ambiguous network
failures require checking proxy activity before retrying; mutations are not
automatically replayed. Do not restore browser credentials to bypass ownership.

New sticker names accept lowercase letters, numbers, `_` and `-` (up to 50
characters). Image inputs are capped at 10 MiB, 40 million decoded pixels and
50 frames; grids remain limited to 16×16. Run one bot process: the two-job
creation limit is per process. Private downloads accept `files.slack.com` and
reject redirects; unexpected Slack download behaviour fails closed.

After deploying the authentication fixes, rotate `JWT_SIGNING_SECRET` to
invalidate sessions issued before workspace verification was enforced. Use a
strong random secret as described in `.env.example`. No schema migration is
required; abandoned rows in `auth_attempt` can be periodically removed.

### Security regression checks

```sh
bun test apps/bot/src/security.test.ts apps/web/src/lib/server/slack-identity.test.ts
bun run typecheck
```
