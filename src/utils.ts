import { randomBytes } from "crypto";
import sharp from "sharp";

export function randomChars(len = 2): string {
  return randomBytes(len).toString("hex");
}

export function isImageFile(mimeType: string): boolean {
  return ["image/gif", "image/jpeg", "image/png"].includes(mimeType);
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

  form.append("token", process.env.SLACK_USER_XOXC!);
  form.append("mode", "data");
  form.append("name", emojiName);
  form.append("image", new Blob([image]), "image." + type);

  const req = await fetch(`https://${teamDomain}.slack.com/api/emoji.add`, {
    method: "POST",
    body: form,
    headers: {
      Cookie: process.env.SLACK_COOKIE!,
    },
  });
  if (!req.ok) console.error(req.status, req.statusText, await req.text());
  if (req.status === 429) {
    // ratelimit
    await sleep(Number(req.headers.get("Retry-After") || "5") * 1000 + 350);
    return await uploadEmoji({
      emojiName: emojiName,
      teamDomain: teamDomain,
      image: image,
      type: type,
    });
  }

  // responsible sleeping
  await sleep(350);

  return;
}

export async function createSticker({
  fileUrl,
  teamDomain,
  title,
  width,
  height,
}: {
  fileUrl: string;
  teamDomain: string;
  title: string;
  width: number;
  height: number;
}): Promise<string[]> {
  const image = sharp(
    await (
      await fetch(fileUrl, {
        method: "GET",
        headers: {
          // We aren't using `Jimp.read()` because we need to pass the Authorization header
          Authorization: "Bearer " + process.env.SLACK_BOT_TOKEN,
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

  let emojis: string[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const buf = await image
        .clone()
        .extract({
          left: Math.floor((imgWidth / width) * x),
          top: Math.floor((imgHeight / height) * y),
          width: Math.floor(imgWidth / width),
          height: Math.floor(imgHeight / height),
        })
        .resize({
          // Recommended slack emoji size is 128x128
          width: 128,
          height: 128,
          fit: "fill",
        })
        .toBuffer();

      const emojiName = `${title}-${x + 1}-${y + 1}-${randomChars()}`;
      console.log("trying to upload " + emojiName);
      await uploadEmoji({
        emojiName: emojiName,
        teamDomain: teamDomain,
        image: buf,
        type: imgMetadata.format,
      });
      emojis.push(emojiName);
    }
  }

  return emojis;
}
