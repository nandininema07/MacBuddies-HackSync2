"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useI18n } from "@/lib/i18n/context"
import { createClient } from "@/lib/supabase/client"
import { Camera, Upload, MapPin, Loader2, CheckCircle, X, ImageIcon, AlertTriangle } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { triggerAiAudit } from "@/lib/api"
import exifr from "exifr" // <--- NEW LIBRARY

interface Location {
  latitude: number
  longitude: number
  address?: string
  city?: string
  state?: string
  pincode?: string
}

export default function CapturePage() {
  const { t } = useI18n()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [imageData, setImageData] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")

  const [location, setLocation] = useState<Location | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [locationSource, setLocationSource] = useState<"gps" | "image" | "manual">("gps")

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("other")
  const [severity, setSeverity] = useState("medium")
  const [manualAddress, setManualAddress] = useState("")

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
    // Initial location fetch on mount (Device GPS)
    getCurrentLocation()
  }, [])

  // --- HELPER: Reverse Geocoding ---
  const fetchLocationDetails = async (lat: number, lon: number, source: "gps" | "image") => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      )
      const data = await response.json()

      setLocation({
        latitude: lat,
        longitude: lon,
        address: data.display_name,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        pincode: data.address?.postcode,
      })
      setLocationSource(source)
    } catch (error) {
      console.error("Error fetching address:", error)
      setLocation({ latitude: lat, longitude: lon })
      setLocationSource(source)
    } finally {
      setIsLoadingLocation(false)
    }
  }

  // --- HELPER: Get Current Device Location ---
  const getCurrentLocation = useCallback(async () => {
    setIsLoadingLocation(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      })
      await fetchLocationDetails(position.coords.latitude, position.coords.longitude, "gps")
    } catch (error) {
      console.error("Error getting device location:", error)
      setIsLoadingLocation(false)
    }
  }, [])

  // 1. Camera Logic
  const startCamera = async () => {
    setIsCapturing(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      setIsCapturing(false)
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(video, 0, 0)
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
      setImageData(dataUrl)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" })
          setImageFile(file)
        }
      }, "image/jpeg", 0.8)

      stopCamera()
      
      // For CAMERA captures, we trust the device location at that moment
      getCurrentLocation()
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCapturing(false)
  }

  // 2. File Upload Logic (USING EXIFR)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setImageData(reader.result as string)
    }
    reader.readAsDataURL(file)

    setIsLoadingLocation(true)
    
    try {
        // exifr.gps() returns { latitude, longitude } or null if not found
        // It handles the complex math (DMS to Decimal) automatically.
        const gps = await exifr.gps(file)

        if (gps && gps.latitude && gps.longitude) {
            console.log("📍 EXIF GPS Found:", gps)
            // Use the extracted coordinates
            await fetchLocationDetails(gps.latitude, gps.longitude, "image")
        } else {
            console.warn("⚠️ No GPS found in image.")
            setIsLoadingLocation(false)
            alert("This image does not have location data inside it. Using your current location instead.")
            // We do NOT overwrite location here, we keep the previous "device" location
        }
    } catch (error) {
        console.error("Error extracting EXIF:", error)
        setIsLoadingLocation(false)
    }
  }

  // 3. Submit Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!location || !imageFile) return

    setIsSubmitting(true)
    setStatusMessage("Uploading evidence...")

    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(fileName, imageFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('evidence')
        .getPublicUrl(fileName)

      setStatusMessage("Saving report...")
      const { data: report, error: insertError } = await supabase.from("reports").insert({
        user_id: user?.id || null,
        title,
        description,
        category,
        severity,
        latitude: location.latitude,
        longitude: location.longitude,
        address: manualAddress || location.address,
        city: location.city,
        state: location.state,
        pincode: location.pincode,
        image_url: publicUrl,
        status: 'pending'
      })
      .select()
      .single()

      if (insertError) throw insertError

      setStatusMessage("AI is analyzing evidence...")
      await triggerAiAudit(report.id)

      setIsSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)

    } catch (error: any) {
      console.error("Error submitting report:", error)
      alert(`Error: ${error.message || "Failed to submit report"}`)
    } finally {
      setIsSubmitting(false)
      setStatusMessage("")
    }
  }

  const clearImage = () => {
    setImageData(null)
    setImageFile(null)
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-4 py-20 flex flex-col items-center justify-center">
          <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
          <h1 className="text-2xl font-bold text-center">Report Verified & Submitted!</h1>
          <p className="text-muted-foreground mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight mb-6">{t.capture.title}</h1>

          {/* Image Capture Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Photo Evidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!imageData && !isCapturing && (
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button onClick={startCamera} className="flex-1 gap-2">
                    <Camera className="h-5 w-5" />
                    {t.capture.takePhoto}
                  </Button>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 gap-2">
                    <Upload className="h-5 w-5" />
                    {t.capture.uploadPhoto}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {isCapturing && (
                <div className="space-y-4">
                  <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg bg-black" />
                  <div className="flex gap-2">
                    <Button onClick={capturePhoto} className="flex-1">Capture</Button>
                    <Button variant="outline" onClick={stopCamera}>Cancel</Button>
                  </div>
                </div>
              )}

              {imageData && (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={imageData || "/placeholder.svg"}
                      alt="Captured evidence"
                      className="w-full rounded-lg"
                    />
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={clearImage}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Location Source Indicator */}
                  {locationSource === "image" && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200">
                      <MapPin className="h-4 w-4" />
                      Using exact location from image GPS
                    </div>
                  )}
                  {locationSource === "gps" && imageData && (
                     <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                       <AlertTriangle className="h-4 w-4" />
                       Image has no GPS. Using your current location.
                     </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t.capture.location}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingLocation && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Acquiring location...
                </div>
              )}

              {location && (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Coordinates:</span> {location.latitude.toFixed(6)},{" "}
                      {location.longitude.toFixed(6)}
                    </div>
                    {location.address && (
                      <div className="mt-1">
                        <span className="text-muted-foreground">Address:</span> {location.address}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="manual-address">Override Address (optional)</Label>
                    <Input
                      id="manual-address"
                      placeholder="Enter a more specific address"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {!location && !isLoadingLocation && (
                <Button variant="outline" onClick={getCurrentLocation} className="gap-2 bg-transparent">
                  <MapPin className="h-4 w-4" />
                  Get Current Location
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Report Details Form */}
          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief description of the issue"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">{t.capture.description}</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide additional details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category (User Estimate)</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="road">{t.categories.road}</SelectItem>
                        <SelectItem value="bridge">{t.categories.bridge}</SelectItem>
                        <SelectItem value="building">{t.categories.building}</SelectItem>
                        <SelectItem value="drainage">{t.categories.drainage}</SelectItem>
                        <SelectItem value="electrical">{t.categories.electrical}</SelectItem>
                        <SelectItem value="water">{t.categories.water}</SelectItem>
                        <SelectItem value="other">{t.categories.other}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="severity">Severity (User Estimate)</Label>
                    <Select value={severity} onValueChange={setSeverity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t.severity.low}</SelectItem>
                        <SelectItem value="medium">{t.severity.medium}</SelectItem>
                        <SelectItem value="high">{t.severity.high}</SelectItem>
                        <SelectItem value="critical">{t.severity.critical}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!imageData || !location || !title || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {statusMessage}
                    </>
                  ) : (
                    t.capture.submit
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}