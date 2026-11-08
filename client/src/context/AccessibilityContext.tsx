import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserPreferences } from '../types';
import { speakText, stopSpeaking } from '../utils/speech';

interface Announcement {
  id: number;
  text: string;
  priority: 'polite' | 'assertive';
}

interface AccessibilityContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  announcement: Announcement | null;
  announce: (text: string, priority?: 'polite' | 'assertive') => void;
  speak: (text: string) => void;
  stopSpeech: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

const STORAGE_KEY = 'payable_guardian_accessibility_prefs_v1';

const DEFAULT_PREFERENCES: UserPreferences = {
  speechEnabled: true,
  speechRate: 1.0,
  textScale: 'normal',
  highContrast: false,
  reducedMotion: false,
  preferredInput: 'voice',
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch {
      // LocalStorage access may fail or be restricted
    }
    return DEFAULT_PREFERENCES;
  });

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Apply DOM attributes for CSS variable overrides
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-high-contrast', String(preferences.highContrast));
    root.setAttribute('data-text-scale', preferences.textScale);
    root.setAttribute('data-reduced-motion', String(preferences.reducedMotion));

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Safe ignore
    }
  }, [preferences]);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  }, []);

  const announce = useCallback((text: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement({
      id: Date.now(),
      text,
      priority,
    });
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!preferences.speechEnabled) return;
      speakText(text, { rate: preferences.speechRate });
    },
    [preferences.speechEnabled, preferences.speechRate]
  );

  const stopSpeech = useCallback(() => {
    stopSpeaking();
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        preferences,
        updatePreferences,
        announcement,
        announce,
        speak,
        stopSpeech,
        isSettingsOpen,
        setIsSettingsOpen,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
