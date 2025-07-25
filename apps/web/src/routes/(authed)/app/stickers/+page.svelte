<script lang="ts">
  import { onMount, tick } from "svelte";
  import { ClipboardCopy, Loader } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import { toast } from "svelte-sonner";

  import type { Sticker } from "../api/stickers/+server";

  let stickers: Sticker[] = $state([]);
  let loading = $state(true);

  let intersectionCanary: HTMLDivElement;

  function copy(text: string) {
    toast.promise(navigator.clipboard.writeText(text), {
      loading: "Copying...", // this shouldn't ever show up
      success: "Copied to clipboard!",
      error: "Failed to copy to clipboard!",
    });
  }

  onMount(async () => {
    stickers = await (await fetch("/app/api/stickers")).json();
    if (stickers.length === 0) loading = false;

    new IntersectionObserver(
      async (entries) => {
        if (loading && entries.some((entry) => entry.isIntersecting)) {
          const newStickers = await (
            await fetch(
              "/app/api/stickers?cursor=" + stickers[stickers.length - 1].id,
            )
          ).json();
          if (newStickers.length === 0) loading = false;
          else stickers.push(...newStickers);

          await tick(); // wait for emojis to be added to DOM

          // synchronise all the animations once they have loaded
          // this also runs for non-animated images but its fine

          const animations = [
            ...document.querySelectorAll(".emoji-sync"),
          ] as HTMLImageElement[];

          await Promise.all(
            animations.map(
              (img) =>
                new Promise<void>((resolve) => {
                  if (img.complete) resolve();
                  else img.onload = () => resolve();
                }),
            ),
          );

          animations.forEach((img) => {
            const src = img.src;
            img.src = "";
            img.src = src;
          });
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0,
      },
    ).observe(intersectionCanary);
  });
</script>

<h1 class="text-3xl font-semibold">Sticker Gallery</h1>
<p>List of stickers (newest first)</p>

<div class="columns-1 md:columns-2 xl:columns-3 gap-3 p-4 py-6">
  {#each stickers as sticker}
    <div class="mb-4 break-inside-avoid rounded-xl bg-white p-4 shadow">
      <div class="flex">
        <div class="w-full">
          <a href={sticker.slackPermalink} target="_blank" class="font-semibold"
            >{sticker.title}</a
          >
          <!-- it's passed as a string -->
          <p class="text-sm text-gray-500">
            {new Date(sticker.createdAt).toLocaleString()}
          </p>
          <p class="text-xs text-gray-400">{sticker.width}x{sticker.height}</p>
        </div>
        <div>
          <Button
            variant="ghost"
            onclick={() =>
              copy(
                sticker.emojis
                  .map((x) => `:${x}:`)
                  .map((x, i) => {
                    if ((i + 1) % sticker.width === 0) return x + "\n";
                    return x;
                  })
                  .join(""),
              )}><ClipboardCopy /></Button
          >
        </div>
      </div>

      <div
        class="mt-3 grid w-max max-w-full"
        style={`grid-template-columns: repeat(${sticker.width}, minmax(0, 1fr));`}
      >
        {#each sticker.emojis as emoji, i}
          <img
            class="emoji-sync inline p-0 m-0 h-8 w-8"
            src={`https://cachet.dunkirk.sh/emojis/${emoji}/r`}
            alt={`Emoji ${i + 1}`}
          />
        {/each}
      </div>
    </div>
  {:else}
    {#if !loading}
      <p>No stickers yet! You can be the first!</p>
    {/if}
  {/each}
</div>
<div
  bind:this={intersectionCanary}
  class="h-6 flex justify-center items-center w-full"
>
  {#if loading}<Loader class="animate-spin" />{/if}
</div>
