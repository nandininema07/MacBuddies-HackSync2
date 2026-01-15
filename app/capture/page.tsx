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
import { 
  Camera, 
  Upload, 
  MapPin, 
  Loader2, 
  CheckCircle, 
  X, 
  ImageIcon, 
  AlertTriangle, 
  Search,
  Building2 
} from "lucide-react"
import type { User } from "@supabase/supabase-js"

// --- FIX 1: DISABLE STATIC PRERENDERING ---
// This prevents the build failure by skipping static generation for this page
export const dynamic = 'force-dynamic';

interface Location {
  latitude: number
  longitude: number
  address?: string
  city?: string
  state?: string
  pincode?: string
}

interface SearchResult {
  place_id: string | number
  display_name: string
  source: 'db' | 'api'
  ward?: string
  lat?: string
  lon?: string
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
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success', message: string, details?: string } | null>(null)

  const [location, setLocation] = useState<Location | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [locationSource, setLocationSource] = useState<"gps" | "image" | "manual">("gps")
  
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("other")
  const [severity, setSeverity] = useState("medium")

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
    getCurrentLocation()
  }, [])

  // --- SMART SEARCH (DB + NOMINATIM) ---
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setSearchResults([])

    try {
        const results: SearchResult[] = []

        // A. Search Supabase (Govt Projects) - Exact Match
        const { data: dbData } = await supabase
            .from('government_projects')
            .select('id, title, ward')
            .ilike('title', `%${searchQuery}%`)
            .limit(5)
        
        if (dbData) {
            dbData.forEach((item: any) => {
                results.push({
                    place_id: item.id,
                    display_name: item.title,
                    source: 'db',
                    ward: item.ward 
                })
            })
        }

        // B. Search OpenStreetMap (Free API) - General Match
        const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ", Mumbai")}&limit=5`
        const osmRes = await fetch(osmUrl)
        const osmData = await osmRes.json()

        if (osmData) {
            osmData.forEach((item: any) => {
                if (!results.find(r => r.display_name === item.display_name)) {
                    results.push({
                        place_id: item.place_id,
                        display_name: item.display_name,
                        lat: item.lat,
                        lon: item.lon,
                        source: 'api'
                    })
                }
            })
        }
        setSearchResults(results)
    } catch (e) {
        console.error("Search failed", e)
    } finally {
        setIsSearching(false)
    }
  }

  // --- SELECT & RESOLVE COORDINATES ---
  const selectResult = async (result: SearchResult) => {
      setSearchQuery(result.display_name)
      setSearchResults([]) 
      setIsLoadingLocation(true)

      let lat = result.lat ? parseFloat(result.lat) : 0
      let lon = result.lon ? parseFloat(result.lon) : 0

      // If DB result has no coords, we must find them
      if (result.source === 'db' && lat === 0) {
          try {
              // Strategy 1: Search Exact Name + Mumbai
              let attempt1 = await searchNominatim(result.display_name + ", Mumbai")
              
              if (attempt1) {
                  lat = parseFloat(attempt1.lat)
                  lon = parseFloat(attempt1.lon)
              } else {
                  // Strategy 2: Clean Name
                  const cleanName = result.display_name
                    .split('(')[0]
                    .split('from')[0]
                    .split('-')[0]
                    .trim()
                  
                  if (cleanName.length > 3) {
                      let attempt2 = await searchNominatim(cleanName + ", Mumbai")
                      if (attempt2) {
                          lat = parseFloat(attempt2.lat)
                          lon = parseFloat(attempt2.lon)
                      }
                  }
              }

              // Strategy 3: Ward Fallback
              if (lat === 0 && result.ward) {
                  let attempt3 = await searchNominatim(`Mumbai Ward ${result.ward}`)
                  if (attempt3) {
                      lat = parseFloat(attempt3.lat)
                      lon = parseFloat(attempt3.lon)
                      alert(`Specific road coordinates not found. Pin placed in Ward ${result.ward} center.`)
                  }
              }
          } catch (e) {
              console.error("Geo-resolution failed", e)
          }
      }

      if (lat !== 0 && lon !== 0) {
          await fetchLocationDetails(lat, lon, "manual")
          setTitle(result.display_name)
      } else {
          alert("Could not automatically locate this road. Please try searching for a nearby landmark or use GPS.")
          setIsLoadingLocation(false)
      }
  }

  // Helper
  const searchNominatim = async (query: string) => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
        const res = await fetch(url)
        const data = await res.json()
        return data && data.length > 0 ? data[0] : null
      } catch (e) { return null }
  }

  const fetchLocationDetails = async (lat: number, lon: number, source: "gps" | "image" | "manual") => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      )
      const data = await response.json()

      setLocation({
        latitude: lat,
        longitude: lon,
        address: data.display_name || "Unknown Location",
        city: data.address?.city || "Mumbai",
        state: data.address?.state,
        pincode: data.address?.postcode,
      })
      setLocationSource(source)
    } catch (error) {
      console.error("Error fetching address:", error)
      setLocation({ latitude: lat, longitude: lon, address: "Unknown Location" })
      setLocationSource(source)
    } finally {
      setIsLoadingLocation(false)
    }
  }

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

  const startCamera = async () => {
    setIsCapturing(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (error) { setIsCapturing(false) }
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
        if (blob) setImageFile(new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }))
      }, "image/jpeg", 0.8)
      stopCamera()
      getCurrentLocation()
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCapturing(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImageData(reader.result as string)
    reader.readAsDataURL(file)
    
    setIsLoadingLocation(true)
    try {
        // --- FIX 2: DYNAMIC IMPORT FOR EXIFR ---
        // Prevents "Couldn't load fs" error during build
        const exifr = (await import("exifr")).default
        
        const gps = await exifr.gps(file)
        if (gps && gps.latitude && gps.longitude) {
            await fetchLocationDetails(gps.latitude, gps.longitude, "image")
        } else {
            setIsLoadingLocation(false)
        }
    } catch (error) { setIsLoadingLocation(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!location || !imageFile) return

    setIsSubmitting(true)
    setFeedback(null)
    setStatusMessage("Uploading and Analyzing Evidence...")

    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('latitude', location.latitude.toString())
      formData.append('longitude', location.longitude.toString())
      formData.append('description', description)
      formData.append('title', title)

      const response = await fetch('/api/analyze-report', { method: 'POST', body: formData })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || "Analysis failed")

      const { verdict, reasoning } = result.verdict || {}
      
      if (verdict === "High Risk" || verdict === "Negligence" || verdict === "Suspicious") {
          setFeedback({
              type: 'error',
              message: `⚠️ Issue Detected: ${verdict}`,
              details: reasoning
          })
      } else {
          setFeedback({
              type: 'success',
              message: "✅ Verified Compliant",
              details: "Redirecting to dashboard..."
          })
      }

      setIsSuccess(true)
      const reportId = result.report_id || result.data?.[0]?.id

      setTimeout(() => {
        router.push(reportId ? `/dashboard?focus=${reportId}` : "/dashboard")
      }, 2000)

    } catch (error: any) {
      setFeedback({ type: 'error', message: "Submission Failed", details: error.message })
    } finally {
      setIsSubmitting(false)
      setStatusMessage("")
    }
  }

  const clearImage = () => { setImageData(null); setImageFile(null); setFeedback(null); }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-4 py-20 flex flex-col items-center justify-center">
          <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
          <h1 className="text-2xl font-bold text-center">Report Verified & Submitted!</h1>
          {feedback && (
             <div className={`mt-4 p-4 rounded-lg border max-w-md text-center ${
                 feedback.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
             }`}>
                 <p className="font-bold">{feedback.message}</p>
                 <p className="text-sm mt-1">{feedback.details}</p>
             </div>
          )}
          <p className="text-muted-foreground mt-6 animate-pulse">Redirecting to map...</p>
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

          {/* PHOTO CARD */}
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
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
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
                    <img src={imageData || "/placeholder.svg"} alt="Captured evidence" className="w-full rounded-lg" />
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={clearImage}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className={`flex items-center gap-2 text-sm p-2 rounded border
                    ${locationSource === 'image' ? 'text-green-600 bg-green-50 border-green-200' : 
                      locationSource === 'manual' ? 'text-blue-600 bg-blue-50 border-blue-200' :
                      'text-yellow-600 bg-yellow-50 border-yellow-200'}`}
                  >
                      {locationSource === 'image' && <><MapPin className="h-4 w-4" /> Location from Photo EXIF</>}
                      {locationSource === 'manual' && <><MapPin className="h-4 w-4" /> Location Manually Selected</>}
                      {locationSource === 'gps' && <><AlertTriangle className="h-4 w-4" /> Using Device GPS</>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* LOCATION CARD */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t.capture.location}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingLocation && (
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Acquiring location...
                </div>
              )}

              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Label htmlFor="address-search">Search Road (Govt Projects)</Label>
                    <div className="flex gap-2 mt-1.5">
                        <Input 
                            id="address-search"
                            placeholder="Enter road name (e.g. Patelwadi Road)" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Button 
                            variant="secondary" 
                            onClick={handleSearch}
                            disabled={isSearching || !searchQuery}
                        >
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </div>

                    {/* Autocomplete Dropdown */}
                    {searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 border rounded-md shadow-lg max-h-60 overflow-y-auto bg-white dark:bg-slate-950 dark:border-slate-800">
                            {searchResults.map((result) => (
                                <div 
                                    key={result.place_id}
                                    className="p-3 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0"
                                    onClick={() => selectResult(result)} 
                                >
                                    <div className="font-medium flex items-center gap-2 text-slate-800">
                                        {result.source === 'db' ? (
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-200 flex items-center gap-1">
                                                <Building2 className="h-3 w-3" /> OFFICIAL
                                            </span>
                                        ) : (
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                                                MAP
                                            </span>
                                        )}
                                        {result.display_name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {location && (
                  <div className="bg-muted/50 rounded-lg p-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Coordinates:</span> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </div>
                    {location.address && (
                      <div className="mt-1">
                        <span className="text-muted-foreground">Address:</span> {location.address}
                      </div>
                    )}
                  </div>
                )}
                
                {!location && !isLoadingLocation && (
                  <Button variant="outline" onClick={getCurrentLocation} className="gap-2 bg-transparent">
                    <MapPin className="h-4 w-4" />
                    Reset to Current Device Location
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* DETAILS FORM */}
          <Card>
            <CardHeader><CardTitle>Report Details</CardTitle></CardHeader>
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
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
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
                      <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t.severity.low}</SelectItem>
                        <SelectItem value="medium">{t.severity.medium}</SelectItem>
                        <SelectItem value="high">{t.severity.high}</SelectItem>
                        <SelectItem value="critical">{t.severity.critical}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {feedback && (
                    <div className={`p-3 rounded-md text-sm border ${
                        feedback.type === 'error' ? 'bg-red-50 text-red-900 border-red-200' : 'bg-green-50 text-green-900 border-green-200'
                    }`}>
                        <div className="font-bold flex items-center gap-2">
                            {feedback.type === 'error' ? <AlertTriangle className="h-4 w-4"/> : <CheckCircle className="h-4 w-4"/>}
                            {feedback.message}
                        </div>
                        <div className="mt-1 pl-6 opacity-90">{feedback.details}</div>
                    </div>
                )}

                <Button type="submit" className="w-full" disabled={!imageData || !location || !title || isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {statusMessage}</> : t.capture.submit}
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