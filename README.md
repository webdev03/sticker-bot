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
