import React from 'react';
import { useNavigate } from 'react-router-dom';

export function TopAppBar({ 
  title, 
  subtitle = null, 
  showBack = false, 
  rightElement = null,
  theme = 'light' 
}) {
  const navigate = useNavigate();

  const isDark = theme === 'dark';
  
  return (
    <header className={`w-full sticky top-0 z-50 flex justify-between items-center px-4 h-16 transition-colors border-b ${
      isDark 
        ? 'bg-primary text-on-primary border-primary-container shadow-[0_4px_12px_rgba(26,60,110,0.1)]' 
        : 'bg-surface dark:bg-on-background text-on-surface border-outline-variant/30 shadow-[0_4px_12px_rgba(26,60,110,0.02)]'
    }`}>
      {/* Left Action / Back Button */}
      <div className="w-10 flex items-center justify-start">
        {showBack && (
          <button 
            onClick={() => navigate(-1)}
            className={`p-2 -ml-2 rounded-full active:scale-95 transition-transform ${
              isDark ? 'hover:bg-surface-container-high/20 text-on-primary' : 'hover:bg-surface-container-high text-primary dark:text-primary-fixed'
            }`}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
      </div>

      {/* Title & Subtitle */}
      <div className="flex flex-col items-center text-center">
        <h1 className={`font-headline-md text-headline-md font-bold ${
          isDark ? 'text-on-primary' : 'text-primary dark:text-primary-fixed'
        }`}>
          {title}
        </h1>
        {subtitle && (
          <span className="font-label-sm text-label-sm text-on-surface-variant opacity-80">
            {subtitle}
          </span>
        )}
      </div>

      {/* Right Action */}
      <div className="w-10 flex items-center justify-end">
        {rightElement ? rightElement : <div className="w-10"></div>}
      </div>
    </header>
  );
}

export default TopAppBar;
