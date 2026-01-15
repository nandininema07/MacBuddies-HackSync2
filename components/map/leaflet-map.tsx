"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import L from "leaflet"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import "leaflet/dist/leaflet.css"
import type { Report } from "@/lib/types"

const SEVERITY_COLORS = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
  forecast: "#9333ea", // Purple for AI Forecast
  default: "#3b82f6"
}

// Updated to handle Forecast mode coloring
const createMarkerIcon = (severity: string | undefined, isForecast: boolean) => {
  const severityKey = (severity?.toLowerCase() || 'default') as keyof typeof SEVERITY_COLORS;
  
  // If in forecast mode, we use Purple. For extra polish, we use darker purple for higher scores.
  const color = isForecast ? SEVERITY_COLORS.forecast : (SEVERITY_COLORS[severityKey] || SEVERITY_COLORS.default);
  
  return L.divIcon({
    className: "custom-pin",
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px ${color}66; ${isForecast ? 'animation: pulse 2s infinite;' : ''}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  })
}

const createClusterCustomIcon = function (cluster: any) {
  const markers = cluster.getAllChildMarkers();
  const isForecast = markers[0]?.options?.isForecast; // Check if this is a forecast cluster
  
  const count = cluster.getChildCount();
  const color = isForecast ? SEVERITY_COLORS.forecast : SEVERITY_COLORS.default;
  let size = count > 50 ? 50 : count > 10 ? 40 : 30;
  
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid rgba(255,255,255,0.5); box-shadow: 0 4px 6px rgba(0,0,0,0.2);">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: L.point(size, size, true),
  });
}

function MapEvents({ onViewChange }: { onViewChange: (bounds: any, zoom: number) => void }) {
  const map = useMapEvents({
    moveend: () => onViewChange(map.getBounds(), map.getZoom()),
    load: () => onViewChange(map.getBounds(), map.getZoom())
  })
  
  useEffect(() => {
    if (map) onViewChange(map.getBounds(), map.getZoom())
  }, [map, onViewChange]) 

  return null
}

interface LeafletMapProps {
  reports: Report[]
  predictions?: any[] // Prop from Python backend
  isForecastMode: boolean // Toggle state from parent
  onViewChange: (visibleItems: any[], zoom: number) => void
}

export default function LeafletMap({ reports, predictions = [], isForecastMode, onViewChange }: LeafletMapProps) {
  const defaultCenter: [number, number] = [20.5937, 78.9629]

  // Decide which dataset to filter and display
  const activeData = useMemo(() => {
    const data = isForecastMode ? predictions : reports;
    return data.filter(r => r.latitude != null && r.longitude != null);
  }, [reports, predictions, isForecastMode]);

  const handleMapChange = useCallback((bounds: any, zoom: number) => {
    const visible = activeData.filter(r => 
      bounds.contains([r.latitude, r.longitude])
    )
    onViewChange(visible, zoom)
  }, [activeData, onViewChange])

  return (
    <>
      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      
      <MapContainer center={defaultCenter} zoom={5} className="h-full w-full z-0" maxZoom={18} scrollWheelZoom={true}>
        <TileLayer 
          attribution='&copy; OpenStreetMap' 
          url={isForecastMode 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Dark map for Forecast (looks more "Techy")
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          } 
        />
        
        <MarkerClusterGroup
          key={`cluster-${activeData.length}-${isForecastMode}`} 
          iconCreateFunction={createClusterCustomIcon}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
        >
          {activeData.map((item) => (
            <Marker
              key={item.id}
              position={[item.latitude, item.longitude]}
              icon={createMarkerIcon(isForecastMode ? item.prediction.label : item.severity, isForecastMode)}
              // @ts-ignore
              isForecast={isForecastMode}
              severity={isForecastMode ? item.prediction.label : item.severity} 
            >
              <Popup>
                <div className="p-1">
                  <h3 className="font-bold text-sm">
                    {isForecastMode ? `AI Forecast: ${item.title}` : item.title}
                  </h3>
                  <p className="text-xs text-gray-500">{item.city}</p>
                  <div className={`mt-1 text-xs font-bold ${isForecastMode ? 'text-purple-600' : 'text-blue-600'}`}>
                    {isForecastMode 
                      ? `Risk Score: ${item.prediction.score}%` 
                      : `${item.upvotes || 0} Votes`
                    }
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
        
        <MapEvents onViewChange={handleMapChange} />
      </MapContainer>
    </>
  )
}