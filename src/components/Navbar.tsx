import React from 'react';
import { Wrench, BookOpen, PlusCircle, Building2, Play, Code2 } from 'lucide-react';
import { LogoMark } from './LogoMark';

interface NavbarProps {
  activeTab: 'repair' | 'memory' | 'capture' | 'workshop';
  setActiveTab: (tab: 'repair' | 'memory' | 'capture' | 'workshop') => void;
  onRunDemo: () => void;
  devModeOpen: boolean;
  setDevModeOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onRunDemo,
  devModeOpen,
  setDevModeOpen,
}) => {
  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#F7F6F2] border-b border-[#E4E1D9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Wordmark */}
          <div
            onClick={() => setActiveTab('repair')}
            className="flex items-center gap-3 cursor-pointer select-none shrink-0"
          >
            {/* Workshop Tool + Memory Log Symbol */}
            <LogoMark size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-[#172033]">
                  Jugaad Memory
                </span>
                <span className="text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] border border-[#FDE68A] px-1.5 py-0.2 rounded">
                  WORKSHOP
                </span>
              </div>
              <p className="text-[11px] text-[#667085] font-medium hidden sm:block">
                Workshop technicians ke liye private memory layer
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile, mobile uses bottom bar) */}
          <nav className="hidden md:flex items-center p-1 bg-[#EBE8DF] rounded-xl border border-[#DCD7CB]">
            <button
              onClick={() => setActiveTab('repair')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'repair'
                  ? 'bg-white text-[#172033] shadow-xs'
                  : 'text-[#475467] hover:text-[#172033]'
              }`}
            >
              <Wrench className="w-4 h-4 text-[#D97706]" />
              <span>Repair</span>
            </button>

            <button
              onClick={() => setActiveTab('memory')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'memory'
                  ? 'bg-white text-[#172033] shadow-xs'
                  : 'text-[#475467] hover:text-[#172033]'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#475467]" />
              <span>Memory</span>
            </button>

            <button
              onClick={() => setActiveTab('capture')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'capture'
                  ? 'bg-white text-[#172033] shadow-xs'
                  : 'text-[#475467] hover:text-[#172033]'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-[#D97706]" />
              <span>+ Jugaad</span>
            </button>

            <button
              onClick={() => setActiveTab('workshop')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'workshop'
                  ? 'bg-white text-[#172033] shadow-xs'
                  : 'text-[#475467] hover:text-[#172033]'
              }`}
            >
              <Building2 className="w-4 h-4 text-[#475467]" />
              <span>Workshop</span>
            </button>
          </nav>

          {/* Right Controls: Try Demo & Dev Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRunDemo}
              title="Load Samsung 4C washing machine demo repair scenario"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#172033] font-bold text-xs rounded-lg border border-[#D97706]/30 shadow-xs transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Try Demo</span>
            </button>

            {/* Dev Mode toggle button */}
            <button
              onClick={() => setDevModeOpen(!devModeOpen)}
              title="Toggle Developer Diagnostics"
              className={`p-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                devModeOpen
                  ? 'bg-[#172033] text-[#F59E0B] border-[#172033]'
                  : 'bg-white text-[#667085] border-[#E4E1D9] hover:text-[#172033]'
              }`}
            >
              <Code2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Bottom Navigation (Essential for one-handed phone use in workshop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#E4E1D9] px-2 py-1 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('repair')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            activeTab === 'repair' ? 'text-[#D97706]' : 'text-[#667085]'
          }`}
        >
          <Wrench className="w-5 h-5 mb-0.5" />
          <span>Repair</span>
        </button>

        <button
          onClick={() => setActiveTab('memory')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            activeTab === 'memory' ? 'text-[#D97706]' : 'text-[#667085]'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span>Memory</span>
        </button>

        <button
          onClick={() => setActiveTab('capture')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            activeTab === 'capture' ? 'text-[#D97706]' : 'text-[#667085]'
          }`}
        >
          <PlusCircle className="w-5 h-5 mb-0.5" />
          <span>+ Jugaad</span>
        </button>

        <button
          onClick={() => setActiveTab('workshop')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            activeTab === 'workshop' ? 'text-[#D97706]' : 'text-[#667085]'
          }`}
        >
          <Building2 className="w-5 h-5 mb-0.5" />
          <span>Workshop</span>
        </button>
      </nav>
    </>
  );
};
