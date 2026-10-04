import React from 'react';
import { Wrench, PlusCircle, Play, History, CheckCircle2, ArrowRight } from 'lucide-react';

interface HeroHomeProps {
  onStartRepair: () => void;
  onCaptureJugaad: () => void;
  onTryDemo: () => void;
  totalMemoriesCount: number;
}

export const HeroHome: React.FC<HeroHomeProps> = ({
  onStartRepair,
  onCaptureJugaad,
  onTryDemo,
  totalMemoriesCount,
}) => {
  return (
    <div className="py-8 sm:py-12 max-w-4xl mx-auto px-4 text-center">
      {/* Workshop Memory Counter Banner */}
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#E4E1D9] rounded-lg text-xs font-semibold text-[#667085] mb-5 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-[#15803D]" />
        <span>Demo Appliance Workshop</span>
        <span aria-hidden="true">·</span>
        <span className="text-[#172033] font-bold">{totalMemoriesCount} Repairs Stored</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-3xl sm:text-5xl font-black text-[#172033] tracking-tight mb-3">
        Workshop ki apni memory.
      </h1>

      {/* Supporting Text in simple Indian workshop tone */}
      <p className="text-base sm:text-lg text-[#667085] max-w-xl mx-auto leading-relaxed mb-8">
        Apne purane repairs ko save karein aur agli baar wahi jugaad turant paayein.
      </p>

      {/* Primary Tool Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-10">
        <button
          onClick={onStartRepair}
          className="w-full sm:w-auto flex-1 px-6 py-4 bg-[#172033] hover:bg-[#25324B] text-white font-extrabold text-base rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
        >
          <Wrench className="w-5 h-5 text-[#F59E0B]" />
          <span>Repair shuru karein</span>
          <ArrowRight className="w-4 h-4 text-[#8A94A6]" />
        </button>

        <button
          onClick={onCaptureJugaad}
          className="w-full sm:w-auto px-5 py-4 bg-[#F59E0B] hover:bg-[#D97706] text-[#172033] font-bold text-sm rounded-xl border border-[#D97706]/30 shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>＋ Jugaad save karein</span>
        </button>
      </div>

      {/* 1-Click Hero Demo Box (Grounded & Tool-like) */}
      <div className="bg-white border border-[#E4E1D9] rounded-2xl p-5 text-left max-w-2xl mx-auto shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D97706] mb-1">
              <span>Quick Test Scenario</span>
            </div>
            <h3 className="text-base font-bold text-[#172033]">
              Samsung Diamond Drum (4C Water Intake Issue)
            </h3>
            <p className="text-xs text-[#667085] mt-0.5">
              1-click test: device photo load hogi, purane workshop repairs check honge aur Step 1 ka instruction milega.
            </p>
          </div>

          <button
            onClick={onTryDemo}
            className="w-full sm:w-auto shrink-0 px-4 py-2.5 bg-[#F7F6F2] hover:bg-[#EBE8DF] border border-[#DCD7CB] text-[#172033] font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current text-[#D97706]" />
            <span>Try Demo karein</span>
          </button>
        </div>
      </div>

      {/* Trust & Provenance Bar */}
      <div className="mt-8 text-xs text-[#8A94A6] flex items-center justify-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
        <span>Grounded in actual workshop repair logs · No universal truth claims</span>
      </div>
    </div>
  );
};
