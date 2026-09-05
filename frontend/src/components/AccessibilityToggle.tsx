import React from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { Type } from 'lucide-react';

export function AccessibilityToggle() {
  const { largeText, toggleLargeText } = useAccessibility();

  return (
    <button
      onClick={toggleLargeText}
      className="fixed bottom-6 right-6 z-50 bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white rounded-full p-4 shadow-lg transition-all duration-300 flex items-center justify-center"
      aria-label="Toggle Large Text"
      title="Toggle Large Text"
    >
      <Type className="w-6 h-6" />
      <span className="ml-1 font-bold text-lg">{largeText ? '-' : '+'}</span>
    </button>
  );
}
