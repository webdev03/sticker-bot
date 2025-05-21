import { App } from "@slack/bolt";
import { Jimp, ResizeStrategy } from "jimp";
import { isImageFile, randomChars, uploadEmoji } from "./utils";

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
      .filter((x) => !"abcdefghijklmnopqrstuvwxyz1234567890-_+'".includes(x))
      .length !== 0
  ) {
    await client.chat.postMessage({
      channel: message.channel,
      thread_ts: message.ts,
      text: "your message text is the name of your sticker! it must be fully lowercase and have no punctuation!",
    });
    return;
  }

  if (message.text.length > 50) {
    await client.chat.postMessage({
      channel: message.channel,
      thread_ts: message.ts,
      text: "your sticker name is too long! please make it shorter (less than or equal to 50 chars)",
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

  if (message.user !== body.user.id) {
    await client.chat.postEphemeral({
      channel: body.channel.id,
      thread_ts: message.ts,
      user: body.user.id,
      text: `you don't have permission to click that button!!`,
    });
    return;
  }

  const file = message.files![0]!;

  const title = message.text;
  if (!title) return;

  const image = await Jimp.fromBuffer(
    await (
      await fetch(file.url_private!, {
        method: "GET",
        headers: {
          // We aren't using `Jimp.read()` because we need to pass the Authorization header
          Authorization: "Bearer " + process.env.SLACK_BOT_TOKEN,
        },
      })
    ).arrayBuffer(),
  );

  await client.chat.delete({
    channel: body.channel.id,
    ts: body.message.ts,
  });

  // This reaction is supposed to show that the sticker is being processed
  await client.reactions.add({
    channel: body.channel.id,
    name: "thinking_face",
    timestamp: message.ts!,
  });

  let emojis: string[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const buf = await image
        .clone()
        .crop({
          x: Math.floor((image.width / width) * x),
          y: Math.floor((image.height / height) * y),
          w: Math.floor(image.width / width),
          h: Math.floor(image.height / height),
        })
        .resize({
          // Recommended slack emoji size is 128x128
          h: 128,
          w: 128,
          mode: ResizeStrategy.BILINEAR,
        })
        .getBuffer("image/png");

      const emojiName = `${title}-${x + 1}-${y + 1}-${randomChars()}`;
      app.logger.info("trying to upload " + emojiName + " for " + body.user.id);
      await uploadEmoji(emojiName, body.team!.domain, buf);
      emojis.push(emojiName);
    }
  }

  if (!body.team) throw new Error("no body.team !!");

  try {
    await client.reactions.remove({
      channel: body.channel.id,
      name: "thinking_face",
      timestamp: message.ts!,
    });
  } catch {}

  await client.chat.postMessage({
    channel: body.channel.id,
    thread_ts: message.ts,
    text: emojis
      .map((x) => `:${x}:`)
      .map((x, i) => {
        if ((i + 1) % width === 0) return x + "\n";
        return x;
      })
      .join(""),
  });
});

await app.start();
app.logger.info("StickerBot has started!!");
