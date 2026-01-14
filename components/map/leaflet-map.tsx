"use client"

import { useEffect, useState, useCallback } from "react"
import L from "leaflet"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import type { Report } from "@/lib/types"

// Fix Leaflet Icons
const iconScale = 1.2
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: "custom-pin",
    html: `
      <div style="background-color: ${color}; width: ${24 * iconScale}px; height: ${24 * iconScale}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>
    `,
    iconSize: [24 * iconScale, 24 * iconScale],
    iconAnchor: [12 * iconScale, 12 * iconScale],
  })
}

const getPinColor = (risk: string | undefined) => {
  switch (risk?.toLowerCase()) {
    case 'high': return '#ef4444';
    case 'medium': return '#eab308';
    case 'low': return '#22c55e';
    default: return '#3b82f6';
  }
}

interface LeafletMapProps {
  reports: Report[]
  onViewChange: (visibleReports: Report[], zoom: number) => void
}

// Helper component to handle map events
function MapEvents({ reports, onViewChange }: LeafletMapProps) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds()
      const zoom = map.getZoom()
      
      // Filter reports visible in current viewport
      const visible = reports.filter(r => 
        bounds.contains([r.latitude, r.longitude])
      )
      
      onViewChange(visible, zoom)
    },
    // Trigger once on load
    load: () => {
      onViewChange(reports, map.getZoom())
    }
  })
  
  // Trigger initial filter on mount
  useEffect(() => {
    map.fire('moveend');
  }, [map])

  return null
}

export default function LeafletMap({ reports, onViewChange }: LeafletMapProps) {
  const defaultCenter: [number, number] = [20.5937, 78.9629] // India

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={5} 
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      <MapEvents reports={reports} onViewChange={onViewChange} />

      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          icon={createCustomIcon(getPinColor(report.risk_level))}
        >
          <Popup>
            <div className="p-1">
              <h3 className="font-bold text-sm">{report.title}</h3>
              <p className="text-xs text-gray-500">{report.city}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}