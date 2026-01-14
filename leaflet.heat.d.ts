import type * as L from "leaflet"

declare module "leaflet" {
  function heatLayer(
    latlngs: [number, number, number][],
    options?: {
      radius?: number
      blur?: number
      maxZoom?: number
      max?: number
      minOpacity?: number
      gradient?: Record<number, string>
    },
  ): HeatLayer

  interface HeatLayer extends L.Layer {
    setLatLngs(latlngs: [number, number, number][]): this
    addLatLng(latlng: [number, number, number]): this
    setOptions(options: Record<string, unknown>): this
  }
}
