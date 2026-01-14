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
import { Camera, Upload, MapPin, Loader2, CheckCircle, X, ImageIcon } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface Location {
  latitude: number
  longitude: number
  address?: string
  city?: string
  state?: string
  pincode?: string
}

interface AIAnalysis {
  category: string
  severity: string
  issues_detected: string[]
  quality_score: number
  recommendations: string[]
}

export default function CapturePage() {
  const { t } = useI18n()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [user, setUser] = useState<User | null>(null)
  const [imageData, setImageData] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [location, setLocation] = useState<Location | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [severity, setSeverity] = useState("")
  const [manualAddress, setManualAddress] = useState("")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  // Get user location
  const getLocation = useCallback(async () => {
    setIsLoadingLocation(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      })

      const { latitude, longitude } = position.coords

      // Reverse geocoding using Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      )
      const data = await response.json()

      setLocation({
        latitude,
        longitude,
        address: data.display_name,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        pincode: data.address?.postcode,
      })
    } catch (error) {
      console.error("Error getting location:", error)
    } finally {
      setIsLoadingLocation(false)
    }
  }, [])

  // Start camera
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

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(video, 0, 0)
      const data = canvas.toDataURL("image/jpeg", 0.8)
      setImageData(data)
      stopCamera()
      analyzeImage(data)
      getLocation()
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCapturing(false)
  }

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const data = reader.result as string
        setImageData(data)
        analyzeImage(data)
        getLocation()
      }
      reader.readAsDataURL(file)
    }
  }

  // Mock AI analysis (simulates backend AI classification)
  const analyzeImage = async (imageData: string) => {
    setIsAnalyzing(true)

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Mock AI response - in production this would call your FastAPI backend
    const categories = ["road", "bridge", "building", "drainage", "electrical", "water"]
    const severities = ["low", "medium", "high", "critical"]
    const randomCategory = categories[Math.floor(Math.random() * categories.length)]
    const randomSeverity = severities[Math.floor(Math.random() * severities.length)]

    const mockAnalysis: AIAnalysis = {
      category: randomCategory,
      severity: randomSeverity,
      issues_detected: ["Surface damage detected", "Potential safety hazard", "Infrastructure degradation visible"],
      quality_score: Math.random() * 0.3 + 0.7,
      recommendations: [
        "Immediate inspection recommended",
        "Document with additional photos",
        "Report to local authorities",
      ],
    }

    setAiAnalysis(mockAnalysis)
    setCategory(mockAnalysis.category)
    setSeverity(mockAnalysis.severity)
    setIsAnalyzing(false)
  }

  // Submit report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!location || !imageData) return

    setIsSubmitting(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("reports").insert({
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
        image_url: imageData.substring(0, 100), // In production, upload to storage
        ai_classification: aiAnalysis,
        ai_confidence: aiAnalysis?.quality_score || null,
      })

      if (error) throw error

      setIsSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (error) {
      console.error("Error submitting report:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Clear image
  const clearImage = () => {
    setImageData(null)
    setAiAnalysis(null)
    setCategory("")
    setSeverity("")
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-4 py-20 flex flex-col items-center justify-center">
          <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
          <h1 className="text-2xl font-bold text-center">{t.capture.success}</h1>
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
                    <Button onClick={capturePhoto} className="flex-1">
                      Capture
                    </Button>
                    <Button variant="outline" onClick={stopCamera}>
                      Cancel
                    </Button>
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
                      crossOrigin="anonymous"
                    />
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={clearImage}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {isAnalyzing && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.capture.analyzing}
                    </div>
                  )}

                  {aiAnalysis && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <h4 className="font-semibold">AI Analysis Results</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Category:</span>{" "}
                          <span className="font-medium capitalize">{aiAnalysis.category}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Severity:</span>{" "}
                          <span className="font-medium capitalize">{aiAnalysis.severity}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Confidence:</span>{" "}
                          <span className="font-medium">{(aiAnalysis.quality_score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Issues detected:</span>
                        <ul className="list-disc list-inside mt-1">
                          {aiAnalysis.issues_detected.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
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
                  Getting location...
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
                <Button variant="outline" onClick={getLocation} className="gap-2 bg-transparent">
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
                    placeholder="Provide additional details about the infrastructure issue..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={category} onValueChange={setCategory} required>
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
                    <Label htmlFor="severity">Severity *</Label>
                    <Select value={severity} onValueChange={setSeverity} required>
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
                  disabled={!imageData || !location || !title || !category || !severity || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
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

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
