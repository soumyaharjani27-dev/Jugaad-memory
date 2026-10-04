import React from 'react';

interface LogoMarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LogoMark: React.FC<LogoMarkProps> = ({ size = 'md', className = '' }) => {
  const containerSize =
    size === 'sm' ? 'w-7 h-7 rounded-lg' : size === 'lg' ? 'w-12 h-12 rounded-2xl' : 'w-10 h-10 rounded-xl';
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <div
      className={`${containerSize} bg-[#F59E0B] text-[#172033] flex items-center justify-center shadow-xs border border-[#D97706]/20 select-none shrink-0 ${className}`}
      title="Jugaad Memory"
    >
      <svg
        className={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle memory/archive card cue with folded corner */}
        <path
          d="M4 3.5h7.5L15.5 7.5V19a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 19V5A1.5 1.5 0 0 1 4 3.5z"
          fill="#FFFBEB"
          fillOpacity="0.45"
          stroke="#172033"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11.5 3.5V7.5H15.5"
          stroke="#172033"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Workshop wrench silhouette */}
        <path
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
          fill="#172033"
          stroke="#172033"
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
