<script>
  import { Dialog } from "svelte-materialify/src";

  export let active = false;
</script>

<Dialog
  class="pa-4 ma-16"
  max-width="552"
  style="overflow-x: hidden"
  bind:active
>
  <slot>
    Lorem ipsum dolor sit amet consectetur adipisicing elit. Autem aperiam quia
    esse impedit libero mollitia tempore nisi dolore ut, quasi incidunt sunt
    sapiente vero iusto necessitatibus eius nulla dignissimos laboriosam.
  </slot>
</Dialog>
