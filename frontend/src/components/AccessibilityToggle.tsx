import React from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { Type, Contrast } from 'lucide-react';

export function AccessibilityToggle() {
  const { largeText, toggleLargeText, highContrast, toggleHighContrast } = useAccessibility();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <button
        onClick={toggleHighContrast}
        className={`bg-white border-2 rounded-full p-3 shadow-lg transition-all duration-300 flex items-center justify-center ${
          highContrast ? 'border-yellow-500 bg-yellow-500 text-black' : 'border-gray-400 text-gray-600 hover:bg-gray-100'
        }`}
        aria-label="Toggle High Contrast"
        title="Toggle High Contrast"
      >
        <Contrast className="w-5 h-5" />
      </button>
      <button
        onClick={toggleLargeText}
        className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white rounded-full p-3 shadow-lg transition-all duration-300 flex items-center justify-center"
        aria-label="Toggle Large Text"
        title="Toggle Large Text"
      >
        <Type className="w-5 h-5" />
        <span className="ml-1 font-bold text-sm">{largeText ? '-' : '+'}</span>
      </button>
    </div>
  );
}

