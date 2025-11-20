<template>
  <div v-if="isOpen" class="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-0 sm:p-4">
    <div class="w-full h-full sm:max-w-[95vw] sm:max-h-[95vh] sm:rounded-lg overflow-hidden bg-white dark:bg-zinc-900 shadow-2xl flex flex-col" @click.stop>
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 shrink-0">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Plotar Rota</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ route?.code || 'Sem código' }} - {{ route?.origin }} → {{ route?.destination }}
          </p>
        </div>
        <UPopover v-if="hasChanges" v-model:open="showHeaderPopover" :content="{ align: 'end' }">
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            color="neutral"
          />
          
          <template #content="{ close }">
            <div class="p-4 w-80">
              <div class="flex items-start gap-3 mb-4">
                <div class="shrink-0">
                  <div class="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <UIcon name="i-lucide-alert-triangle" class="text-xl text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold text-gray-900 dark:text-white mb-1">
                    Descartar alterações?
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Você tem {{ stops.length }} parada{{ stops.length !== 1 ? 's' : '' }} plotada{{ stops.length !== 1 ? 's' : '' }} que serão perdidas.
                  </p>
                </div>
              </div>
              
              <div class="flex gap-2">
                <UButton
                  variant="ghost"
                  size="sm"
                  class="flex-1"
                  @click="close"
                >
                  Cancelar
                </UButton>
                <UButton
                  color="error"
                  size="sm"
                  class="flex-1"
                  @click="confirmClose"
                  icon="i-lucide-trash-2"
                >
                  Descartar
                </UButton>
              </div>
            </div>
          </template>
        </UPopover>
        <UButton
          v-else
          icon="i-lucide-x"
          variant="ghost"
          color="neutral"
          @click="emit('close')"
        />
      </div>

      <!-- Map Container -->
      <div class="relative flex-1 overflow-hidden">
        <div ref="mapContainer" class="w-full h-full"></div>

        <!-- Floating Instructions Panel -->
        <div class="absolute top-4 left-4 right-4 sm:right-auto sm:w-80 bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 space-y-3">
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-info" class="text-blue-500 mt-1 shrink-0" />
            <div class="text-sm">
              <p class="font-medium text-gray-900 dark:text-white mb-1">Como plotar:</p>
              <ol class="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
                <li>Clique no mapa para adicionar pontos de parada</li>
                <li>Arraste os marcadores para reposicionar</li>
                <li>Clique no marcador para editar o nome ou remover</li>
                <li class="font-semibold text-primary-600 dark:text-primary-400">Use o botão "Salvar Rota" no rodapé para salvar</li>
              </ol>
            </div>
          </div>

          <!-- Stats -->
          <div class="flex gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-map-pin" class="text-primary-500" />
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ stops.length }} paradas</span>
            </div>
            <div v-if="loadingRoute" class="flex items-center gap-2">
              <UIcon name="i-lucide-loader-2" class="animate-spin text-blue-500" />
              <span class="text-sm font-medium text-gray-900 dark:text-white">Calculando rota...</span>
            </div>
            <div v-else-if="totalDistance > 0" class="flex items-center gap-2">
              <UIcon name="i-lucide-route" class="text-green-500" />
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ formatDistance(totalDistance) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 pb-safe border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 shrink-0">
        <p v-if="stops.length < 2" class="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
          <UIcon name="i-lucide-alert-triangle" />
          Adicione pelo menos 2 paradas para salvar
        </p>
        <div v-else class="text-sm text-gray-600 dark:text-gray-400">
          Rota pronta para salvar
        </div>
        
        <div class="flex gap-2 w-full sm:w-auto">
          <UPopover v-if="hasChanges" v-model:open="showFooterPopover" :content="{ align: 'end', side: 'top' }">
            <UButton
              variant="ghost"
              class="flex-1 sm:flex-initial"
              :disabled="saving || loadingRoute"
            >
              Cancelar
            </UButton>
            
            <template #content="{ close }">
              <div class="p-4 w-80">
                <div class="flex items-start gap-3 mb-4">
                  <div class="shrink-0">
                    <div class="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <UIcon name="i-lucide-alert-triangle" class="text-xl text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-semibold text-gray-900 dark:text-white mb-1">
                      Descartar alterações?
                    </h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      Você tem {{ stops.length }} parada{{ stops.length !== 1 ? 's' : '' }} plotada{{ stops.length !== 1 ? 's' : '' }} que serão perdidas.
                    </p>
                  </div>
                </div>
                
                <div class="flex gap-2">
                  <UButton
                    variant="ghost"
                    size="sm"
                    class="flex-1"
                    @click="close"
                  >
                    Voltar
                  </UButton>
                  <UButton
                    color="error"
                    size="sm"
                    class="flex-1"
                    @click="confirmClose"
                    icon="i-lucide-trash-2"
                  >
                    Descartar
                  </UButton>
                </div>
              </div>
            </template>
          </UPopover>
          <UButton
            v-else
            variant="ghost"
            class="flex-1 sm:flex-initial"
            @click="emit('close')"
            :disabled="saving || loadingRoute"
          >
            Cancelar
          </UButton>
          <UButton
            :loading="saving"
            :disabled="stops.length < 2 || loadingRoute"
            class="flex-1 sm:flex-initial"
            @click="handleSave"
            icon="i-lucide-save"
          >
            Salvar Rota
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import * as maptilerSdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import { useRouteStops } from '~/composables/useRouteStops'
import type { StopInput } from '../../types/stop'

