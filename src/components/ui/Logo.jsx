import React from 'react';

/**
 * NetQ Check Logo Component
 * Concept: Minimal geometric box/package + checkmark + subtle "Q" loop in Deep Teal & Blue
 *
 * @param {Object} props
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md']
 * @param {boolean} [props.showWordmark=true]
 * @param {boolean} [props.showTagline=false]
 * @param {boolean} [props.light=false] - For dark backgrounds (sidebar/footer)
 * @param {string} [props.className='']
 */
export default function Logo({
  size = 'md',
  showWordmark = true,
  showTagline = false,
  light = false,
  className = '',
}) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Icon Graphic */}
      <div
        className={`${iconSizes[size]} flex-shrink-0 flex items-center justify-center rounded-xl transition-transform hover:scale-105`}
        aria-label="NetQ Check Logo"
      >
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Outer Package Container */}
          <rect
            x="3"
            y="7"
            width="34"
            height="27"
            rx="6"
            fill={light ? '#0F766E' : '#0F766E'}
          />
          {/* Geometric Top Box Fold Accent */}
          <path
            d="M3 14H37"
            stroke="white"
            strokeOpacity="0.2"
            strokeWidth="1.5"
          />
          {/* Subtle "Q" Search/Verification Loop Accent */}
          <circle
            cx="20"
            cy="20.5"
            r="8.5"
            stroke="#2563EB"
            strokeWidth="2.5"
            fill="none"
          />
          {/* Central Verification Checkmark */}
          <path
            d="M14.5 20.5L18.5 24.5L25.5 16.5"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Wordmark & Tagline */}
      {showWordmark && (
        <div className="leading-none flex flex-col justify-center">
          <div className={`font-bold tracking-tight ${textSizes[size]} ${light ? 'text-white' : 'text-navy'}`}>
            Net<span className="text-primary font-extrabold">Q</span> Check
          </div>
          {showTagline && (
            <span className={`text-[10px] font-medium tracking-wide mt-0.5 ${light ? 'text-white/60' : 'text-gray-500'}`}>
              Scan. Verify. Comply.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
