"use client"
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

export interface ThemeColors {
  primary: string; // The main bold color (e.g. Pink #e91e63)
  secondary: string; // The vibrant contrast (e.g. Lime Green #a3e635)
  accent: string; // Used for text or borders
  background: string; 
  
  // Advanced granular elements
  headerBg: string;
  headerText: string;
  cardBg: string;
  cardBorder: string;
  cardText: string;
  
  // Gradients
  gradientStart: string;
  gradientEnd: string;
  
  // Effects
  glowEnabled: boolean;
  glassmorphism: boolean;
}

const defaultTheme: ThemeColors = {
  primary: '#e91e63', // Ramadan Pink
  secondary: '#a3e635', // Ramadan Lime Green
  accent: '#ffffff', // White
  background: 'transparent',
  
  headerBg: '#1e293b',
  headerText: '#ffffff',
  cardBg: '#0f172a',
  cardBorder: '#334155',
  cardText: '#e2e8f0',
  
  gradientStart: '#10b981',
  gradientEnd: '#06b6d4',
  
  glowEnabled: false,
  glassmorphism: true,
};

interface ThemeContextType {
  theme: ThemeColors;
  updateTheme: (newTheme: Partial<ThemeColors>) => void;
  isDataOnly: boolean;
  isTransparent: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  updateTheme: () => {},
  isDataOnly: false,
  isTransparent: false,
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeColors>(defaultTheme);
  const [isDataOnly, setIsDataOnly] = useState(false);
  const [isTransparent, setIsTransparent] = useState(false);

  // Load from URL or localStorage on mount
  useEffect(() => {
    // Check URL first
    const params = new URLSearchParams(window.location.search);
    const urlPrimary = params.get('primary');
    const urlSecondary = params.get('secondary');
    const urlAccent = params.get('accent');
    
    const dataOnlyParam = params.get('dataOnly') === 'true';
    const transparentParam = params.get('transparent') === 'true' || dataOnlyParam;
    setIsDataOnly(dataOnlyParam);
    setIsTransparent(transparentParam);

    let initialTheme = { ...defaultTheme };

    // Fallback to localStorage
    const saved = localStorage.getItem('strymx_overlay_theme');
    if (saved) {
      try {
        initialTheme = { ...initialTheme, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Failed to parse saved theme", e);
      }
    }

    // URL overrides everything on initial load
    if (urlPrimary || urlSecondary || urlAccent) {
      console.log('ThemeContext: Overriding with URL parameters', { urlPrimary, urlSecondary, urlAccent });
      initialTheme = {
        ...initialTheme,
        primary: urlPrimary ? (urlPrimary.startsWith('#') ? urlPrimary : `#${urlPrimary}`) : initialTheme.primary,
        secondary: urlSecondary ? (urlSecondary.startsWith('#') ? urlSecondary : `#${urlSecondary}`) : initialTheme.secondary,
        accent: urlAccent ? (urlAccent.startsWith('#') ? urlAccent : `#${urlAccent}`) : initialTheme.accent,
      };
    }

    setTheme(initialTheme);
  }, []);

  const updateTheme = (newTheme: Partial<ThemeColors>) => {
    setTheme(prev => {
      const updated = { ...prev, ...newTheme };
      localStorage.setItem('strymx_overlay_theme', JSON.stringify(updated));
      return updated;
    });
  };

  // Inject CSS Variables to the root document whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-secondary', theme.secondary);
    root.style.setProperty('--theme-accent', theme.accent);
    root.style.setProperty('--theme-background', theme.background);
    
    // Advanced Elements
    root.style.setProperty('--theme-header-bg', theme.headerBg);
    root.style.setProperty('--theme-header-text', theme.headerText);
    root.style.setProperty('--theme-card-bg', theme.cardBg);
    root.style.setProperty('--theme-card-border', theme.cardBorder);
    root.style.setProperty('--theme-card-text', theme.cardText);
    
    // Gradients
    root.style.setProperty('--theme-gradient-start', theme.gradientStart);
    root.style.setProperty('--theme-gradient-end', theme.gradientEnd);
    
    // Effects
    root.style.setProperty('--theme-glow-opacity', theme.glowEnabled ? '1' : '0');
    root.style.setProperty('--theme-glass-blur', theme.glassmorphism ? '12px' : '0px');
  }, [theme]);

  // Listen to storage events to sync multiple tabs (e.g. Dashboard changing settings updates the OBS overlay tab)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'strymx_overlay_theme' && e.newValue) {
        setTheme(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Listen to postMessage for live theme updates from parent (e.g. Studio iframe preview)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'strymx_theme_update' && e.data.theme) {
        setTheme(prev => {
          const updated = { ...prev, ...e.data.theme };
          localStorage.setItem('strymx_overlay_theme', JSON.stringify(updated));
          return updated;
        });
      }
      // Handle combined batch update from studio
      if (e.data?.type === 'strymx_batch_update' && e.data.theme) {
        setTheme(prev => {
          const updated = { ...prev, ...e.data.theme };
          localStorage.setItem('strymx_overlay_theme', JSON.stringify(updated));
          return updated;
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, isDataOnly, isTransparent }}>
      {children}
    </ThemeContext.Provider>
  );
}
