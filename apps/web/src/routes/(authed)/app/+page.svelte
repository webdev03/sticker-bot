<script lang="ts">
  import StickerList from "$lib/components/StickerList.svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<h1 class="text-2xl font-semibold">Hello, {data.auth.name}!</h1>

<h2 class="text-xl">Liked Stickers</h2>
<p class="italic">
  To add a sticker to this list, press the like button in the Sticker Gallery!
</p>

<StickerList likedOnly={true} />
