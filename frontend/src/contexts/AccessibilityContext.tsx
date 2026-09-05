import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityContextType {
  largeText: boolean;
  toggleLargeText: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    // Load preference from local storage
    const stored = localStorage.getItem('large_text_pref');
    if (stored === 'true') {
      setLargeText(true);
      document.documentElement.classList.add('large-text');
    }
  }, []);

  const toggleLargeText = () => {
    setLargeText(prev => {
      const newVal = !prev;
      localStorage.setItem('large_text_pref', String(newVal));
      if (newVal) {
        document.documentElement.classList.add('large-text');
      } else {
        document.documentElement.classList.remove('large-text');
      }
      return newVal;
    });
  };

  return (
    <AccessibilityContext.Provider value={{ largeText, toggleLargeText }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
