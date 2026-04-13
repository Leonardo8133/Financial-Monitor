import { useState } from 'react';

export function Field({ label, children, className = "", helpText, title }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <label className={`block group relative ${className}`}>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        {helpText && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-0 ml-auto relative">
            <button
              type="button"
              className="w-4 h-4 rounded-full bg-slate-400 text-white text-xs flex items-center justify-center hover:bg-slate-500 transition-colors duration-0"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              style={{ transitionDelay: '0ms' }}
            >
              ?
            </button>
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
                {helpText}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
              </div>
            )}
          </div>
        )}
      </div>
      {children}
    </label>
  );
}
