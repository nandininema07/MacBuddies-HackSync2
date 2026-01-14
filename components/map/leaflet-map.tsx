"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"
import "leaflet.markercluster"
import "leaflet.heat"
import type { Report, PredictiveRisk } from "@/lib/types"

interface LeafletMapProps {
  reports: Report[]
  viewMode: "markers" | "heatmap" | "forecast"
  onSelectReport: (report: Report) => void
  predictions?: PredictiveRisk[]
  onSelectPrediction?: (prediction: PredictiveRisk) => void
}

const severityColors = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
}

const riskColors = {
  SAFE: "#22c55e",
  MODERATE: "#a855f7", // Purple for moderate
  CRITICAL: "#dc2626",
}

export default function LeafletMap({
  reports,
  viewMode,
  onSelectReport,
  predictions = [],
  onSelectPrediction,
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.MarkerClusterGroup | null>(null)
  const heatLayerRef = useRef<L.HeatLayer | null>(null)
  const predictionMarkersRef = useRef<L.LayerGroup | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Initialize map centered on India
    mapRef.current = L.map(containerRef.current).setView([20.5937, 78.9629], 5)

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current)

    // Initialize marker cluster group
    markersRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const childCount = cluster.getChildCount()
        let size = "small"
        if (childCount >= 10) size = "medium"
        if (childCount >= 50) size = "large"

        return L.divIcon({
          html: `<div><span>${childCount}</span></div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(40, 40),
        })
      },
    })

    predictionMarkersRef.current = L.layerGroup()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update markers/heatmap when reports or viewMode changes
  useEffect(() => {
    if (!mapRef.current) return

    // Clear existing layers
    if (markersRef.current) {
      markersRef.current.clearLayers()
      mapRef.current.removeLayer(markersRef.current)
    }
    if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current)
    }
    if (predictionMarkersRef.current) {
      predictionMarkersRef.current.clearLayers()
      mapRef.current.removeLayer(predictionMarkersRef.current)
    }

    if (viewMode === "forecast") {
      // Add purple heatmap for predictions
      const heatData: [number, number, number][] = predictions.map((pred) => {
        const intensity =
          pred.prediction.risk_label === "CRITICAL" ? 1 : pred.prediction.risk_label === "MODERATE" ? 0.6 : 0.2
        return [pred.location.lat, pred.location.lng, intensity]
      })

      if (heatData.length > 0) {
        heatLayerRef.current = L.heatLayer(heatData, {
          radius: 35,
          blur: 20,
          maxZoom: 10,
          // Purple gradient for AI predictions
          gradient: {
            0.2: "#22c55e", // Safe - green
            0.4: "#7c3aed", // Moderate - purple
            0.6: "#a855f7", // Higher moderate - lighter purple
            0.8: "#dc2626", // Critical - red
            1.0: "#991b1b", // Highest - dark red
          },
        })
        heatLayerRef.current.addTo(mapRef.current)
      }

      // Add prediction markers
      predictions.forEach((pred) => {
        const color = riskColors[pred.prediction.risk_label]
        const size =
          pred.prediction.risk_label === "CRITICAL" ? 32 : pred.prediction.risk_label === "MODERATE" ? 28 : 24

        const icon = L.divIcon({
          html: `
            <div style="
              background: linear-gradient(135deg, ${color}, ${color}dd);
              width: ${size}px;
              height: ${size}px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 20px ${color}66;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: bold;
              color: white;
            ">
              ${pred.prediction.predicted_risk}
            </div>
          `,
          className: "prediction-marker",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })

        const marker = L.marker([pred.location.lat, pred.location.lng], { icon })
        marker.on("click", () => onSelectPrediction?.(pred))

        // Add popup with prediction info
        const riskLabel =
          pred.prediction.risk_label === "CRITICAL"
            ? "CRITICAL RISK"
            : pred.prediction.risk_label === "MODERATE"
              ? "MODERATE RISK"
              : "SAFE"

        marker.bindPopup(`
          <div style="min-width: 200px; padding: 4px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 16px;">🤖</span>
              <strong>AI FORECAST</strong>
            </div>
            <strong style="font-size: 14px;">${pred.project_name}</strong>
            <div style="margin-top: 8px; padding: 8px; background: ${color}22; border-radius: 4px; border-left: 3px solid ${color};">
              <div style="color: ${color}; font-weight: bold; font-size: 12px;">
                ⚠️ ${riskLabel}
              </div>
              <div style="font-size: 20px; font-weight: bold; margin: 4px 0;">
                ${pred.prediction.predicted_risk}% Risk
              </div>
              <div style="font-size: 11px; color: #666; line-height: 1.4;">
                ${pred.prediction.forecast_reason}
              </div>
            </div>
          </div>
        `)

        predictionMarkersRef.current?.addLayer(marker)
      })

      if (predictionMarkersRef.current) {
        mapRef.current.addLayer(predictionMarkersRef.current)
      }

      // Fit bounds to predictions
      if (predictions.length > 0) {
        const bounds = L.latLngBounds(predictions.map((p) => [p.location.lat, p.location.lng]))
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
      }
    } else if (viewMode === "markers") {
      // Add markers
      reports.forEach((report) => {
        const color = severityColors[report.severity]
        const icon = L.divIcon({
          html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          className: "custom-marker",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })

        const marker = L.marker([report.latitude, report.longitude], { icon })
        marker.on("click", () => onSelectReport(report))

        // Add popup with basic info
        marker.bindPopup(`
          <div style="min-width: 150px;">
            <strong>${report.title}</strong>
            <br><small>${report.city || "Unknown location"}</small>
            <br><span style="color: ${color}; font-weight: bold;">${report.severity.toUpperCase()}</span>
          </div>
        `)

        markersRef.current?.addLayer(marker)
      })

      if (markersRef.current) {
        mapRef.current.addLayer(markersRef.current)
      }

      // Fit bounds if we have reports
      if (reports.length > 0) {
        const bounds = L.latLngBounds(reports.map((r) => [r.latitude, r.longitude]))
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
      }
    } else {
      // Add heatmap
      const heatData: [number, number, number][] = reports.map((report) => {
        const intensity =
          report.severity === "critical"
            ? 1
            : report.severity === "high"
              ? 0.7
              : report.severity === "medium"
                ? 0.4
                : 0.2
        return [report.latitude, report.longitude, intensity]
      })

      heatLayerRef.current = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        gradient: {
          0.2: "#22c55e",
          0.4: "#eab308",
          0.6: "#f97316",
          0.8: "#ef4444",
          1.0: "#dc2626",
        },
      })

      heatLayerRef.current.addTo(mapRef.current)

      // Fit bounds if we have reports
      if (reports.length > 0) {
        const bounds = L.latLngBounds(reports.map((r) => [r.latitude, r.longitude]))
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
      }
    }
  }, [reports, viewMode, onSelectReport, predictions, onSelectPrediction])

  return (
    <>
      <style jsx global>{`
        .marker-cluster {
          background-color: rgba(59, 130, 246, 0.6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .marker-cluster div {
          background-color: rgba(59, 130, 246, 0.9);
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .marker-cluster span {
          color: white;
          font-weight: bold;
          font-size: 12px;
        }
        .marker-cluster-small {
          background-color: rgba(34, 197, 94, 0.6);
        }
        .marker-cluster-small div {
          background-color: rgba(34, 197, 94, 0.9);
        }
        .marker-cluster-medium {
          background-color: rgba(234, 179, 8, 0.6);
        }
        .marker-cluster-medium div {
          background-color: rgba(234, 179, 8, 0.9);
        }
        .marker-cluster-large {
          background-color: rgba(239, 68, 68, 0.6);
        }
        .marker-cluster-large div {
          background-color: rgba(239, 68, 68, 0.9);
        }
        .custom-marker {
          background: transparent;
          border: none;
        }
        .prediction-marker {
          background: transparent;
          border: none;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
      `}</style>
      <div ref={containerRef} className="h-[calc(100vh-16rem)] w-full min-h-[400px]" />
    </>
  )
}
