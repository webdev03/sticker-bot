<script lang="ts">
  import { onMount, tick } from "svelte";
  import { Loader } from "@lucide/svelte";
  import StickerCard from "$lib/components/StickerCard.svelte";

  import type { Sticker } from "../api/stickers/+server";

  let stickers: Sticker[] = $state([]);
  let loading = $state(true);

  let intersectionCanary: HTMLDivElement;

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

<div class="columns-1 md:columns-2 xl:columns-3 gap-3 p-4 py-6 *:mb-3">
  {#each stickers as sticker}
    <StickerCard {sticker} />
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
