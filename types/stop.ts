export interface Stop {
  id: string
  name: string
  latitude: number
  longitude: number
  order: number
  routeId: string
  createdAt: string
  updatedAt: string
}

export interface StopInput {
  name: string
  latitude: number
  longitude: number
  order: number
}

export interface RouteWithStops {
  id: string
  code: string | null
  origin: string
  destination: string
  state: string
  city: string
  geoJson: GeoJSON.LineString | null
  isActive: boolean
  stops: Stop[]
  createdAt: string
  updatedAt: string
}

export interface SaveRouteStopsInput {
  geoJson: GeoJSON.LineString
  stops: StopInput[]
}
