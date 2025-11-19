import { ref } from 'vue'
import type { RouteWithStops, SaveRouteStopsInput } from '../../types/stop'

export const useRouteStops = () => {
  const routeWithStops = ref<RouteWithStops | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchRouteStops = async (routeId: string) => {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<RouteWithStops>(`/api/routes/${routeId}/stops`)
      routeWithStops.value = data
      return data
    } catch (err: any) {
      const errorMessage = err?.data?.statusMessage || err?.message || 'Erro ao carregar pontos de parada'
      error.value = errorMessage
      console.error('Error fetching route stops:', err)
      throw new Error(errorMessage)
    } finally {
      loading.value = false
    }
  }

  const saveRouteStops = async (routeId: string, input: SaveRouteStopsInput) => {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<RouteWithStops>(`/api/routes/${routeId}/stops`, {
        method: 'POST',
        body: input,
      })
      routeWithStops.value = data
      return data
    } catch (err: any) {
      const errorMessage = err?.data?.statusMessage || err?.message || 'Erro ao salvar pontos de parada'
      error.value = errorMessage
      console.error('Error saving route stops:', err)
      throw new Error(errorMessage)
    } finally {
      loading.value = false
    }
  }

  return {
    routeWithStops,
    loading,
    error,
    fetchRouteStops,
    saveRouteStops,
  }
}
