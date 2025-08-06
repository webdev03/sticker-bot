import { PUBLIC_EMOJI_CACHE_GET_URL } from "$env/static/public";

// https://www.val.town/x/webdev03/emojicache
// val.town has a ratelimit so we can't make a request per emoji like we could with cachet
// so this batches the requests up every 50ms
let emojiQueue = new Set<string>();
let emojis = new Map<string, string>();
export async function getURL(emoji: string): Promise<string> {
  if (emojis.has(emoji)) return emojis.get(emoji)!;
  emojiQueue.add(emoji);
  if (emojiQueue.size === 1) {
    return await new Promise((resolve) => {
      setTimeout(async () => {
        const res = await fetch(PUBLIC_EMOJI_CACHE_GET_URL, {
          method: "POST",
          body: JSON.stringify([...emojiQueue]),
        });
        if (!res.ok) resolve(await getURL(emoji));
        const newEmojis = (await res.json()) as Record<string, string>;
        for (const newEmoji of Object.entries(newEmojis)) {
          emojis.set(newEmoji[0], newEmoji[1]);
          emojiQueue.delete(newEmoji[0]);
        }
        resolve(newEmojis[emoji]);
      }, 50);
    });
  } else {
    await new Promise((resolve) => setTimeout(resolve, 75)); // +25ms for fun
    return await getURL(emoji);
  }
}
