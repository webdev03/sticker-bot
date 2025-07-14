<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<h1 class="text-2xl font-semibold">Hello, {data.auth.name}!</h1>
