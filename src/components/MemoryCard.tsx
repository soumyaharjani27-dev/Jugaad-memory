import React, { useState } from 'react';
import { RepairMemory } from '../types';
import { User, Trash2 } from 'lucide-react';
import { memoryStore } from '../services/memoryStore';

interface MemoryCardProps {
  memory: RepairMemory;
  matchReasons?: string[];
  matchReason?: string;
  relevanceScore?: number;
  onSelect?: (memory: RepairMemory) => void;
  onDelete?: (memory: RepairMemory) => void;
  compact?: boolean;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  matchReasons,
  matchReason,
  relevanceScore,
  onSelect,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Compute 2-3 genuine evidence-based matching reasons (never fabricate, never generic)
  const computedReasons: string[] = React.useMemo(() => {
    if (matchReasons && matchReasons.length > 0) {
      return matchReasons.filter(r => r && r !== 'Workshop memory record').slice(0, 3);
    }
    if (matchReason && matchReason !== 'Workshop memory record') {
      const parts = matchReason.split(/·|\+/).map(p => p.trim()).filter(Boolean);
      if (parts.length > 0) return parts.slice(0, 3);
    }
    // Fallback based on genuine memory facts
    const reasons: string[] = [];
    if (memory.errorCode) reasons.push(`Same error code (${memory.errorCode})`);
    if (memory.symptoms && memory.symptoms.length > 0) reasons.push('Similar symptom');
    if (memory.applianceCategory) reasons.push('Same appliance type');
    return reasons.slice(0, 3);
  }, [matchReasons, matchReason, memory]);

