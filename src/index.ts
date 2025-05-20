import { App } from "@slack/bolt";
import { Jimp } from "jimp";
import { isImageFile } from "./utils";

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
      text: "you must have exactly one image file in your message! no more, no less!",
    });
    return;
  }

  if (
    !message.text ||
    message.text.length < 1 ||
    message.text
      .split("")
      .filter((x) => !"abcdefghijklmnopqrstuvwxyz-_+'".includes(x)).length !== 0
  ) {
    await client.chat.postMessage({
      channel: message.channel,
      thread_ts: message.ts,
      text: "your message text is the name of your sticker! it must be fully lowercase and have no punctuation!",
    });
    return;
  }

  const file = message.files[0];
  if (!file) return; // it should exist

  if (!isImageFile(file.mimetype)) {
    await client.chat.postMessage({
      channel: message.channel,
      thread_ts: message.ts,
      text: `your file must be a supported image type! (either png, jpeg, tiff, or gif) (your file was ${file.mimetype})`,
    });
    return;
  }

  await client.chat.postMessage({
    channel: message.channel,
    thread_ts: message.ts,
    text: "Your client cannot display this message, please open this message fully!",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Choose the size of the sticker below!",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              emoji: true,
              text: "2x2",
            },
            value: "2x2",
            action_id: "2x2",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              emoji: true,
              text: "3x3",
            },
            style: "primary",
            value: "3x3",
            action_id: "3x3",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              emoji: true,
              text: "4x4",
            },
            value: "4x4",
            action_id: "4x4",
          },
        ],
      },
    ],
  });
});

// Regex matches `{digit}x{digit}`
app.action(/\dx\d/, async ({ client, action, body, ack }) => {
  await ack();

  if (
    action.type !== "button" ||
    !action.value ||
    body.type !== "block_actions" ||
    !body.actions[0] ||
    !body.channel ||
    !body.message
  )
    return;

  const [width, height] = body.actions[0].action_id.split("x").map(Number);
  if (!width || !height) return;

  const message = (
    await client.conversations.history({
      channel: body.channel.id,
      latest: body.message.thread_ts, // it exists!
      inclusive: true,
      limit: 1,
    })
  )?.messages?.[0];

  if (!message) throw new Error("message not found!");

  const file = message.files![0]!;

  const title = message.text;
  if (!title) return;

  const image = await Jimp.read(file.url_private!);

  // TODO: Logic
});

await app.start();
app.logger.info("StickerBot has started!!");
