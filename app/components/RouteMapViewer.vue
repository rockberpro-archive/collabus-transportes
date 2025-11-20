<template>
  <div v-if="isOpen" class="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-0 sm:p-4" @click="handleClose">
    <div class="w-full h-full sm:max-w-[95vw] sm:max-h-[95vh] sm:rounded-lg overflow-hidden bg-white dark:bg-zinc-900 shadow-2xl flex flex-col" @click.stop>
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 shrink-0">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Visualizar Rota no Mapa</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ routeCode }} - {{ origin }} → {{ destination }}
          </p>
        </div>
        <UButton
          icon="i-lucide-x"
          variant="ghost"
          color="neutral"
          @click="handleClose"
        />
      </div>

      <!-- Map Container -->
      <div class="relative flex-1 overflow-hidden">
        <div ref="mapContainer" class="w-full h-full"></div>

        <!-- Info Panel -->
        <div v-if="stops.length > 0" class="absolute top-4 left-4 right-4 sm:right-auto sm:w-80 bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 space-y-3">
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-map-pin" class="text-blue-500 mt-1 shrink-0" />
            <div class="text-sm">
              <p class="font-medium text-gray-900 dark:text-white mb-1">Paradas da Rota:</p>
              <ol class="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
                <li v-for="stop in stops" :key="stop.id">{{ stop.name }}</li>
              </ol>
            </div>
          </div>

          <div class="flex gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-map-pin" class="text-primary-500" />
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ stops.length }} paradas</span>
            </div>
            <div v-if="distance > 0" class="flex items-center gap-2">
              <UIcon name="i-lucide-route" class="text-green-500" />
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ formatDistance(distance) }}</span>
            </div>
          </div>
        </div>

        <!-- No Route Message -->
        <div v-else class="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-zinc-900/90">
          <div class="text-center p-8">
            <UIcon name="i-lucide-map-off" class="text-6xl text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Rota não plotada
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              Esta rota ainda não foi plotada pelo supervisor.
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 shrink-0 pb-safe">
        <UButton
          variant="ghost"
          @click="handleClose"
        >
          Fechar
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as maptilerSdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import { useRouteStops } from '~/composables/useRouteStops'

interface Props {
  isOpen: boolean
  routeId: string | null
  routeCode: string
  origin: string
  destination: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const config = useRuntimeConfig()
const { fetchRouteStops } = useRouteStops()

const mapContainer = ref<HTMLElement | null>(null)
const stops = ref<Array<{ id: string; name: string; lat: number; lng: number; order: number }>>([])
const distance = ref(0)

let map: maptilerSdk.Map | null = null
let markers: maptilerSdk.Marker[] = []

const formatDistance = (meters: number) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(2)}km`
}

const calculateDistance = (coords: number[][]) => {
  if (coords.length < 2) return 0
  
  let total = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const coord1 = coords[i]
    const coord2 = coords[i + 1]
    
    if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) continue
    
    const lng1 = coord1[0]
    const lat1 = coord1[1]
    const lng2 = coord2[0]
    const lat2 = coord2[1]
    
    if (typeof lng1 !== 'number' || typeof lat1 !== 'number' || typeof lng2 !== 'number' || typeof lat2 !== 'number') continue
    
    const R = 6371e3
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lng2 - lng1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    total += R * c
  }
  
  return total
}

const initMap = async () => {
  if (!mapContainer.value || !props.routeId) return

  maptilerSdk.config.apiKey = config.public.MAPTILER_API_KEY as string

  map = new maptilerSdk.Map({
    container: mapContainer.value,
    style: maptilerSdk.MapStyle.STREETS,
    center: [-51.9653, -29.4685],
    zoom: 13,
    language: 'pt',
  })

  map.on('load', async () => {
    // Adicionar source para a linha
    map!.addSource('route-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      },
    })

    // Adicionar layer para a linha
    map!.addLayer({
      id: 'route-line-layer',
      type: 'line',
      source: 'route-line',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 4,
      },
    })

    // Carregar dados da rota
    try {
      const data = await fetchRouteStops(props.routeId!)
      
      if (data.stops && data.stops.length > 0) {
        stops.value = data.stops.map(stop => ({
          id: stop.id,
          name: stop.name,
          lat: stop.latitude,
          lng: stop.longitude,
          order: stop.order,
        }))

        // Adicionar marcadores
        stops.value.forEach((stop, index) => {
          const el = document.createElement('div')
          el.style.cssText = `
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: #3b82f6;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
          `
          el.textContent = (index + 1).toString()

          const marker = new maptilerSdk.Marker({ element: el })
            .setLngLat([stop.lng, stop.lat])
            .addTo(map!)

          // Popup com nome da parada
          const popup = new maptilerSdk.Popup({ 
            offset: 25,
            closeButton: false,
            className: 'route-stop-popup'
          })
            .setText(stop.name)
          
          marker.setPopup(popup)
          markers.push(marker)
        })

        // Desenhar linha da rota
        if (data.geoJson && data.geoJson.coordinates && data.geoJson.coordinates.length > 0) {
          const source = map!.getSource('route-line') as any
          if (source) {
            source.setData({
              type: 'Feature',
              properties: {},
              geometry: data.geoJson,
            })
          }

          // Calcular distância
          distance.value = calculateDistance(data.geoJson.coordinates)

          // Fit bounds
          const bounds = new maptilerSdk.LngLatBounds()
          data.geoJson.coordinates.forEach((coord: number[]) => {
            bounds.extend(coord as [number, number])
          })
          map!.fitBounds(bounds, { padding: 100 })
        }
      }
    } catch (err) {
      console.error('Error loading route:', err)
    }
  })
}

const handleClose = () => {
  emit('close')
}

watch(() => props.isOpen, (newValue) => {
  if (newValue && !map) {
    setTimeout(() => {
      initMap()
    }, 100)
  } else if (!newValue && map) {
    markers.forEach(marker => marker.remove())
    markers = []
    if (map) {
      map.remove()
      map = null
    }
    stops.value = []
    distance.value = 0
  }
})

onUnmounted(() => {
  if (map) {
    markers.forEach(marker => marker.remove())
    map.remove()
  }
})
</script>

<style scoped>
:deep(.maplibregl-popup-content) {
  padding: 10px 14px;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  background-color: white;
  color: rgb(24 24 27);
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid rgb(228 228 231);
}

.dark :deep(.maplibregl-popup-content) {
  background-color: rgb(39 39 42);
  color: rgb(250 250 250);
  border-color: rgb(63 63 70);
}

:deep(.maplibregl-popup-tip) {
  border-top-color: white;
}

.dark :deep(.maplibregl-popup-tip) {
  border-top-color: rgb(39 39 42);
}

:deep(.route-stop-popup .maplibregl-popup-content) {
  min-width: 120px;
  text-align: center;
}
</style>