interface Props {
  isOpen: boolean
  route: {
    id: string
    code: string | null
    origin: string
    destination: string
  } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const config = useRuntimeConfig()
const toast = useToast()
const { fetchRouteStops, saveRouteStops } = useRouteStops()

const mapContainer = ref<HTMLElement | null>(null)
const stops = ref<Array<{ id: string; name: string; lat: number; lng: number; order: number }>>([])
const routeGeometry = ref<number[][]>([])
const actualDistance = ref(0)
const saving = ref(false)
const loadingRoute = ref(false)
const showHeaderPopover = ref(false)
const showFooterPopover = ref(false)
const originalStops = ref<Array<{ id: string; name: string; lat: number; lng: number; order: number }>>([])

let map: maptilerSdk.Map | null = null
let markers: maptilerSdk.Marker[] = []
let lineSource: any = null
let popupInstance: maptilerSdk.Popup | null = null

const totalDistance = computed(() => {
  return actualDistance.value
})

const hasChanges = computed(() => {
  // Se não tem paradas originais mas tem paradas atuais, houve mudança
  if (originalStops.value.length === 0 && stops.value.length > 0) {
    return true
  }
  
  // Se a quantidade de paradas mudou, houve mudança
  if (originalStops.value.length !== stops.value.length) {
    return true
  }
  
  // Comparar cada parada
  return stops.value.some((stop, index) => {
    const original = originalStops.value[index]
    if (!original) return true
    
    return (
      stop.name !== original.name ||
      Math.abs(stop.lat - original.lat) > 0.000001 || // Pequena tolerância para float
      Math.abs(stop.lng - original.lng) > 0.000001 ||
      stop.order !== original.order
    )
  })
})

const formatDistance = (meters: number) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(2)}km`
}

// Buscar geometria da rota seguindo as ruas usando OSRM (Open Source Routing Machine)
const fetchRouteGeometry = async () => {
  if (stops.value.length < 2) {
    routeGeometry.value = []
    actualDistance.value = 0
    return
  }

  loadingRoute.value = true
  
  try {
    const allCoordinates: number[][] = []
    let totalDist = 0

    // Para cada par consecutivo de paradas, buscar rota
    for (let i = 0; i < stops.value.length - 1; i++) {
      const start = stops.value[i]
      const end = stops.value[i + 1]

      if (!start || !end) continue

      // Usar OSRM (Open Source Routing Machine) - serviço gratuito e rápido
      // Formato: lng,lat;lng,lat
      const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`

      const response = await fetch(url)
      
      if (!response.ok) {
        console.error('OSRM API error:', response.status)
        // Fallback para linha reta em caso de erro
        if (i === 0) {
          allCoordinates.push([start.lng, start.lat])
        }
        allCoordinates.push([end.lng, end.lat])
        continue
      }

      const data = await response.json()

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        
        // Adicionar distância do segmento (vem em metros)
        totalDist += route.distance || 0

        // Extrair geometria (GeoJSON format)
        if (route.geometry && route.geometry.coordinates) {
          const coordinates = route.geometry.coordinates

          // Adicionar coordenadas evitando duplicatas nos pontos de conexão
          if (i === 0) {
            allCoordinates.push(...coordinates)
          } else {
            // Pular primeira coordenada pois é igual à última do segmento anterior
            allCoordinates.push(...coordinates.slice(1))
          }
        } else {
          // Fallback: linha reta
          if (i === 0) {
            allCoordinates.push([start.lng, start.lat])
          }
          allCoordinates.push([end.lng, end.lat])
        }
      } else {
        // Sem rotas disponíveis - usar linha reta
        if (i === 0) {
          allCoordinates.push([start.lng, start.lat])
        }
        allCoordinates.push([end.lng, end.lat])
      }
    }

    routeGeometry.value = allCoordinates
    actualDistance.value = totalDist

  } catch (error) {
    console.error('Error fetching route geometry:', error)
    
    // Fallback para linha reta em caso de erro
    routeGeometry.value = stops.value.map(stop => [stop.lng, stop.lat])
    actualDistance.value = 0
    
    toast.add({
      title: 'Aviso',
      description: 'Não foi possível traçar rota pelas ruas. Usando linha reta.',
      color: 'warning',
    })
  } finally {
    loadingRoute.value = false
  }
}

