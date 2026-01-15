"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CheckCircle, Loader2, ShieldCheck, Fingerprint } from "lucide-react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  
  // DigiLocker State
  const [aadhaar, setAadhaar] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Simulate DigiLocker Verification API
  const verifyAadhaar = async () => {
    // Basic format check
    if (aadhaar.length !== 12 || isNaN(Number(aadhaar))) {
        setError("Please enter a valid 12-digit Aadhaar number.")
        return
    }
    
    setError(null)
    setIsVerifying(true)

    // Simulate API delay (In real world, this calls DigiLocker API)
    setTimeout(() => {
        setIsVerifying(false)
        setIsVerified(true)
        setError(null)
    }, 2000)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isVerified) {
        setError("Identity verification via DigiLocker is required.")
        return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
            aadhaar_number: aadhaar, // Passing this to be caught by the DB Trigger
          },
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (error: any) {
      setError(error.message || "An error occurred during sign up")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card className="border-t-4 border-t-blue-600 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                Sign Up
                <ShieldCheck className="h-6 w-6 text-blue-600" />
              </CardTitle>
              <CardDescription>
                Create a verified account to participate in civic audits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-4">
                  
                  {/* Personal Details */}
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full Name (As per Aadhaar)</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  {/* DigiLocker Verification Section */}
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-sm">
                            <Fingerprint className="h-4 w-4" /> 
                            DigiLocker Verification
                        </div>
                        {isVerified && <span className="bg-green-600 text-white px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Verified</span>}
                    </div>
                    
                    <div className="flex gap-2">
                        <Input
                            id="aadhaar"
                            type="text"
                            placeholder="XXXX XXXX XXXX"
                            value={aadhaar}
                            onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                            disabled={isVerified}
                            className={`bg-white font-mono tracking-wide ${isVerified ? 'border-green-500 text-green-700' : ''}`}
                            maxLength={12}
                        />
                        {!isVerified && (
                            <Button 
                                type="button" 
                                onClick={verifyAadhaar} 
                                disabled={isVerifying || aadhaar.length !== 12}
                                className="bg-blue-600 hover:bg-blue-700 text-white w-24"
                            >
                                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                            </Button>
                        )}
                    </div>
                    <p className="text-[10px] text-blue-600/80 leading-tight">
                        * To prevent spam, we require Aadhaar verification via DigiLocker API simulation. Your ID is encrypted and stored securely.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="confirm-password">Confirm</Label>
                        <Input
                        id="confirm-password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive font-medium text-center">{error}</p>}
                  
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading || !isVerified}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                    {isLoading ? "Creating Account..." : "Create Verified Account"}
                  </Button>
                </div>
                
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary text-foreground font-medium">
                    Login
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}