"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type FontOption =
  | "system"
  | "IBM Plex Sans"
  | "Nunito Sans"
  | "Inter"
  | "Roboto"
  | "Open Sans"
  | "PT Sans";

export type TextScale = 1 | 1.125 | 1.25 | 1.375 | 1.5;

export type LanguageCode = "UZ" | "RU" | "EN" | "QQ";

interface AccessibilityContextType {
  grayscale: boolean;
  setGrayscale: (v: boolean) => void;
  textScale: TextScale;
  setTextScale: (scale: TextScale) => void;
  font: FontOption;
  setFont: (font: FontOption) => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  resetAll: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

const STORAGE_KEY = "cfm_accessibility_settings";
const LANG_STORAGE_KEY = "cfm_selected_language";
const THEME_STORAGE_KEY = "cfm_theme";

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [grayscale, setGrayscale] = useState(false);
  const [textScale, setTextScale] = useState<TextScale>(1);
  const [font, setFont] = useState<FontOption>("system");
  const [language, setLanguageState] = useState<LanguageCode>("UZ");
  const [darkMode, setDarkMode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "dark") {
        setDarkMode(true);
        document.documentElement.classList.add("dark");
      } else if (savedTheme === "light") {
        setDarkMode(false);
        document.documentElement.classList.remove("dark");
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.grayscale === "boolean") setGrayscale(parsed.grayscale);
        if (typeof parsed.textScale === "number") setTextScale(parsed.textScale as TextScale);
        if (typeof parsed.font === "string") setFont(parsed.font as FontOption);
      }

      const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
      if (savedLang && ["UZ", "RU", "EN", "QQ"].includes(savedLang)) {
        setLanguageState(savedLang as LanguageCode);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        try {
          localStorage.setItem(THEME_STORAGE_KEY, "dark");
        } catch {}
      } else {
        document.documentElement.classList.remove("dark");
        try {
          localStorage.setItem(THEME_STORAGE_KEY, "light");
        } catch {}
      }
      return next;
    });
  };

  // Apply styles to document
  useEffect(() => {
    const root = document.documentElement;

    // 1. Grayscale
    if (grayscale) {
      root.classList.add("grayscale-mode");
      document.body.style.filter = "grayscale(100%)";
    } else {
      root.classList.remove("grayscale-mode");
      document.body.style.filter = "";
    }

    // 2. Text scale
    if (textScale !== 1) {
      root.style.fontSize = `${textScale * 100}%`;
    } else {
      root.style.fontSize = "";
    }

    // 3. Font
    if (font && font !== "system") {
      root.style.fontFamily = `"${font}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    } else {
      root.style.fontFamily = "";
    }

    // Save to localStorage
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ grayscale, textScale, font })
      );
    } catch {
      // ignore
    }
  }, [grayscale, textScale, font]);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  };

  const resetAll = () => {
    setGrayscale(false);
    setTextScale(1);
    setFont("system");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <AccessibilityContext.Provider
      value={{
        grayscale,
        setGrayscale,
        textScale,
        setTextScale,
        font,
        setFont,
        language,
        setLanguage,
        darkMode,
        toggleDarkMode,
        resetAll,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return ctx;
}
