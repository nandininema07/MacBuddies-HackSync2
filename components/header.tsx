"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useI18n } from "@/lib/i18n/context"
import { createClient } from "@/lib/supabase/client"
// ADDED CheckCircle to imports
import { Menu, Globe, Shield, LogOut, User, Moon, Sun, Users, FileText, Fingerprint, CheckCircle } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export function Header() {
  const pathname = usePathname()
  const { language, setLanguage, t } = useI18n()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = "/" // Force reload to clear cache
  }

  const navLinks = [
    ...(!user ? [{ href: "/", label: t.nav.home }] : []),
    ...(user? [{ href: "/dashboard", label: t.nav.dashboard },
    { href: "/capture", label: t.nav.capture },
    { href: "/map", label: t.nav.map },
    { href: "/wards", label: "Wards" },
    { href: "/community", label: t.nav.community, icon: Users },
    { href: "/rti", label: t.rti.title, icon: FileText }] : [])
  ].filter(Boolean)

  // Helper to mask Aadhaar (Show only last 4 digits)
  const maskAadhaar = (num: string) => {
    if (!num) return "Not Verified";
    return `XXXX-XXXX-${num.slice(-4)}`;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold tracking-tight">INTEGRITY</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === link.href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage("en")}>
                <span className={language === "en" ? "font-bold" : ""}>English</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("hi")}>
                <span className={language === "hi" ? "font-bold" : ""}>हिंदी</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile / Auth Buttons */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full border border-border">
                  <User className="h-5 w-5" />
                  {/* Green Dot if Verified */}
                  {user.user_metadata?.aadhaar_number && (
                    <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background animate-pulse" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-base font-semibold leading-none">{user.user_metadata?.full_name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                
                {/* Aadhaar Details Card inside Dropdown */}
                <div className="mx-2 mb-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1.5">
                        <Fingerprint className="h-3.5 w-3.5" /> 
                        DigiLocker Verified
                    </div>
                    <div className="flex justify-between items-center bg-white dark:bg-background rounded px-2 py-1.5 border border-blue-100 dark:border-blue-800">
                        <span className="text-xs font-mono tracking-widest text-slate-600 dark:text-slate-300">
                            {maskAadhaar(user.user_metadata?.aadhaar_number)}
                        </span>
                        <CheckCircle className="h-3 w-3 text-green-600" />
                    </div>
                </div>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer font-medium">{t.nav.dashboard}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.nav.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/login">{t.nav.login}</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/sign-up">{t.nav.signup}</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <nav className="flex flex-col gap-4 mt-8">
                {user && (
                    <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="font-bold text-lg">{user.user_metadata?.full_name}</div>
                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                            <Fingerprint className="h-4 w-4 text-green-600" />
                            {maskAadhaar(user.user_metadata?.aadhaar_number)}
                        </div>
                    </div>
                )}
                
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`text-lg font-medium transition-colors hover:text-primary ${
                      pathname === link.href ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {!user && (
                  <>
                    <Link
                      href="/auth/login"
                      onClick={() => setIsOpen(false)}
                      className="text-lg font-medium text-muted-foreground hover:text-primary"
                    >
                      {t.nav.login}
                    </Link>
                    <Link
                      href="/auth/sign-up"
                      onClick={() => setIsOpen(false)}
                      className="text-lg font-medium text-muted-foreground hover:text-primary"
                    >
                      {t.nav.signup}
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}