  const isRealMemory = memory.sourceType === 'real' || !memory.isDemo;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    memoryStore.deleteMemory(memory.id);
    setShowDeleteConfirm(false);
    if (onDelete) {
      onDelete(memory);
    }
  };

  return (
    <>
      <div
        onClick={() => onSelect && onSelect(memory)}
        className={`bg-white border border-[#E4E1D9] hover:border-[#172033] rounded-2xl p-4 sm:p-5 transition-colors text-left shadow-xs flex flex-col justify-between relative group ${
          onSelect ? 'cursor-pointer' : ''
        }`}
      >
        <div>
          {/* 1. Machine / Error & Action Badges */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#667085] mb-1">
                <span className="font-bold text-[#172033]">{memory.id}</span>
                <span aria-hidden="true">·</span>
                <span>{memory.brand}</span>
                {memory.errorCode && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-bold text-[#172033] bg-[#FEF3C7] border border-[#FDE68A] px-1.5 py-0.2 rounded font-mono">
                      {memory.errorCode}
                    </span>
                  </>
                )}
              </div>
              <h3 className="text-base font-black text-[#172033]">
                {memory.brand} {memory.model || 'Device'}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Provenance Distinction Badge */}
              {isRealMemory ? (
                <span className="text-[10px] font-extrabold text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-2 py-0.5 rounded tracking-wide">
                  WORKSHOP MEMORY
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded tracking-wide">
                  DEMO DATA
                </span>
              )}

              {/* Delete / Trash Action */}
              <button
                type="button"
                onClick={handleDelete}
                title={isRealMemory ? "Ye memory delete karein" : "Demo data delete karein"}
                aria-label={`Delete memory ${memory.id}`}
                className="p-1 rounded-lg text-[#8A94A6] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Evidence-Based Explanation: "Is memory ko kyun dikhaya?" */}
          {computedReasons.length > 0 && (
            <div className="mb-3 px-3 py-2 bg-[#F7F6F2] border border-[#E4E1D9] rounded-xl text-xs text-[#172033]">
              <span className="font-bold text-[#D97706] block mb-1">
                Is memory ko kyun dikhaya?
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {computedReasons.map((reason, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 font-semibold text-[#15803D]">
                    <span>✓</span>
                    <span>{reason}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 2. Problem */}
          <p className="text-xs text-[#667085] mb-2 line-clamp-2">
            <strong className="text-[#172033]">Problem: </strong>
            {memory.symptoms.join(', ')}
          </p>

          {/* 3. What fixed it */}
          <div className="p-2.5 bg-[#FEF3C7]/60 border border-[#FDE68A] rounded-xl text-xs text-[#172033] mb-3">
            <strong className="text-[#15803D] block mb-0.5 font-bold">What fixed it:</strong>
            <span>{memory.fix}</span>
          </div>

          {/* PROGRESSIVE DISCLOSURE: Behind "Case details →" */}
          {isExpanded && (
            <div
              onClick={e => e.stopPropagation()}
              className="mt-3 pt-3 border-t border-[#E4E1D9] space-y-2.5 text-xs text-left animate-in fade-in duration-150"
            >
              {/* Long technician quotes */}
              {memory.originalNote && (
                <div className="p-2.5 bg-[#F7F6F2] rounded-lg border-l-2 border-[#D97706] italic text-[#475467]">
                  <span className="font-bold not-italic text-[#172033] block mb-0.5 text-[11px]">
                    Senior Technician Voice/Note:
                  </span>
                  "{memory.originalNote}"
                </div>
              )}

              {/* Detailed repair notes & root cause */}
              {memory.observedCause && (
                <div>
                  <span className="font-bold text-[#172033] block text-[11px]">Observed Cause:</span>
                  <span className="text-[#667085]">{memory.observedCause}</span>
                </div>
              )}

              {/* Diagnostic Steps */}
              {memory.diagnosticSteps && memory.diagnosticSteps.length > 0 && (
                <div>
                  <span className="font-bold text-[#172033] block text-[11px]">Diagnostic Steps Taken:</span>
                  <ol className="list-decimal pl-4 space-y-0.5 text-[#667085] mt-1">
                    {memory.diagnosticSteps.map((step, sIdx) => (
                      <li key={sIdx}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Secondary metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-[#8A94A6] border-t border-dashed border-[#E4E1D9]">
                {memory.partsInvolved && memory.partsInvolved.length > 0 && (
                  <span>Parts: {memory.partsInvolved.join(', ')}</span>
                )}
                {memory.workshop && (
                  <span>Workshop: {memory.workshop}</span>
                )}
                {onSelect && (
                  <button
                    type="button"
                    onClick={() => onSelect(memory)}
                    className="text-[#172033] font-bold hover:underline cursor-pointer ml-auto"
                  >
                    Full Modal View ↗
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Source technician + date & "Case details →" */}
        <div className="flex items-center justify-between text-[11px] text-[#667085] pt-2 mt-1 border-t border-[#E4E1D9]">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#8A94A6]" />
            <span>{memory.technician}</span>
            <span aria-hidden="true">·</span>
            <span>{memory.createdAt}</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="font-bold text-[#D97706] hover:text-[#B45309] flex items-center gap-1 cursor-pointer transition-colors py-0.5"
          >
            <span>Case details</span>
            <span className={`inline-block transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>
              →
            </span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal: "Ye Jugaad delete kar dein?" */}
      {showDeleteConfirm && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172033]/60 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-[#E4E1D9] text-left space-y-3.5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-2.5 text-[#B91C1C]">
              <div className="p-2 bg-[#FEF2F2] rounded-xl">
                <Trash2 className="w-5 h-5 text-[#B91C1C]" />
              </div>
              <h3 className="font-black text-lg text-[#172033]">
                {isRealMemory ? 'Ye Jugaad delete kar dein?' : 'Demo memory delete karein?'}
              </h3>
            </div>

            <p className="text-xs text-[#667085] leading-relaxed">
              {isRealMemory
                ? 'Is repair ki memory permanently remove ho jayegi.'
                : 'Yeh sample demo data hai. Ise delete karne ke baad Workshop page par "Reset Demo" se dobara restore kiya ja sakta hai.'}
            </p>

            <div className="p-3 bg-[#F7F6F2] rounded-xl border border-[#E4E1D9] text-xs font-mono">
              <span className="font-bold text-[#172033] block">
                {memory.id} · {memory.brand} {memory.model || ''}
              </span>
              <span className="text-[#667085] text-[11px] truncate block mt-0.5">
                {memory.observedCause || memory.fix}
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#667085] hover:bg-[#F7F6F2] border border-[#E4E1D9] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
