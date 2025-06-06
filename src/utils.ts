import { randomBytes } from "crypto";
import { Jimp, ResizeStrategy } from "jimp";

export function randomChars(len = 6): string {
  return randomBytes(len).toString("hex");
}

export function isImageFile(mimeType: string): boolean {
  return ["image/gif", "image/jpeg", "image/png", "image/tiff"].includes(
    mimeType,
  );
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function uploadEmoji(
  emojiName: string,
  teamDomain: string,
  image: Buffer, // must be png
) {
  // logic is based from github.com/taciturnaxolotl/emojibot

  const form = new FormData();

  form.append("token", process.env.SLACK_USER_XOXC!);
  form.append("mode", "data");
  form.append("name", emojiName);
  form.append("image", new Blob([image]), "image.png");

  const req = await fetch(`https://${teamDomain}.slack.com/api/emoji.add`, {
    method: "POST",
    body: form,
    headers: {
      Cookie: process.env.SLACK_COOKIE!,
    },
  });
  if (!req.ok) console.error(req.status, req.statusText, await req.text());

  // responsible sleeping
  await sleep(250);

  return req.ok;
}

export async function createSticker(
  fileUrl: string,
  teamDomain: string,
  title: string,
  width: number,
  height: number,
): Promise<string[]> {
  const image = await Jimp.fromBuffer(
    await (
      await fetch(fileUrl, {
        method: "GET",
        headers: {
          // We aren't using `Jimp.read()` because we need to pass the Authorization header
          Authorization: "Bearer " + process.env.SLACK_BOT_TOKEN,
        },
      })
    ).arrayBuffer(),
  );

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
      console.log("trying to upload " + emojiName);
      await uploadEmoji(emojiName, teamDomain, buf);
      emojis.push(emojiName);
    }
  }

  return emojis;
}
