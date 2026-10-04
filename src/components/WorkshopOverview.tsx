import React, { useState, useMemo, useEffect } from 'react';
import { RepairMemory } from '../types';
import { memoryStore } from '../services/memoryStore';
import { MemoryCard } from './MemoryCard';
import { MemoryDetailModal } from './MemoryDetailModal';
import {
  Building2,
  Wrench,
  RotateCcw,
  Plus,
  CheckCircle2,
  Trash2,
  Play,
  ArrowRight,
  ShieldCheck,
  User,
  Sparkles,
} from 'lucide-react';

interface WorkshopOverviewProps {
  onStartRepair: () => void;
  onViewMemories: () => void;
  onDataReset: () => void;
  onStartRepairWithMemory?: (memory: RepairMemory) => void;
  onCaptureJugaad?: () => void;
}

export const WorkshopOverview: React.FC<WorkshopOverviewProps> = ({
  onStartRepair,
  onViewMemories,
  onDataReset,
  onStartRepairWithMemory,
  onCaptureJugaad,
}) => {
  const [memories, setMemories] = useState<RepairMemory[]>(() => memoryStore.getAll());
  const [selectedMemory, setSelectedMemory] = useState<RepairMemory | null>(null);
  const [memoryToDelete, setMemoryToDelete] = useState<RepairMemory | null>(null);

  // Quick "Add Real Repair" modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newBrand, setNewBrand] = useState<string>('Samsung');
  const [newErrorCode, setNewErrorCode] = useState<string>('4C');
  const [newSymptoms, setNewSymptoms] = useState<string>('Water not entering machine, display blinking 4C');
  const [newCause, setNewCause] = useState<string>('Inlet valve filter clogged with hard water scaling');
  const [newFix, setNewFix] = useState<string>('Cleaned inlet mesh filter with descaling agent');
  const [newTech, setNewTech] = useState<string>('My Workshop Tech');
  const [justSavedRealMemory, setJustSavedRealMemory] = useState<RepairMemory | null>(null);

  // Subscribe to memory store changes
  useEffect(() => {
    const unsub = memoryStore.subscribe(() => {
      setMemories(memoryStore.getAll());
    });
    return unsub;
  }, []);

  // Separate Demo vs Real Memories
  const realMemories = useMemo(() => memories.filter(m => m.sourceType === 'real'), [memories]);
  const demoMemories = useMemo(() => memories.filter(m => m.sourceType === 'demo'), [memories]);

  // Unique Technicians and Brands
  const uniqueTechnicians = useMemo(() => {
    const names = new Set(memories.map(m => m.technicianName || m.technician));
    return names.size;
  }, [memories]);

  const uniqueBrands = useMemo(() => {
    const brands = new Set(memories.map(m => m.brand));
    return brands.size;
  }, [memories]);

  // Frequently recurring problems
  const recurringIssues = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of memories) {
      const issue = (m.observedCause || m.cause || m.fix).split('(')[0].trim();
      const simpleLabel = issue.length > 50 ? issue.slice(0, 50) + '...' : issue;
      counts[simpleLabel] = (counts[simpleLabel] || 0) + (m.usageCount || m.timesReferenced || 1);
    }
    return Object.entries(counts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [memories]);

  // Handle adding real memory
  const handleSaveRealMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymptoms.trim() || !newFix.trim()) return;

    const saved = memoryStore.addMemory({
      sourceType: 'real',
      technicianName: newTech.trim() || 'Workshop Technician',
      workshopId: 'demo-workshop-001',
      appliance: {
        category: 'washing_machine',
        brand: newBrand,
      },
      brand: newBrand,
      errorCode: newErrorCode.trim() || undefined,
      symptoms: [newSymptoms.trim()],
      cause: newCause.trim() || newFix.trim(),
      observedCause: newCause.trim() || newFix.trim(),
      diagnosticSteps: ['Inspect affected component', 'Service and verify'],
      fix: newFix.trim(),
      originalNote: `Manual workshop entry: ${newSymptoms}. Fix: ${newFix}`,
      confidence: 1.0,
      outcome: 'confirmed',
      isDemo: false,
    });

    setJustSavedRealMemory(saved);
  };

  const handleResetData = () => {
    if (confirm('Reset workshop memory back to default demo records? Real memories will be preserved.')) {
      memoryStore.resetToDemo();
      onDataReset();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 text-left space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E1D9] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">
              Demo Appliance Workshop
            </h1>
            <span className="text-[10px] font-bold text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-2 py-0.5 rounded">
              PRIVATE MEMORY LAYER
            </span>
          </div>
          <p className="text-xs text-[#667085]">
            Private workshop repair memory & agent diagnostics dashboard
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              setJustSavedRealMemory(null);
            }}
            className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#172033] rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ New Memory</span>
          </button>

          <button
            type="button"
            onClick={onStartRepair}
            className="px-4 py-2 bg-[#172033] hover:bg-[#25324B] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Start Repair
          </button>

          <button
            type="button"
            onClick={handleResetData}
            title="Reset demo records"
            className="px-3 py-2 bg-white hover:bg-[#F7F6F2] border border-[#E4E1D9] text-[#667085] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* DEMO KNOWLEDGE vs REAL WORKSHOP KNOWLEDGE COUNTERS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Real Workshop Memories */}
        <div className="bg-[#DCFCE7]/40 p-4 rounded-xl border border-[#86EFAC] text-center shadow-xs">
          <span className="text-3xl font-black text-[#15803D] block">{realMemories.length}</span>
          <span className="text-xs font-extrabold text-[#15803D] uppercase tracking-wider block">
            Real Memories
          </span>
          <span className="text-[10px] text-[#667085] mt-0.5 block">
            {realMemories.length > 0 ? 'Contributed by technicians' : '0 real workshop memories'}
          </span>
        </div>

        {/* Demo Memories */}
        <div className="bg-white p-4 rounded-xl border border-[#E4E1D9] text-center shadow-xs">
          <span className="text-3xl font-black text-[#667085] block">{demoMemories.length}</span>
          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
            Demo Memories
          </span>
          <span className="text-[10px] text-[#8A94A6] mt-0.5 block">Seeded test scenarios</span>
        </div>

        {/* Technicians */}
        <div className="bg-white p-4 rounded-xl border border-[#E4E1D9] text-center shadow-xs">
          <span className="text-3xl font-black text-[#172033] block">{uniqueTechnicians}</span>
          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
            Technicians
          </span>
          <span className="text-[10px] text-[#8A94A6] mt-0.5 block">Knowledge contributors</span>
        </div>

        {/* Brands */}
        <div className="bg-white p-4 rounded-xl border border-[#E4E1D9] text-center shadow-xs">
          <span className="text-3xl font-black text-[#172033] block">{uniqueBrands}</span>
          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
            OEM Brands
          </span>
          <span className="text-[10px] text-[#8A94A6] mt-0.5 block">Samsung, Whirlpool, LG...</span>
        </div>
      </div>

      {/* SECTION: REAL WORKSHOP MEMORIES (PERSISTENT USER DATA) */}
      <div className="bg-white border border-[#E4E1D9] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4E1D9] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-[#172033]">
                Real Workshop Memories ({realMemories.length})
              </h2>
              <span className="text-[10px] font-bold text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-2 py-0.5 rounded">
                PERSISTENT REAL DATA
              </span>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              These repair memories survive reloads, browser restarts, and are immediately retrieved during repairs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              setJustSavedRealMemory(null);
            }}
            className="text-xs font-bold text-[#D97706] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Real Repair</span>
          </button>
        </div>

        {realMemories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {realMemories.map(memory => (
              <div
                key={memory.id}
                className="bg-[#FBFBFA] border border-[#E4E1D9] hover:border-[#172033] rounded-xl p-4 transition-colors space-y-2.5 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <span className="font-bold text-[#172033]">{memory.id}</span>
                    <span>·</span>
                    <span>{memory.brand}</span>
                    {memory.errorCode && (
                      <span className="font-bold text-[#172033] bg-[#FEF3C7] border border-[#FDE68A] px-1 rounded text-[11px]">
                        {memory.errorCode}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-1.5 py-0.2 rounded">
                    WORKSHOP MEMORY
                  </span>
                </div>

                <p className="text-xs text-[#667085] line-clamp-2">
                  <strong className="text-[#172033]">Problem: </strong>
                  {memory.symptoms.join(', ')}
                </p>

                <div className="p-2 bg-white rounded-lg border border-[#E4E1D9] text-xs">
                  <strong className="text-[#15803D] block font-bold">Fix:</strong>
                  <span className="text-[#172033]">{memory.fix}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E4E1D9] text-[11px]">
                  <span className="text-[#8A94A6]">By {memory.technicianName}</span>

                  <div className="flex items-center gap-2">
                    {onStartRepairWithMemory && (
                      <button
                        type="button"
                        onClick={() => onStartRepairWithMemory(memory)}
                        className="text-[#172033] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 text-[#F59E0B]" />
                        <span>Test this memory</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setMemoryToDelete(memory)}
                      title="Delete real memory"
                      className="text-[#B91C1C] hover:opacity-80 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-[#F7F6F2] rounded-xl border border-dashed border-[#DCD7CB] space-y-2">
            <span className="text-xs font-bold text-[#667085] block">0 real workshop memories stored</span>
            <p className="text-xs text-[#8A94A6] max-w-sm mx-auto">
              Add your own real repair fix using the button below or capture knowledge via the + Jugaad tab.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowAddModal(true);
                setJustSavedRealMemory(null);
              }}
              className="mt-2 px-4 py-2 bg-[#172033] text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              + Add Real Repair
            </button>
          </div>
        )}
      </div>

      {/* Frequently Recurring Workshop Issues */}
      <div className="bg-white border border-[#E4E1D9] rounded-2xl p-5 shadow-xs space-y-3">
        <h2 className="text-base font-black text-[#172033]">
          Frequently Recurring Issues (Bar Bar Aane Wali Problems)
        </h2>
        <div className="space-y-2">
          {recurringIssues.map(({ issue, count }, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-[#F7F6F2] rounded-xl border border-[#E4E1D9] text-xs font-semibold text-[#172033]"
            >
              <span className="truncate pr-4">{issue}</span>
              <span className="shrink-0 text-[#667085] bg-white border border-[#E4E1D9] px-2 py-0.5 rounded font-mono text-[11px]">
                {count} cases
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: ADD REAL REPAIR DATA */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#172033]/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl border border-[#E4E1D9] text-left space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E1D9] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#15803D] uppercase tracking-wider block">
                  REAL REPAIR DATA ENTRY
                </span>
                <h3 className="text-lg font-black text-[#172033]">
                  + Add Real Repair Memory
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#667085] hover:text-[#172033] font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {justSavedRealMemory ? (
              <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-xl space-y-3 text-center">
                <div className="w-10 h-10 bg-[#15803D] text-white rounded-full flex items-center justify-center mx-auto text-lg font-black">
                  ✓
                </div>
                <div>
                  <span className="text-xs font-extrabold text-[#15803D] block">
                    ✓ Saved to Workshop Memory!
                  </span>
                  <p className="text-xs font-bold text-[#172033]">
                    {justSavedRealMemory.id} · {justSavedRealMemory.brand} {justSavedRealMemory.errorCode}
                  </p>
                  <p className="text-[11px] text-[#667085] mt-1">
                    This repair is now permanently stored and will be retrieved by the Repair Agent.
                  </p>
                </div>

                <div className="pt-2 flex justify-center gap-2">
                  {onStartRepairWithMemory && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        onStartRepairWithMemory(justSavedRealMemory);
                      }}
                      className="px-4 py-2 bg-[#172033] text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Start Repair using this memory →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setJustSavedRealMemory(null)}
                    className="px-3 py-2 bg-white border border-[#86EFAC] text-[#15803D] font-bold text-xs rounded-xl cursor-pointer"
                  >
                    + Add Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveRealMemory} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#667085] mb-1">Brand</label>
                    <select
                      value={newBrand}
                      onChange={e => setNewBrand(e.target.value)}
                      className="w-full p-2.5 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg font-bold text-[#172033]"
                    >
                      {['Samsung', 'Whirlpool', 'LG', 'IFB', 'Bosch', 'Other'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#667085] mb-1">Error Code</label>
                    <input
                      type="text"
                      value={newErrorCode}
                      onChange={e => setNewErrorCode(e.target.value)}
                      placeholder="e.g. 4C, OE, F06"
                      className="w-full p-2.5 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg font-bold text-[#172033]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#667085] mb-1">Problem / Symptoms</label>
                  <input
                    type="text"
                    required
                    value={newSymptoms}
                    onChange={e => setNewSymptoms(e.target.value)}
                    placeholder="e.g. Water not entering, machine beeping"
                    className="w-full p-2.5 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg font-medium text-[#172033]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#667085] mb-1">Root Cause (Karan)</label>
                  <input
                    type="text"
                    required
                    value={newCause}
                    onChange={e => setNewCause(e.target.value)}
                    placeholder="e.g. Inlet valve filter clogged with hard water scaling"
                    className="w-full p-2.5 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg font-medium text-[#172033]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#667085] mb-1">What Fixed It (Samadhan)</label>
                  <input
                    type="text"
                    required
                    value={newFix}
                    onChange={e => setNewFix(e.target.value)}
                    placeholder="e.g. Cleaned filter mesh with citric acid wash"
                    className="w-full p-2.5 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg font-medium text-[#172033]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#667085] mb-1">Technician Name</label>
                  <input
                    type="text"
                    value={newTech}
                    onChange={e => setNewTech(e.target.value)}
                    className="w-full p-2.5 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg font-medium text-[#172033]"
                  />
                </div>

                <div className="pt-3 border-t border-[#E4E1D9] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-[#667085] hover:text-[#172033] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#172033] hover:bg-[#25324B] text-white text-xs font-black rounded-xl cursor-pointer"
                  >
                    ✓ Save Real Memory
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Memory Details Modal */}
      <MemoryDetailModal
        memory={selectedMemory}
        onClose={() => setSelectedMemory(null)}
      />

      {/* Delete Confirmation Modal */}
      {memoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172033]/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-[#E4E1D9] shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3 text-[#B91C1C]">
              <div className="p-2.5 bg-[#FEF2F2] rounded-xl border border-[#FECACA]">
                <Trash2 className="w-5 h-5 text-[#B91C1C]" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#172033]">
                  Ye Jugaad delete kar dein?
                </h3>
                <span className="text-[11px] font-mono text-[#8A94A6]">
                  {memoryToDelete.id} · {memoryToDelete.brand}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#667085] leading-relaxed">
              Is repair ki memory permanently remove ho jayegi.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMemoryToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-[#667085] hover:text-[#172033] bg-[#F7F6F2] hover:bg-[#EBE8DF] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  if (memoryToDelete) {
                    memoryStore.deleteMemory(memoryToDelete.id);
                    setMemoryToDelete(null);
                  }
                }}
                className="px-4 py-2 text-xs font-black text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
