<script>
  import { Dialog } from "svelte-materialify";

  export let active = false;
</script>

<Dialog class="pa-4" bind:active>
  <slot>
    Lorem ipsum dolor sit amet consectetur adipisicing elit. Autem aperiam quia
    esse impedit libero mollitia tempore nisi dolore ut, quasi incidunt sunt
    sapiente vero iusto necessitatibus eius nulla dignissimos laboriosam.
  </slot>
</Dialog>
