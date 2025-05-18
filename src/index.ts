import { App } from "@slack/bolt";

const ALLOWED_CHANNELS = process.env["SLACK_CHANNELS"]!.split(",") // split comma-separated list
  .map((x) => x.trim()); // trim whitespace

const app = new App({
  socketMode: true,
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.message(async ({ client, message }) => {
  if (
    message.subtype !== "file_share" ||
    !ALLOWED_CHANNELS.includes(message.channel) ||
    !message.files
  ) {
    return; // probably someone just chatting
  }

  if (message.files.length !== 1) {
    await client.chat.postMessage({
      channel: message.channel,
      thread_ts: message.ts,
      attachments: [],
      text: "you must have exactly one image file in your message! no more, no less!",
    });
    return;
  }

  const file = message.files[0];
  if (!file) return; // it should exist

  // TODO: actual logic!!
});

await app.start();
app.logger.info("StickerBot has started!!");
