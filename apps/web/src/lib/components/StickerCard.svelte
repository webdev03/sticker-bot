<script lang="ts">
  import { ClipboardCopy, ThumbsUp } from "@lucide/svelte";
  import { buttonVariants } from "$lib/components/ui/button";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { getURL } from "$lib/sticker-cache";
  import { toast } from "svelte-sonner";

  import type { Sticker } from "../../routes/(authed)/app/api/stickers/+server";

  function copy(text: string) {
    toast.promise(navigator.clipboard.writeText(text), {
      loading: "Copying...", // this shouldn't ever show up
      success: "Copied to clipboard!",
      error: "Failed to copy to clipboard!",
    });
  }

  function toggleLike(sticker: Sticker) {
    toast.promise(
      (async () => {
        const res = await fetch("/app/api/stickers/like", {
          method: "POST",
          body: JSON.stringify({
            id: sticker.id,
            liked: !sticker.likedByMe,
          }),
        });
        if (res.ok) sticker.likedByMe = !sticker.likedByMe;
        else
          throw new Error(
            "Failed to like/unlike: " + res.status + res.statusText,
          );
      })(),
      {
        loading: "Processing...",
        success: () => (sticker.likedByMe ? "Liked!" : "Removed like!"),
        error: "Failed to process action!",
      },
    );
  }

  let { sticker }: { sticker: Sticker } = $props();
</script>

<div class="break-inside-avoid rounded-xl bg-white p-4 shadow">
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
    <div class="space-x-2 flex">
      <Tooltip.Root>
        <Tooltip.Trigger
          class={(sticker.likedByMe ? "bg-blue-300" : "") +
            " " +
            buttonVariants({ variant: "ghost" })}
          onclick={() => toggleLike(sticker)}><ThumbsUp /></Tooltip.Trigger
        >
        <Tooltip.Content>
          {#if sticker.likedByMe}
            <p>Remove like</p>
          {:else}
            <p>Like sticker</p>
          {/if}
        </Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger
          class={buttonVariants({ variant: "ghost" })}
          onclick={() =>
            copy(
              sticker.emojis
                .map((x) => `:${x}:`)
                .map((x, i) => {
                  if ((i + 1) % sticker.width === 0) return x + "\n";
                  return x;
                })
                .join(""),
            )}><ClipboardCopy /></Tooltip.Trigger
        >
        <Tooltip.Content>
          <p>Copy Slack emojis to clipboard</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  </div>

  <div
    class="mt-3 grid w-max max-w-full"
    style={`grid-template-columns: repeat(${sticker.width}, minmax(0, 1fr));`}
  >
    {#each sticker.emojis as emoji, i}
      {#await getURL(emoji)}
        <div class="inline p-0 w-8 h-8"></div>
      {:then emojiUrl}
        <img
          class="emoji-sync inline p-0 m-0 h-8 w-8"
          src={emojiUrl}
          alt={`Emoji ${i + 1}`}
        />
      {/await}
    {/each}
  </div>
</div>
