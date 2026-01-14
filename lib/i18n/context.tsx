"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { translations, type Language } from "./translations"

type TranslationsType = typeof translations.en

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationsType
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== "undefined") {
      localStorage.setItem("integrity-lang", lang)
    }
  }, [])

  const t = translations[language]

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}
