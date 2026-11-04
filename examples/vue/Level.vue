<script setup lang="ts">
import "@johnmorrisdotca/meikyuu/element/define";

withDefaults(defineProps<{ level?: number; board?: string }>(), { level: 40, board: "wood" });
</script>

<template>
  <meikyuu-board :level="level" :board="board"></meikyuu-board>
</template>
