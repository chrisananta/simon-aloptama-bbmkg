import React, { useState } from 'react';
import simonLogoImg from '../../../assets/images/simon_bmkg_logo_1785979248218.jpg';

interface SimonLogoProps {
  className?: string;
  imgClassName?: string;
  variant?: 'image' | 'text' | 'combined';
  height?: number | string;
  darkBg?: boolean;
}

export const SimonLogo: React.FC<SimonLogoProps> = ({
  className = '',
  imgClassName = '',
  variant = 'image',
  height = 44,
  darkBg = false,
}) => {
  const [imgError, setImgError] = useState(false);

  if (variant === 'text') {
    return (
      <div className={`flex flex-col text-left select-none shrink-0 ${className}`}>
        <span
          className={`font-heading font-black text-lg md:text-xl tracking-tight leading-tight ${
            darkBg ? 'text-white' : 'text-[#0F2D52]'
          }`}
        >
          SIMON BBMKG V
        </span>
        <span
          className={`text-[10px] md:text-[11px] font-medium leading-tight ${
            darkBg ? 'text-blue-200/90' : 'text-slate-500'
          }`}
        >
          Sistem Monitoring Aloptama
        </span>
      </div>
    );
  }

  const heightStyle = typeof height === 'number' ? `${height}px` : height;
  const numericHeight = typeof height === 'number' ? height : parseInt(String(height), 10) || 44;

  if (imgError) {
    // Vector SVG fallback logo (shield with radar waves & BMKG branding)
    return (
      <div className={`inline-flex items-center gap-2 select-none shrink-0 ${className}`}>
        <div
          className="rounded-lg bg-gradient-to-br from-[#0F2D52] to-[#0052CC] text-white flex items-center justify-center p-1.5 shadow-sm border border-blue-400/20"
          style={{ height: heightStyle, width: heightStyle }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-blue-100" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" className="fill-blue-900/40" />
            <circle cx="12" cy="11" r="3" stroke="#10B981" strokeWidth="2" />
            <path d="M12 5v2M12 15v2M5 11h2M17 11h2" />
          </svg>
        </div>
        <div className="flex flex-col text-left">
          <span className={`font-heading font-black text-sm sm:text-base leading-tight ${darkBg ? 'text-white' : 'text-[#0F2D52]'}`}>
            SIMON <span className="text-[#0052CC]">BBMKG V</span>
          </span>
          <span className={`text-[9px] font-semibold tracking-wider uppercase ${darkBg ? 'text-blue-200' : 'text-slate-500'}`}>
            Aloptama Monitor
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center shrink-0 ${className}`}>
      <img
        src={simonLogoImg}
        alt="SIMON BBMKG V - Sistem Monitoring Aloptama BBMKG Wilayah V"
        className={`w-auto h-full max-w-full object-contain rounded-lg border border-slate-200/60 shadow-2xs ${imgClassName}`}
        style={{ height: heightStyle }}
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

