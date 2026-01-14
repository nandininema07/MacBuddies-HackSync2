"use client"

import { useEffect, useState } from "react"
import L from "leaflet"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import "leaflet/dist/leaflet.css"
// Note: MarkerCluster styles are handled via creating custom divIcons below
import type { Report } from "@/lib/types"

// --- ICONS ---

// 1. Single Marker Icon (Color coded)
const createMarkerIcon = (color: string) => {
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
  })
}

// 2. Cluster Icon (Smart Coloring)
const createClusterCustomIcon = function (cluster: any) {
  // Get all markers in this cluster
  const markers = cluster.getAllChildMarkers();
  
  // Logic: Find the worst severity in this cluster
  let hasCritical = false;
  let hasHigh = false;
  let hasMedium = false;

  // We stored the risk level in the marker options (see Marker below)
  markers.forEach((marker: any) => {
     const risk = marker.options.risk_level; 
     if (risk === 'critical' || risk === 'High') hasCritical = true;
     else if (risk === 'high' || risk === 'Medium') hasHigh = true;
     else if (risk === 'medium' || risk === 'Low') hasMedium = true;
  });

  // Determine Color
  let color = '#22c55e'; // Default Green (Low)
  if (hasCritical) color = '#ef4444'; // Red
  else if (hasHigh) color = '#f97316'; // Orange
  else if (hasMedium) color = '#eab308'; // Yellow

  // Determine Size (Bigger cluster = Bigger circle)
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

function MapEvents({ reports, onViewChange }: LeafletMapProps) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds()
      const zoom = map.getZoom()
      const visible = reports.filter(r => bounds.contains([r.latitude, r.longitude]))
      onViewChange(visible, zoom)
    },
    load: () => {
      onViewChange(reports, map.getZoom())
    }
  })
  
  useEffect(() => {
    map.fire('moveend');
  }, [map])

  return null
}

export default function LeafletMap({ reports, onViewChange }: LeafletMapProps) {
  const defaultCenter: [number, number] = [20.5937, 78.9629]

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={5} 
      className="h-full w-full"
      maxZoom={18} // Allow zooming close enough to break clusters
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      <MapEvents reports={reports} onViewChange={onViewChange} />

      {/* CLUSTER GROUP */}
      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterCustomIcon}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false} // Cleaner look
      >
        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
            icon={createMarkerIcon(getPinColor(report.risk_level))}
            // We pass this prop so the cluster function can read it!
            // @ts-ignore - Leaflet allows custom options but TS complains
            risk_level={report.risk_level} 
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
    </MapContainer>
  )
}