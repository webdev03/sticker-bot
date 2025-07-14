<script lang="ts">
  import "../app.css";

  let { children } = $props();
</script>

<svelte:head>
  <title>Sticker Bot</title>
</svelte:head>

<div class="p-2">
  {@render children()}
</div>
