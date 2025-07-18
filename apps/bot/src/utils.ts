import { randomBytes } from "crypto";
import type { App, StringIndexed } from "@slack/bolt";
import sharp from "sharp";

import { sql } from "@repo/db";
import { db } from "@repo/db/client";

import { env } from "./env";

function secondsToNice(seconds: number) {
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}min ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function recommendedStickerDimensions(
  width: number,
  height: number,
): number[] {
  const aspectRatio = width / height;
  let bestFit = [3, 3];
  let bestDiff = Math.abs(3 / 3 - aspectRatio);
  let bestArea = 3 * 3;

  for (let rows = 1; rows <= 16; rows++) {
    for (let cols = 1; cols <= 16; cols++) {
      const ratio = cols / rows;
      const diff = Math.abs(ratio - aspectRatio);
      const area = rows * cols;

      if (diff < bestDiff || (diff === bestDiff && area > bestArea)) {
        bestDiff = diff;
        bestFit = [cols, rows];
        bestArea = area;
      }
    }
  }

  return bestFit;
}

export function randomChars(len = 2): string {
  return randomBytes(len).toString("hex");
}

export function isImageFile(mimeType: string): boolean {
  return ["image/gif", "image/jpeg", "image/png", "image/webp"].includes(
    mimeType,
  );
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function uploadEmoji({
  emojiName,
  teamDomain,
  image,
  type,
}: {
  emojiName: string;
  teamDomain: string;
  image: Buffer;
  type: string;
}) {
  // logic is based from github.com/taciturnaxolotl/emojibot

  const form = new FormData();

  form.append("token", env.SLACK_USER_XOXC);
  form.append("mode", "data");
  form.append("name", emojiName);
  form.append("image", new Blob([image]), "image." + type);

  const req = await fetch(`https://${teamDomain}.slack.com/api/emoji.add`, {
    method: "POST",
    body: form,
    headers: {
      Cookie: env.SLACK_COOKIE,
    },
  });
  if (!req.ok) console.error(req.status, req.statusText, await req.text());
  if (req.status === 429) {
    // rate limit
    await sleep(Number(req.headers.get("Retry-After") || "5") * 1000 + 250);
    return await uploadEmoji({
      emojiName: emojiName,
      teamDomain: teamDomain,
      image: image,
      type: type,
    });
  }

  // responsible sleeping
  await sleep(250);

  return;
}

export async function createSticker({
  fileUrl,
  teamDomain,
  title,
  width,
  height,
  channel,
  timestamp,
  app,
}: {
  fileUrl: string;
  teamDomain: string;
  title: string;
  width: number;
  height: number;
  channel: string;
  timestamp: string;
  app: App<StringIndexed>;
}): Promise<string[]> {
  await app.client.chat.postMessage({
    channel: channel,
    thread_ts: timestamp,
    text: `Creating new ${width}x${height} sticker: "${title}"`,
  });

  const image = sharp(
    await (
      await fetch(fileUrl, {
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
  );
  const imgMetadata = await image.metadata();
  const imgWidth = imgMetadata.width;
  const imgHeight = imgMetadata.pageHeight || imgMetadata.height;
  const isAnimated = Boolean(imgMetadata.pages && imgMetadata.pages > 1);

  let emojis: string[] = [];

  const startTime = Date.now();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const newImg = image
        .clone()
        .extract({
          left: Math.floor((imgWidth / width) * x),
          top: Math.floor((imgHeight / height) * y),
          width: Math.floor(imgWidth / width),
          height: Math.floor(imgHeight / height),
        })
        .resize({
          // Recommended slack emoji size is 128x128
          width: Math.min(
            128,
            Math.floor(Math.max(imgWidth / width, imgHeight / height)),
          ),
          height: Math.min(
            128,
            Math.floor(Math.max(imgWidth / width, imgHeight / height)),
          ),
          fit: "fill",
        });

      if (isAnimated && (await newImg.toBuffer()).byteLength / 1000 > 128) {
        let quality = 60;
        while (quality >= 10) {
          const testingBuf = await newImg
            .clone()
            .webp({
              effort: 4, // change this to 5 or 6 if you're self-hosting and are fine with lots of cpu usage
              quality: quality,
            })
            .toBuffer();
          // yeah, I know it's 1000 not 1024, it's for a safe buffer zone
          if (testingBuf.byteLength / 1000 < 128) {
            newImg.webp({
              effort: 4, // same here
              quality: quality,
            });
            break;
          }
          quality -= 10;
        }
      }

      const buf = await newImg.toBuffer();

      const emojiName = `${title}-${x + 1}-${y + 1}-${randomChars()}`;
      console.log(
        "trying to upload " + emojiName,
        "size:",
        (buf.byteLength / 1024).toFixed(3) + "kb",
      );
      await uploadEmoji({
        emojiName: emojiName,
        teamDomain: teamDomain,
        image: buf,
        type: (await newImg.metadata()).format,
      });
      emojis.push(emojiName);
    }

    if (y !== height - 1) {
      const completedSoFar = (y + 1) * width;
      await app.client.chat.postMessage({
        channel: channel,
        thread_ts: timestamp,
        text: `Finished row ${y + 1}! ${completedSoFar}/${width * height} done so far. ETA: ${secondsToNice(
          Math.ceil(
            (((Date.now() - startTime) / completedSoFar) *
              (width * height - completedSoFar)) /
              1000,
          ),
        )}`,
      });
    }
  }

  return emojis;
}

export function formatSticker(emojis: string[], width: number): string {
  return emojis
    .map((x) => `:${x}:`)
    .map((x, i) => {
      if ((i + 1) % width === 0) return x + "\n";
      return x;
    })
    .join("");
}

// On startup, try to add the extension for Levenshtein distance
await db.execute(sql`CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;`);
