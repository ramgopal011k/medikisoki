import React from 'react';

export const MediKioskLogo: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MediKiosk Logo"
      role="img"
    >
      {/* Background Circle */}
      <circle cx="50" cy="50" r="48" fill="#F5F0E8" stroke="#1B5E4A" strokeWidth="4" />
      
      {/* Cross (Health) */}
      <path 
        d="M35 50 H65 M50 35 V65" 
        stroke="#1B5E4A" 
        strokeWidth="12" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Terracotta Accent */}
      <circle cx="50" cy="50" r="8" fill="#C96F4A" />
      
      {/* Kiosk / Tech Element */}
      <rect x="30" y="70" width="40" height="6" rx="3" fill="#1B5E4A" />
      <rect x="45" y="76" width="10" height="6" fill="#1B5E4A" />
    </svg>
  );
};