// Haversine formula para calcular distância entre dois pontos (mantido para fallback)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3 // Raio da Terra em metros
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

const initMap = async () => {
  if (!mapContainer.value || !props.route) return

  maptilerSdk.config.apiKey = config.public.MAPTILER_API_KEY as string

  map = new maptilerSdk.Map({
    container: mapContainer.value,
    style: maptilerSdk.MapStyle.STREETS,
    center: [-51.9653, -29.4685], // Lajeado-RS default
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

    // Carregar paradas existentes se houver
    try {
      if (!props.route) return
      
      const data = await fetchRouteStops(props.route.id)
      if (data.stops && data.stops.length > 0) {
        const loadedStops = data.stops.map(stop => ({
          id: stop.id,
          name: stop.name,
          lat: stop.latitude,
          lng: stop.longitude,
          order: stop.order,
        }))
        
        stops.value = loadedStops
        // Salvar cópia dos dados originais para detectar mudanças
        originalStops.value = JSON.parse(JSON.stringify(loadedStops))
        
        // Se já tiver geoJson salvo, usar ele
        if (data.geoJson && data.geoJson.coordinates && data.geoJson.coordinates.length > 0) {
          routeGeometry.value = data.geoJson.coordinates
          // Calcular distância aproximada se não tiver
          actualDistance.value = 0
        } else {
          // Senão, buscar nova geometria
          await fetchRouteGeometry()
        }
        
        updateMap()
        fitBounds()
      }
    } catch (err) {
      console.error('Error loading existing stops:', err)
    }
  })

  // Adicionar parada ao clicar no mapa
  map.on('click', (e) => {
    const { lng, lat } = e.lngLat
    addStop(lat, lng)
  })
}

