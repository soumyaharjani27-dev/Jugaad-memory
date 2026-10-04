import React from 'react';
import { VisualTarget } from '../types';
import { AlertCircle, Eye, Wrench } from 'lucide-react';

interface VisualOverlayProps {
  imageUrl: string;
  visualTarget?: VisualTarget | null;
  provenanceNotice?: string;
  altText?: string;
  onContinueWithoutHighlight?: () => void;
}

export const VisualOverlay: React.FC<VisualOverlayProps> = ({
  imageUrl,
  visualTarget,
  provenanceNotice,
  altText = 'Appliance visual component',
  onContinueWithoutHighlight,
}) => {
  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-[#1E2430] border border-[#3E4756] text-left">
      {/* Base Component Image / Diagram */}
      <img
        src={imageUrl}
        alt={altText}
        className="w-full h-auto max-h-[340px] sm:max-h-[380px] object-contain mx-auto block"
      />

      {/* Confident Visual Target: Solid Workshop Highlight (No neon, no sparkles) */}
      {visualTarget ? (
        <>
          <div
            className="absolute pointer-events-none transition-all duration-300"
            style={{
              left: `${visualTarget.x}%`,
              top: `${visualTarget.y}%`,
              width: `${visualTarget.width}%`,
              height: `${visualTarget.height}%`,
            }}
          >
            {/* Solid industrial bounding box */}
            <div className="w-full h-full border-2 border-[#F59E0B] bg-[#F59E0B]/10 rounded-md">
              {/* Corner brackets for mechanical schematic feel */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#F59E0B]" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#F59E0B]" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#F59E0B]" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#F59E0B]" />
            </div>

            {/* Direct Workshop Tag */}
            <div className="absolute -top-7 left-0 whitespace-nowrap bg-[#F59E0B] text-[#172033] text-[11px] font-extrabold tracking-wider px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
              <Wrench className="w-3 h-3 text-[#172033]" />
              <span>पहिले यह चेक करें (Check First)</span>
            </div>

            {/* Component label pin */}
            <div className="absolute -bottom-6 left-0 whitespace-nowrap bg-[#172033] text-[#FDE68A] border border-[#F59E0B]/40 text-[10px] font-medium px-2 py-0.5 rounded">
              {visualTarget.label}
            </div>
          </div>

          {/* Bottom Quiet Annotation */}
          <div className="absolute bottom-2 left-2 right-2 bg-[#172033]/90 border border-[#3E4756] text-[#F3F4F6] px-3 py-2 rounded-lg text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <span>
                {provenanceNotice || `वर्कशॉप इतिहास: पहले ${visualTarget.label} की जांच करें।`}
              </span>
            </div>
            <span className="text-[10px] text-[#F59E0B] font-mono shrink-0 ml-2">CONFIRMED AREA</span>
          </div>
        </>
      ) : (
        /* Honest Fallback Banner when visual target cannot be identified */
        <div className="absolute bottom-2 left-2 right-2 bg-[#172033]/95 border border-[#3E4756] text-[#F3F4F6] px-3 py-2.5 rounded-lg text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <span>
              Relevant repair mila hai, lekin photo mein exact part confidently identify nahi ho raha.
            </span>
          </div>
          {onContinueWithoutHighlight && (
            <button
              onClick={onContinueWithoutHighlight}
              className="px-2.5 py-1 bg-[#25324B] hover:bg-[#344465] text-white rounded text-[11px] font-bold shrink-0 cursor-pointer"
            >
              आगे बढ़ें (Continue)
            </button>
          )}
        </div>
      )}
    </div>
  );
};
