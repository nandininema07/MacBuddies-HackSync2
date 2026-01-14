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
  default: "#3b82f6"
}

// 1. Fixed: Directly use the severity string
const createMarkerIcon = (severity: string | undefined) => {
  const severityKey = (severity?.toLowerCase() || 'default') as keyof typeof SEVERITY_COLORS;
  const color = SEVERITY_COLORS[severityKey] || SEVERITY_COLORS.default;
  
  return L.divIcon({
    className: "custom-pin",
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  })
}

const createClusterCustomIcon = function (cluster: any) {
  const markers = cluster.getAllChildMarkers();
  let hasCritical = false, hasHigh = false, hasMedium = false;
  
  markers.forEach((marker: any) => {
    // 2. Fixed: Read 'severity' instead of 'risk_level'
    const s = marker.options.severity?.toLowerCase(); 
    if (s === 'critical') hasCritical = true;
    else if (s === 'high') hasHigh = true;
    else if (s === 'medium') hasMedium = true;
  });

  let color = SEVERITY_COLORS.low; 
  if (hasCritical) color = SEVERITY_COLORS.critical;
  else if (hasHigh) color = SEVERITY_COLORS.high;
  else if (hasMedium) color = SEVERITY_COLORS.medium;
  
  const count = cluster.getChildCount();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]) 

  return null
}

interface LeafletMapProps {
  reports: Report[]
  onViewChange: (visibleReports: Report[], zoom: number) => void
}

export default function LeafletMap({ reports, onViewChange }: LeafletMapProps) {
  const defaultCenter: [number, number] = [20.5937, 78.9629]

  const validReports = useMemo(() => {
    return reports.filter(r => r.latitude != null && r.longitude != null);
  }, [reports]);

  const handleMapChange = useCallback((bounds: any, zoom: number) => {
    const visible = validReports.filter(r => 
      bounds.contains([r.latitude, r.longitude])
    )
    onViewChange(visible, zoom)
  }, [validReports, onViewChange])

  return (
    <MapContainer center={defaultCenter} zoom={5} className="h-full w-full z-0" maxZoom={18} scrollWheelZoom={true}>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
      
      <MarkerClusterGroup
        key={`cluster-${validReports.length}`} 
        iconCreateFunction={createClusterCustomIcon}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
        chunkedLoading={false} 
      >
        {validReports.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
            // 3. Fixed: Removed getPinColor, used report.severity
            icon={createMarkerIcon(report.severity)}
            // @ts-ignore - Passing prop for cluster function to read
            severity={report.severity} 
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-sm">{report.title}</h3>
                <p className="text-xs text-gray-500">{report.city}</p>
                <div className="mt-1 text-xs font-bold text-blue-600">
                  {report.upvotes || 0} Votes
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      
      <MapEvents onViewChange={handleMapChange} />
    </MapContainer>
  )
}