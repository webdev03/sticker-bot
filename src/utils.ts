import { randomBytes } from "crypto";
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

  // responsible sleeping
  await sleep(200);

  return req.ok;
}
