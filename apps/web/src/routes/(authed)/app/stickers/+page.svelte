<script lang="ts">
  import { onMount } from "svelte";
  import { Loader } from "@lucide/svelte";

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

<div class="columns-1 sm:columns-2 lg:columns-3 gap-3 p-4 py-6">
  {#each stickers as sticker}
    <div class="mb-4 break-inside-avoid rounded-xl bg-white p-4 shadow">
      <a href={sticker.slackPermalink} target="_blank" class="font-semibold"
        >{sticker.title}</a
      >
      <!-- it's passed as a string -->
      <p class="text-sm text-gray-500">
        {new Date(sticker.createdAt).toISOString()}
      </p>
      <p class="text-xs text-gray-400">{sticker.width}x{sticker.height}</p>

      <div
        class="mt-3 grid w-max"
        style={`grid-template-columns: repeat(${sticker.width}, minmax(0, 1fr));`}
      >
        {#each sticker.emojis as emoji, i}
          <img
            class="inline p-0 m-0 h-8 w-8"
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
