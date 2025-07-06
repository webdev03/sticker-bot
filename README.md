# sticker-bot

![Hackatime badge](https://hackatime-badge.hackclub.com/U079QLTJZ7H/sticker-bot)

A Slack bot that lets you make large emoji images! (I call them stickers, like stickers in other communication apps)

**Inspired by [emojibot](https://github.com/taciturnaxolotl/emojibot)!**

## Setup

**You can either use the `Dockerfile` with Docker to deploy this project, or you can follow the instructions below to
manually run it:**

You will need [Bun](https://bun.sh) to run this bot.

To set up the `.env` file:

```bash
cp .env.example .env
$EDITOR .env # add the requested environment variables! you can use the slack-manifest.json for assistance creating the Slack app
```

To install dependencies:

```bash
bun install
```

To start:

```bash
bun start
```
