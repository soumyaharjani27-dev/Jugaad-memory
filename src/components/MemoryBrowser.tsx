import React, { useState, useMemo, useEffect } from 'react';
import { RepairMemory } from '../types';
import { memoryStore } from '../services/memoryStore';
import { MemoryCard } from './MemoryCard';
import { MemoryDetailModal } from './MemoryDetailModal';
import { Search, Filter, BookOpen, RotateCcw, X, ShieldCheck } from 'lucide-react';

interface MemoryBrowserProps {
  onStartRepairWithMemory?: (memory: RepairMemory) => void;
}

export const MemoryBrowser: React.FC<MemoryBrowserProps> = ({
  onStartRepairWithMemory,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [selectedErrorCode, setSelectedErrorCode] = useState<string>('All');
  const [selectedSourceType, setSelectedSourceType] = useState<'all' | 'real' | 'demo'>('all');
  const [selectedMemory, setSelectedMemory] = useState<RepairMemory | null>(null);
  const [memoriesVersion, setMemoriesVersion] = useState<number>(0);

  // Subscribe to changes in memoryStore
  useEffect(() => {
    const unsub = memoryStore.subscribe(() => {
      setMemoriesVersion(v => v + 1);
    });
    return unsub;
  }, []);

  // Available brands and error codes
  const brands = ['All', 'Samsung', 'Whirlpool', 'LG', 'IFB', 'Bosch'];
  const errorCodes = ['All', '4C', 'F06', 'OE', 'E18', 'UE', 'PE', 'dE', 'F05'];

  // Search results
  const results = useMemo(() => {
    return memoryStore.search(searchQuery, {
      brand: selectedBrand,
      errorCode: selectedErrorCode !== 'All' ? selectedErrorCode : undefined,
      sourceType: selectedSourceType,
    });
  }, [searchQuery, selectedBrand, selectedErrorCode, selectedSourceType, memoriesVersion]);

  const realCount = useMemo(() => memoryStore.getRealMemories().length, [memoriesVersion]);
  const demoCount = useMemo(() => memoryStore.getDemoMemories().length, [memoriesVersion]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 text-left space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">
          Purane Repairs Dekho
        </h1>
        <p className="text-sm text-[#667085] mt-1">
          Workshop ke purane confirmed fixes aur technician memory khojein.
        </p>
      </div>

      {/* Prominent Search Bar */}
      <div className="bg-white border border-[#E4E1D9] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Purana repair khojein... (e.g. Samsung 4C, iPhone battery, Dell jack, Whirlpool motor)"
            className="w-full pl-11 pr-10 py-3 bg-[#F7F6F2] border border-[#E4E1D9] rounded-xl text-base font-semibold text-[#172033] focus:bg-white focus:outline-none focus:border-[#172033]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#172033] p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Example Searches */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#667085]">
          <span className="font-bold text-[#172033]">Try:</span>
          <button
            onClick={() => setSearchQuery('Samsung 4C')}
            className="hover:underline text-[#D97706] font-semibold cursor-pointer"
          >
            "Samsung 4C"
          </button>
          <span>·</span>
          <button
            onClick={() => setSearchQuery('iPhone battery')}
            className="hover:underline text-[#D97706] font-semibold cursor-pointer"
          >
            "iPhone battery"
          </button>
          <span>·</span>
          <button
            onClick={() => setSearchQuery('Whirlpool motor issue')}
            className="hover:underline text-[#D97706] font-semibold cursor-pointer"
          >
            "Whirlpool motor issue"
          </button>
          <span>·</span>
          <button
            onClick={() => setSearchQuery('LG drain problem')}
            className="hover:underline text-[#D97706] font-semibold cursor-pointer"
          >
            "LG drain problem"
          </button>
        </div>

        {/* Source Type & Filters */}
        <div className="pt-2 border-t border-[#E4E1D9] space-y-2.5">
          {/* Source Type Filter: Real vs Demo */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-xs font-bold text-[#667085] mr-1">Source:</span>
            <button
              onClick={() => setSelectedSourceType('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-colors cursor-pointer ${
                selectedSourceType === 'all'
                  ? 'bg-[#172033] text-white'
                  : 'bg-[#F7F6F2] text-[#667085] hover:bg-[#EBE8DF]'
              }`}
            >
              Sabhi ({realCount + demoCount})
            </button>

            <button
              onClick={() => setSelectedSourceType('real')}
              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                selectedSourceType === 'real'
                  ? 'bg-[#15803D] text-white shadow-xs'
                  : 'bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0]'
              }`}
            >
              <span>Workshop Memories ({realCount})</span>
            </button>

            <button
              onClick={() => setSelectedSourceType('demo')}
              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-colors cursor-pointer ${
                selectedSourceType === 'demo'
                  ? 'bg-[#6B7280] text-white'
                  : 'bg-[#F7F6F2] text-[#667085] hover:bg-[#EBE8DF]'
              }`}
            >
              Demo Data ({demoCount})
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#F7F6F2]">
            {/* Brand Filter */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              <span className="text-xs font-bold text-[#667085] mr-1">Brand:</span>
              {brands.map(brand => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  className={`px-2 py-0.5 text-xs rounded-lg font-bold transition-colors cursor-pointer ${
                    selectedBrand === brand
                      ? 'bg-[#172033] text-white'
                      : 'bg-[#F7F6F2] text-[#667085] hover:bg-[#EBE8DF]'
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>

            {/* Error Code Filter */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              <span className="text-xs font-bold text-[#667085] mr-1">Error:</span>
              {errorCodes.map(code => (
                <button
                  key={code}
                  onClick={() => setSelectedErrorCode(code)}
                  className={`px-2 py-0.5 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
                    selectedErrorCode === code
                      ? 'bg-[#F59E0B] text-[#172033]'
                      : 'bg-[#F7F6F2] text-[#667085] hover:bg-[#EBE8DF]'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-[#667085]">
        <span>
          <strong className="text-[#172033] font-bold">{results.length}</strong> repairs mile
        </span>
        {(searchQuery || selectedBrand !== 'All' || selectedErrorCode !== 'All' || selectedSourceType !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedBrand('All');
              setSelectedErrorCode('All');
              setSelectedSourceType('all');
            }}
            className="text-[#D97706] hover:underline flex items-center gap-1 font-bold cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Results Grid: Cards Prioritize Machine, Problem, What Fixed It, Source */}
      {results.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.map(({ memory, matchReason, matchReasons, sharedFactors, relevanceScore }) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              matchReasons={matchReasons || sharedFactors}
              matchReason={matchReason}
              relevanceScore={relevanceScore}
              onSelect={m => setSelectedMemory(m)}
              onDelete={() => setMemoriesVersion(v => v + 1)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#E4E1D9] rounded-2xl p-8 text-center space-y-2 shadow-xs">
          <Search className="w-8 h-8 text-[#667085] mx-auto" />
          <h3 className="text-base font-bold text-[#172033]">Koi Purana Repair Nahi Mila</h3>
          <p className="text-xs text-[#667085] max-w-sm mx-auto">
            Dusra keyword try karein ya + Jugaad tab mein naya experience save karein.
          </p>
        </div>
      )}

      {/* Modal */}
      <MemoryDetailModal
        memory={selectedMemory}
        onClose={() => setSelectedMemory(null)}
        onDelete={() => {
          setSelectedMemory(null);
          setMemoriesVersion(v => v + 1);
        }}
      />
    </div>
  );
};