const addStop = async (lat: number, lng: number, name?: string) => {
  const order = stops.value.length
  const stopName = name || `Parada ${order + 1}`
  
  const newStop = {
    id: `temp-${Date.now()}-${order}`,
    name: stopName,
    lat,
    lng,
    order,
  }
  
  stops.value.push(newStop)
  updateMap()
  await fetchRouteGeometry()
  updateLine()
}

const removeStop = async (stopId: string) => {
  const index = stops.value.findIndex(s => s.id === stopId)
  if (index === -1) return
  
  stops.value.splice(index, 1)
  
  // Reordenar
  stops.value.forEach((stop, idx) => {
    stop.order = idx
  })
  
  updateMap()
  await fetchRouteGeometry()
  updateLine()
}

const editStopName = (stopId: string, newName: string) => {
  const stop = stops.value.find(s => s.id === stopId)
  if (stop) {
    stop.name = newName
    updateMap()
  }
}

const updateMap = () => {
  if (!map) return

  // Limpar marcadores antigos
  markers.forEach(marker => marker.remove())
  markers = []

  // Adicionar marcadores
  stops.value.forEach((stop, index) => {
    const el = document.createElement('div')
    el.className = 'custom-marker'
    el.style.cssText = `
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #3b82f6;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    `
    el.textContent = (index + 1).toString()

    const marker = new maptilerSdk.Marker({
      element: el,
      draggable: true,
    })
      .setLngLat([stop.lng, stop.lat])
      .addTo(map!)

    // Evento de arrastar
    marker.on('dragend', async () => {
      const lngLat = marker.getLngLat()
      stop.lat = lngLat.lat
      stop.lng = lngLat.lng
      // Recalcular rota após arrastar
      await fetchRouteGeometry()
      updateLine()
    })

    // Popup ao clicar
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      showStopPopup(stop, marker)
    })

    markers.push(marker)
  })

  updateLine()
}

const updateLine = () => {
  if (!map) return

  // Usar routeGeometry se disponível, senão usar coordenadas diretas dos stops
  const coordinates = routeGeometry.value.length > 0 
    ? routeGeometry.value 
    : stops.value.map(stop => [stop.lng, stop.lat])
  
  const source = map.getSource('route-line') as any
  if (source) {
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates,
      },
    })
  }
}

const showStopPopup = (stop: any, marker: maptilerSdk.Marker) => {
  if (popupInstance) {
    popupInstance.remove()
  }

  const popupContent = document.createElement('div')
  popupContent.className = 'stop-popup'
  popupContent.innerHTML = `
    <div style="padding: 12px; min-width: 200px;">
      <input 
        type="text" 
        value="${stop.name}" 
        id="stop-name-input"
        class="stop-name-input"
        style="width: 100%; padding: 8px 10px; margin-bottom: 10px; border: 1px solid rgb(228 228 231); border-radius: 0.375rem; font-size: 0.875rem; outline: none;"
      />
      <button 
        id="save-stop-name"
        class="popup-btn popup-btn-primary"
        style="width: 100%; padding: 8px 12px; margin-bottom: 6px; background: rgb(59 130 246); color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; font-weight: 500;"
      >
        Salvar Nome
      </button>
      <button 
        id="remove-stop"
        class="popup-btn popup-btn-danger"
        style="width: 100%; padding: 8px 12px; background: rgb(239 68 68); color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; font-weight: 500;"
      >
        Remover Parada
      </button>
    </div>
  `

  popupInstance = new maptilerSdk.Popup({ offset: 25 })
    .setLngLat([stop.lng, stop.lat])
    .setDOMContent(popupContent)
    .addTo(map!)

  // Event listeners
  setTimeout(() => {
    const saveBtn = document.getElementById('save-stop-name')
    const removeBtn = document.getElementById('remove-stop')
    const input = document.getElementById('stop-name-input') as HTMLInputElement

    if (saveBtn && input) {
      saveBtn.addEventListener('click', () => {
        editStopName(stop.id, input.value)
        popupInstance?.remove()
        popupInstance = null
      })
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        removeStop(stop.id)
        popupInstance?.remove()
        popupInstance = null
      })
    }
  }, 100)
}

