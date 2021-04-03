<script>
  import { onMount } from "svelte";

  import Main from "./Main.svelte";

  onMount(async () => {});
</script>

<Main>
  <slot>
    <h1>Content here</h1>
    Content here
  </slot>
</Main>
