<script lang="ts">
  import {
    PUBLIC_SLACK_CHANNELS,
    PUBLIC_SLACK_TEAM_DOMAIN,
  } from "$env/static/public";
  import { buttonVariants } from "$lib/components/ui/button";
</script>

<a
  href={`https://${PUBLIC_SLACK_TEAM_DOMAIN}/archives/${PUBLIC_SLACK_CHANNELS.split(",")[0]}`}
  target="_blank"
  class={buttonVariants({ variant: "default" }) + " w-[256px]"}
  >Open channel in Slack</a
>
