"use client"

import { useEffect, useState, useMemo } from "react"
import L from "leaflet"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import "leaflet/dist/leaflet.css"

// --- 1. CONFIGURATION ---

const SEVERITY_COLORS = {
  low: "#22c55e",      // Green
  medium: "#eab308",   // Yellow
  high: "#f97316",     // Orange (Restored)
  critical: "#ef4444", // Red
  default: "#3b82f6"   // Blue
}

// --- 2. CUSTOM ICON LOGIC ---

// Single Marker Icon
const createMarkerIcon = (risk: string | undefined) => {
  const riskKey = risk?.toLowerCase() as keyof typeof SEVERITY_COLORS;
  const color = SEVERITY_COLORS[riskKey] || SEVERITY_COLORS.default;

  return L.divIcon({
    className: "custom-pin",
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  })
}

// Smart Cluster Icon (Restored Logic)
const createClusterCustomIcon = function (cluster: any) {
  const markers = cluster.getAllChildMarkers();
  
  // Logic: Scan all markers in this cluster to find the "Worst" severity
  let hasCritical = false;
  let hasHigh = false;
  let hasMedium = false;

  markers.forEach((marker: any) => {
    // We attach the risk_level to the marker options below
    const risk = marker.options.risk_level?.toLowerCase(); 
    if (risk === 'critical') hasCritical = true;
    else if (risk === 'high') hasHigh = true;
    else if (risk === 'medium') hasMedium = true;
  });

  // Determine Color based on priority
  let color = SEVERITY_COLORS.low; 
  if (hasCritical) color = SEVERITY_COLORS.critical;
  else if (hasHigh) color = SEVERITY_COLORS.high;
  else if (hasMedium) color = SEVERITY_COLORS.medium;

  // Determine Size based on count
  const count = cluster.getChildCount();
  let size = 30;
  if (count > 10) size = 40;
  if (count > 50) size = 50;

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        border: 3px solid rgba(255,255,255,0.5);
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
      ">
        ${count}
      </div>
    `,
    className: 'custom-cluster-icon',
    iconSize: L.point(size, size, true),
  });
}

// --- 3. MAP EVENTS HELPER ---
function MapEvents({ onViewChange }: { onViewChange: (bounds: any, zoom: number) => void }) {
  const map = useMapEvents({
    moveend: () => {
      onViewChange(map.getBounds(), map.getZoom())
    },
    load: () => {
      onViewChange(map.getBounds(), map.getZoom())
    }
  })
  
  // Trigger initial bounds check on mount
  useEffect(() => {
    if (map) {
      onViewChange(map.getBounds(), map.getZoom())
    }
  }, [map, onViewChange])

  return null
}

// --- 4. MAIN COMPONENT ---
import type { Report } from "@/lib/types"

interface LeafletMapProps {
  reports: Report[]
  onViewChange: (visibleReports: Report[], zoom: number) => void
}

export default function LeafletMap({ reports, onViewChange }: LeafletMapProps) {
  const defaultCenter: [number, number] = [20.5937, 78.9629] // India

  // Pre-filter reports
  const validReports = useMemo(() => {
    return reports.filter(r => r.latitude != null && r.longitude != null);
  }, [reports]);

  // Filter callback
  const handleMapChange = (bounds: any, zoom: number) => {
    const visible = validReports.filter(r => 
      bounds.contains([r.latitude, r.longitude])
    )
    onViewChange(visible, zoom)
  }

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={5} 
      className="h-full w-full z-0"
      maxZoom={18}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      {/* KEY PROP: Forces re-mount when report count changes heavily.
          CHUNKED LOADING: Disabled to fix "appendChild" error.
      */}
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
              icon={createMarkerIcon(report.risk_level)}
              // IMPORTANT: Pass risk_level as an option so the cluster function can read it
              // @ts-ignore
              risk_level={report.risk_level}
            >
              <Popup>
                <div className="p-1 min-w-[150px]">
                  <h3 className="font-bold text-sm mb-1">{report.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">{report.city || "Unknown City"}</p>
                  <div className="flex justify-between items-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full text-white"
                        style={{
                           backgroundColor: SEVERITY_COLORS[report.risk_level?.toLowerCase() as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.default
                        }}
                      >
                          {report.risk_level || 'Pending'}
                      </span>
                      <span className="text-xs font-bold text-blue-600">
                         {report.upvotes || 0} Votes
                      </span>
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