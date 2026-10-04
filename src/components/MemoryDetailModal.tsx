import React, { useState } from 'react';
import { RepairMemory } from '../types';
import { X, Calendar, History, Trash2 } from 'lucide-react';
import { VisualOverlay } from './VisualOverlay';
import { memoryStore } from '../services/memoryStore';

interface MemoryDetailModalProps {
  memory: RepairMemory | null;
  onClose: () => void;
  onDelete?: () => void;
  matchReason?: string;
}

export const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({
  memory,
  onClose,
  onDelete,
  matchReason,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  if (!memory) return null;

  const isRealMemory = memory.sourceType === 'real' || !memory.isDemo;

  const handleConfirmDelete = () => {
    memoryStore.deleteMemory(memory.id);
    setShowDeleteConfirm(false);
    if (onDelete) {
      onDelete();
    } else {
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#172033]/60 backdrop-blur-xs">
        <div
          className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-xl border border-[#E4E1D9] flex flex-col overflow-hidden text-left"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-[#E4E1D9] flex items-start justify-between bg-[#F7F6F2]">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#667085] mb-1">
                <span className="font-bold text-[#172033]">{memory.id}</span>
                <span aria-hidden="true">·</span>
                <span>{memory.brand}</span>
                {memory.errorCode && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-bold text-[#172033] bg-[#FEF3C7] border border-[#FDE68A] px-1.5 py-0.2 rounded">
                      {memory.errorCode}
                    </span>
                  </>
                )}
                {isRealMemory ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#15803D] font-bold text-[10px] bg-[#DCFCE7] px-1.5 py-0.5 rounded">
                      WORKSHOP MEMORY
                    </span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#8A94A6] italic text-[10px]">DEMO DATA</span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-black text-[#172033]">
                {memory.brand} {memory.model || 'Device'}
              </h2>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                title="Ye Jugaad delete karein"
                className="p-1.5 text-[#8A94A6] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-[#667085] hover:text-[#172033] hover:bg-[#E4E1D9] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Ye information kahan se aayi? (Transparency) */}
            <div className="p-3 bg-[#F7F6F2] border border-[#E4E1D9] rounded-xl text-xs text-[#172033]">
              <strong className="text-[#D97706] block mb-0.5">Ye information kahan se aayi?</strong>
              <span>
                {isRealMemory ? 'WORKSHOP MEMORY: Aapki workshop ke confirmed real repair case se.' : 'DEMO DATA: Workshop sample memory case se.'}
                {matchReason ? ` (${matchReason})` : ''}
              </span>
            </div>

            {/* Component Diagram / Photo */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#667085] block mb-2">
                Component Photo & Highlight
              </span>
              <VisualOverlay
                imageUrl={memory.photoUrl}
                visualTarget={memory.visualTarget}
                altText={memory.brand}
              />
            </div>

            {/* Senior Technician Raw Input */}
            <div className="p-4 bg-[#F7F6F2] rounded-xl border border-[#E4E1D9]">
              <div className="flex items-center justify-between text-xs text-[#667085] mb-1.5">
                <span className="font-bold text-[#172033]">Original Technician Note:</span>
                <span>{memory.technician}</span>
              </div>
              <p className="text-xs sm:text-sm text-[#172033] italic leading-relaxed">
                "{memory.originalNote}"
              </p>
            </div>

            {/* Problem & Fix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-[#E4E1D9] bg-white">
                <span className="text-xs font-bold uppercase tracking-wider text-[#667085] block mb-1">
                  Root Cause (Karan)
                </span>
                <p className="text-xs sm:text-sm font-semibold text-[#172033]">{memory.observedCause}</p>
              </div>

              <div className="p-3.5 rounded-xl border border-[#D97706]/40 bg-[#FEF3C7]/40">
                <span className="text-xs font-bold uppercase tracking-wider text-[#B45309] block mb-1">
                  Verified Workshop Fix
                </span>
                <p className="text-xs sm:text-sm font-bold text-[#172033]">{memory.fix}</p>
              </div>
            </div>

            {/* Diagnostic Steps Tested */}
            {memory.diagnosticSteps && memory.diagnosticSteps.length > 0 && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#667085] block mb-2">
                  Workshop Diagnostic Sequence
                </span>
                <div className="space-y-1.5">
                  {memory.diagnosticSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#F7F6F2] rounded-lg border border-[#E4E1D9] text-xs flex items-start gap-2"
                    >
                      <span className="w-5 h-5 rounded bg-white text-[#172033] font-bold flex items-center justify-center shrink-0 border border-[#E4E1D9]">
                        {idx + 1}
                      </span>
                      <span className="text-[#172033] pt-0.5 font-medium">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Metadata */}
            <div className="pt-3 border-t border-[#E4E1D9] flex flex-wrap items-center justify-between text-xs text-[#667085] gap-2">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#8A94A6]" />
                <span>Date: {memory.createdAt}</span>
              </div>
              <div className="flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-[#8A94A6]" />
                <span>Used {memory.timesReferenced || 1} times</span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 border-t border-[#E4E1D9] bg-[#F7F6F2] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs font-bold text-[#B91C1C] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Memory</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#172033] hover:bg-[#25324B] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(false);
          }}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#172033]/70 backdrop-blur-xs"
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
                : 'Yeh sample demo data hai. Ise delete karne ke baad Workshop page par "Reset Demo" se wapas laya ja sakta hai.'}
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
