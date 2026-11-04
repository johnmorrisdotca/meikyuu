<script lang="ts">
  import "@johnmorrisdotca/meikyuu/element/define";

  let { level = 40, board = "wood" }: { level?: number; board?: string } = $props();
</script>

<meikyuu-board {level} {board}></meikyuu-board>
