<script setup lang="ts">
import { ref } from 'vue'

function nameToUrl(name: string): string {
  const base_url = `${import.meta.env.VITE_BASE_URL}/map-screenshots/`
  const formated_name = name.toLowerCase().replace(' ', '_')
  return `${base_url}${formated_name}.jpg`
}

const maps = ref([
  {
    name: 'Bloodwood',
  },
  {
    name: 'Oasis',
  },
  {
    name: 'Steaming Springs',
  },
  {
    name: 'Sandspit',
  },
])
</script>

<template>
  <main class="flex flex-col p-6 gap-6">
    <h1 class="self-center text-2xl text-bold">Maps Of Exile 2</h1>
    <div class="flex justify-center w-full">
      <input class="search-input" placeholder="enter map name" />
    </div>
    <div class="maps-wrapper">
      <div v-for="map in maps" :key="map.name">
        <div class="map-item">
          <img :src="nameToUrl(map.name)" alt="map" />
          <div class="map-name">{{ map.name }}</div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.search-input {
  @apply min-w-96 rounded-lg px-4 py-1 text-center;
}

.maps-wrapper {
  @apply grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 p-4 gap-x-4 gap-y-3;
}

.map-item {
  @apply flex flex-col rounded-lg overflow-hidden;
}

.map-name {
  @apply text-base self-center text-white bg-gray-800 w-full text-center py-0.5;
}
</style>
