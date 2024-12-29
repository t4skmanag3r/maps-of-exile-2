<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'

interface Map {
  name: string
  imageUrl: string
}

type TabType = 'maps' | 'bosses'

const maps = ref<Map[]>([])
const searchQuery = ref('')
const activeTab = ref<TabType>('maps')
const baseUrl = import.meta.env.BASE_URL || '/'
const tabs: TabType[] = ['maps', 'bosses']

async function fetchMaps() {
  try {
    const response = await axios.get<Map[]>(`${baseUrl}maps.json`)
    maps.value = response.data.map((map) => ({
      ...map,
      imageUrl: `${baseUrl}${map.imageUrl.replace(/^\//, '')}`,
    }))
  } catch (error) {
    console.error('Failed to load maps:', error)
  }
}

onMounted(fetchMaps)

const filteredMaps = computed(() => {
  const isBossTab = activeTab.value === 'bosses'
  return maps.value
    .filter((map) => {
      const isBoss = map.name.toLowerCase().includes('(boss)')
      return isBossTab ? isBoss : !isBoss
    })
    .filter((map) => map.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

function setActiveTab(tab: TabType) {
  activeTab.value = tab
}
</script>

<template>
  <main class="flex flex-col p-6 gap-6">
    <h1 class="self-center text-2xl font-bold">Maps Of Exile 2</h1>

    <div class="tabs flex justify-center gap-4 mb-4">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="['tab-button', { active: activeTab === tab }]"
        @click="setActiveTab(tab)"
      >
        {{ tab === 'maps' ? 'Maps' : 'Maps Bosses' }}
      </button>
    </div>

    <div class="flex justify-center w-full">
      <input v-model="searchQuery" class="search-input" placeholder="Enter map name" />
    </div>

    <div v-if="filteredMaps.length === 0" class="text-center">
      No maps found matching your search.
    </div>

    <div v-else class="maps-wrapper">
      <div v-for="map in filteredMaps" :key="map.name" class="map-item">
        <a :href="map.imageUrl" target="_blank">
          <img :src="map.imageUrl" :alt="map.name" />
        </a>
        <div class="map-name">{{ map.name }}</div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.search-input {
  @apply min-w-96 rounded-lg px-4 py-1 text-center text-black;
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

/* Tabs */
.tabs {
  @apply mb-4 flex justify-center gap-4;
}

.tab-button {
  @apply px-4 py-2 text-lg rounded-lg cursor-pointer transition-all;
  @apply bg-gray-200 hover:bg-gray-300 text-gray-800;
}

.tab-button.active {
  @apply bg-blue-500 text-white;
}
</style>
