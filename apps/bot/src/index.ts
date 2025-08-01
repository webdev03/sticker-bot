import { App } from "@slack/bolt";
import sharp from "sharp";

import { asc, eq, sql } from "@repo/db";
import { db } from "@repo/db/client";
import { stickers } from "@repo/db/schema";

import { env } from "./env";
import {
  createSticker,
  formatSticker,
  isImageFile,
  recommendedStickerDimensions,
} from "./utils";

const ALLOWED_CHANNELS = env["SLACK_CHANNELS"]!.split(",") // split comma-separated list
  .map((x) => x.trim()); // trim whitespace

const reservedTitles = new Set(); // when the button is clicked to start creating a sticker, it is added here, to prevent duplication

export const app = new App({
  socketMode: true,
  token: env.SLACK_BOT_TOKEN,
  appToken: env.SLACK_APP_TOKEN,
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
      text: `your file must be a supported image type! (either png, jpeg, gif, or webp) (your file was ${file.mimetype})`,
    });
    return;
  }

  const imageMeta = await sharp(
    await (
      await fetch(file.url_private!, {
        method: "GET",
        headers: {
          // We aren't using `Jimp.read()` because we need to pass the Authorization header
          Authorization: "Bearer " + env.SLACK_BOT_TOKEN,
        },
      })
    ).arrayBuffer(),
    {
      animated: true,
    },
  ).metadata();

  if (imageMeta.pages && imageMeta.pages > 50) {
    await client.chat.postMessage({
      channel: message.channel,
      thread_ts: message.ts,
      text: `your animated image can have a maximum of 50 frames! (currently it has ${imageMeta.pages} frames)`,
    });
    return;
  }

  const recommended = recommendedStickerDimensions(
    imageMeta.width,
    imageMeta.pageHeight || imageMeta.height,
  );

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
              text: `Recommended (${recommended[0]}x${recommended[1]})`,
            },
            style: "primary",
            value: `${recommended[0]}x${recommended[1]}`,
            action_id: `${recommended[0]}x${recommended[1]}`,
          },
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
          {
            type: "button",
            text: {
              type: "plain_text",
              emoji: true,
              text: "Custom",
            },
            value: "Custom",
            action_id: "custom",
          },
        ],
      },
    ],
  });
});

app.action("custom", async ({ client, action, body, ack }) => {
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

  const title = message.text;
  if (!title) return;

  await client.chat.delete({
    channel: body.channel.id,
    ts: body.message.ts,
  });

  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      // View identifier
      callback_id: "custom_dimensions",
      title: {
        type: "plain_text",
        text: "Sticker Dimensions",
      },
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Please select the width and height of the sticker",
          },
        },
        {
          type: "input",
          block_id: "width",
          label: {
            type: "plain_text",
            text: "Width of the sticker:",
          },
          element: {
            type: "number_input",
            action_id: "width",
            min_value: "1",
            max_value: "16",
            is_decimal_allowed: false,
          },
        },
        {
          type: "input",
          block_id: "height",
          label: {
            type: "plain_text",
            text: "Height of the sticker:",
          },
          element: {
            type: "number_input",
            action_id: "height",
            min_value: "1",
            max_value: "16",
            is_decimal_allowed: false,
          },
        },
      ],
      submit: {
        type: "plain_text",
        text: "Create",
      },
      private_metadata: body.channel.id + ";;" + message.ts,
    },
  });
});

