# sticker-bot

![Hackatime badge](https://hackatime-badge.hackclub.com/U079QLTJZ7H/sticker-bot)

A Slack bot that lets you make large emoji images! (I call them stickers, like stickers in other communication apps)

**Inspired by [emojibot](https://github.com/taciturnaxolotl/emojibot)!**

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
bun dev
```

The deployment guide should be added soon! Essentially, you will need to deploy both `apps/bot` and `apps/web`.
