<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      <!-- <RouterLink to="/">Home</RouterLink> -->
    </nav>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  @apply p-6;
}

nav {
  @apply flex justify-center gap-4 text-base hover:text-gray-600;
}
</style>