app.view("custom_dimensions", async ({ client, body, view, ack }) => {
  await ack();
  if (body.type !== "view_submission") return;
  const width = Number(view.state.values.width?.width?.value);
  const height = Number(view.state.values.height?.height?.value);
  if (!width || Number.isNaN(width) || !height || Number.isNaN(height)) return;

  const [channelId, messageTs] = view.private_metadata.split(";;");
  if (!channelId || !messageTs) return;

  const message = (
    await client.conversations.history({
      channel: channelId,
      latest: messageTs,
      inclusive: true,
      limit: 1,
    })
  )?.messages?.[0];

  if (!message || !message.user) throw new Error("message not found!");

  if (message.user !== body.user.id) {
    await client.chat.postEphemeral({
      channel: channelId,
      thread_ts: message.ts,
      user: body.user.id,
      text: `you don't have permission to click that button!!`,
    });
    return;
  }

  const file = message.files![0]!;

  const title = message.text;
  if (!title) return;

  console.log(reservedTitles);

  if (
    reservedTitles.has(title) ||
    (await db.select().from(stickers).where(eq(stickers.title, title)))
      .length !== 0
  ) {
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: message.ts,
      text: "a sticker with the same name already exists!",
    });
    return;
  }

  reservedTitles.add(title);

  // This reaction is supposed to show that the sticker is being processed
  await client.reactions.add({
    channel: channelId,
    name: "thinking_face",
    timestamp: message.ts!,
  });

  console.log("creating sticker '", title, "' for", message.user);

  const emojis = await createSticker({
    fileUrl: file.url_private!,
    teamDomain: body.team!.domain,
    title: title,
    width: width,
    height: height,
    channel: channelId,
    timestamp: message.ts!,
    app: app,
  });

  try {
    await client.reactions.remove({
      channel: channelId,
      name: "thinking_face",
      timestamp: message.ts!,
    });
  } catch {}

  const stickerMessage = await client.chat.postMessage({
    channel: channelId,
    thread_ts: message.ts,
    text: formatSticker(emojis, width),
  });

  if (!stickerMessage.ok) throw Error("Couldn't send sticker message");
  if (!stickerMessage.ts)
    throw Error("Couldn't get timestamp of sticker message");

  const permalink = (
    await client.chat.getPermalink({
      channel: channelId,
      message_ts: stickerMessage.ts,
    })
  ).permalink;
  if (!permalink) throw Error("Couldn't get permalink");

  try {
    await db.insert(stickers).values({
      title: title,
      creator: message.user,
      emojis: emojis,
      width: width,
      height: height,
      slackPermalink: permalink,
    });
  } catch (error) {
    console.error("error saving sticker:", error);
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: message.ts,
      text: "oops! there was an error saving your sticker to the database! please try again if you need it to be saved!",
    });
  }

  await client.chat.postMessage({
    channel: channelId,
    thread_ts: message.ts,
    text: `<@${message.user}> Done!`,
  });

  reservedTitles.delete(title);
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

  if (!message || !message.user) throw new Error("message not found!");

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

  if (
    reservedTitles.has(title) ||
    (await db.select().from(stickers).where(eq(stickers.title, title)))
      .length !== 0
  ) {
    await client.chat.postMessage({
      channel: body.channel.id,
      thread_ts: message.ts,
      text: "a sticker with the same name already exists!",
    });
    return;
  }

  reservedTitles.add(title);

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

  console.log("creating sticker '", title, "' for", message.user);

  const emojis = await createSticker({
    fileUrl: file.url_private!,
    teamDomain: body.team!.domain,
    title: title,
    width: width,
    height: height,
    channel: body.channel.id,
    timestamp: message.ts!,
    app: app,
  });

  try {
    await client.reactions.remove({
      channel: body.channel.id,
      name: "thinking_face",
      timestamp: message.ts!,
    });
  } catch {}

  const stickerMessage = await client.chat.postMessage({
    channel: body.channel.id,
    thread_ts: message.ts,
    text: formatSticker(emojis, width),
  });

  if (!stickerMessage.ok) throw Error("Couldn't send sticker message");
  if (!stickerMessage.ts)
    throw Error("Couldn't get timestamp of sticker message");

  const permalink = (
    await client.chat.getPermalink({
      channel: body.channel.id,
      message_ts: stickerMessage.ts,
    })
  ).permalink;
  if (!permalink) throw Error("Couldn't get permalink");

  try {
    await db.insert(stickers).values({
      title: title,
      creator: message.user,
      emojis: emojis,
      width: width,
      height: height,
      slackPermalink: permalink,
    });
  } catch (error) {
    console.error("error saving sticker:", error);
    await client.chat.postMessage({
      channel: body.channel.id,
      thread_ts: message.ts,
      text: "oops! there was an error saving your sticker to the database! please try again if you need it to be saved!",
    });
  }

  await client.chat.postMessage({
    channel: body.channel.id,
    thread_ts: message.ts,
    text: `<@${message.user}> Done!`,
  });

  reservedTitles.delete(title);
});

// it's a regex to allow for other names like `sticker-dev` to work
// because slack only allows one app to use a sticker name but you may need to have a separate development app
app.command(/sticker.*/, async ({ command, ack, respond }) => {
  await ack();

  const stickerQuery = command.text.trim().toLowerCase();

  // Levenshtein algorithm is used here for basic typo correction
  const sticker = (
    await db
      .select()
      .from(stickers)
      .orderBy(asc(sql`levenshtein(${stickers.title}, ${stickerQuery})`))
      .where(
        sql`levenshtein_less_equal(${stickers.title}, ${stickerQuery}, 5) <= 5`, // levenshtein_less_equal is more efficient
      )
      .limit(1)
  )[0];

  if (!sticker) {
    await respond(
      `Unfortunately, I couldn't find a sticker named "${stickerQuery}" - maybe create it?`,
    );
    return;
  }

  await respond(
    `I found a sticker called "${sticker.title}"!\n\n${formatSticker(sticker.emojis, sticker.width)}`,
  );
});

await app.start();
app.logger.info("StickerBot has started!!");