const fitBounds = () => {
  if (!map || stops.value.length === 0) return

  const bounds = new maptilerSdk.LngLatBounds()
  stops.value.forEach(stop => {
    bounds.extend([stop.lng, stop.lat])
  })

  map.fitBounds(bounds, { padding: 100 })
}

const confirmClose = () => {
  showHeaderPopover.value = false
  showFooterPopover.value = false
  emit('close')
}

const handleSave = async () => {
  if (stops.value.length < 2) {
    toast.add({
      title: 'Erro',
      description: 'Adicione pelo menos 2 paradas',
      color: 'error',
    })
    return
  }

  saving.value = true

  try {
    // Usar geometria snapped se disponível, senão usar coordenadas diretas
    const coordinates = routeGeometry.value.length > 0 
      ? routeGeometry.value 
      : stops.value.map(stop => [stop.lng, stop.lat])
    
    const geoJson: GeoJSON.LineString = {
      type: 'LineString',
      coordinates,
    }

    const stopsInput: StopInput[] = stops.value.map(stop => ({
      name: stop.name,
      latitude: stop.lat,
      longitude: stop.lng,
      order: stop.order,
    }))

    await saveRouteStops(props.route!.id, {
      geoJson,
      stops: stopsInput,
    })

    toast.add({
      title: 'Sucesso',
      description: 'Rota salva com sucesso!',
      color: 'success',
    })

    emit('saved')
    emit('close')
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.message || 'Erro ao salvar rota',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

watch(() => props.isOpen, (newValue) => {
  if (newValue && !map) {
    setTimeout(() => {
      initMap()
    }, 100)
  } else if (!newValue && map) {
    // Limpar mapa ao fechar
    markers.forEach(marker => marker.remove())
    markers = []
    if (popupInstance) {
      popupInstance.remove()
      popupInstance = null
    }
    if (map) {
      map.remove()
      map = null
    }
    stops.value = []
    originalStops.value = []
    routeGeometry.value = []
    actualDistance.value = 0
  }
})

onUnmounted(() => {
  if (map) {
    markers.forEach(marker => marker.remove())
    if (popupInstance) {
      popupInstance.remove()
    }
    map.remove()
  }
})
</script>

<style scoped>
.custom-marker {
  transition: transform 0.2s;
}

.custom-marker:hover {
  transform: scale(1.1);
}

:deep(.maplibregl-popup-content) {
  padding: 0;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  background-color: white;
  border: 1px solid rgb(228 228 231);
}

:deep(.maplibregl-popup-close-button) {
  font-size: 20px;
  padding: 4px 8px;
  color: rgb(113 113 122);
}

:deep(.maplibregl-popup-close-button):hover {
  color: rgb(39 39 42);
}

.dark :deep(.maplibregl-popup-content) {
  background-color: rgb(39 39 42);
  color: rgb(250 250 250);
  border-color: rgb(63 63 70);
}

.dark :deep(.maplibregl-popup-close-button) {
  color: rgb(161 161 170);
}

.dark :deep(.maplibregl-popup-close-button):hover {
  color: rgb(250 250 250);
}

:deep(.maplibregl-popup-tip) {
  border-top-color: white;
}

.dark :deep(.maplibregl-popup-tip) {
  border-top-color: rgb(39 39 42);
}

:deep(.stop-name-input) {
  background-color: white;
  color: rgb(24 24 27);
}

.dark :deep(.stop-name-input) {
  background-color: rgb(24 24 27);
  color: rgb(250 250 250);
  border-color: rgb(63 63 70);
}

:deep(.popup-btn-primary):hover {
  background-color: rgb(37 99 235);
}

:deep(.popup-btn-danger):hover {
  background-color: rgb(220 38 38);
}
</style>
