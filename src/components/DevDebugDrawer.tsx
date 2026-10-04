import React, { useState } from 'react';
import { DevDebugInfo, AgentToolCall, ReplanEvent } from '../types';
import {
  Terminal,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  Cpu,
  Database,
  Eye,
  Wrench,
  Bot,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface DevDebugDrawerProps {
  debugInfo: DevDebugInfo | null;
  isOpen: boolean;
  onToggle: () => void;
}

export const DevDebugDrawer: React.FC<DevDebugDrawerProps> = ({
  debugInfo,
  isOpen,
  onToggle,
}) => {
  const [activeTab, setActiveTab] = useState<'agent' | 'tools' | 'replan' | 'retrieval' | 'raw'>('agent');

  return (
    <aside
      aria-label="Developer diagnostics"
      className={`fixed bottom-0 right-0 z-40 transition-all duration-300 w-full sm:w-[520px] bg-slate-950 text-slate-100 border-t sm:border-l border-slate-800 shadow-2xl rounded-t-xl sm:rounded-tl-xl ${
        isOpen ? 'h-96' : 'h-10'
      }`}
    >
      {/* Header bar */}
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full h-10 px-4 flex items-center justify-between bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-300 hover:text-white cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-amber-400">AGENT DEV MODE</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-mono">
            {debugInfo?.agentStatus
              ? `STATE: ${debugInfo.agentStatus.toUpperCase()}`
              : 'Standby'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {debugInfo?.isAiPowered ? (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              <Cpu className="w-3 h-3" /> Gemini 3.8 Flash
            </span>
          ) : (
            <span className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
              <Database className="w-3 h-3" /> Workshop Agent
            </span>
          )}
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </button>

      {/* Body when open */}
      {isOpen && (
        <div className="h-[calc(100%-2.5rem)] flex flex-col text-xs font-mono">
          {/* Sub Navigation */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 text-[11px] overflow-x-auto">
            <button
              onClick={() => setActiveTab('agent')}
              className={`px-2 py-1 rounded transition-colors ${
                activeTab === 'agent' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Agent State
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-2 py-1 rounded transition-colors ${
                activeTab === 'tools' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tools ({debugInfo?.toolCalls?.length || debugInfo?.toolCallsCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('replan')}
              className={`px-2 py-1 rounded transition-colors ${
                activeTab === 'replan' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Replan ({debugInfo?.replanHistory?.length || debugInfo?.replanEventsCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('retrieval')}
              className={`px-2 py-1 rounded transition-colors ${
                activeTab === 'retrieval' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Matches ({debugInfo?.sourceMemoryIds?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-2 py-1 rounded transition-colors ${
                activeTab === 'raw' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Raw
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-left">
            {!debugInfo ? (
              <div className="text-slate-500 py-8 text-center">
                Perform a repair or memory search to inspect agentic execution metadata.
              </div>
            ) : activeTab === 'agent' ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">REPAIR ID</span>
                    <span className="font-bold text-amber-300">{debugInfo.repairId || 'R-2026-ACTIVE'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">AGENT STATE</span>
                    <span className="font-bold text-emerald-400 uppercase">
                      {debugInfo.agentStatus || 'WAITING_FOR_TECHNICIAN'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 rounded border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 block">CURRENT PLAN / ACTIVE STEP</span>
                  <span className="font-bold text-slate-200 block">
                    Step {debugInfo.activeStepNumber}: {debugInfo.currentPlan}
                  </span>
                </div>

                {debugInfo.savedMemoryId && (
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-800 rounded text-emerald-300">
                    <span className="text-[10px] font-bold block">SAVED MEMORY ID</span>
                    <span className="font-bold text-sm">{debugInfo.savedMemoryId}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">CONFIDENCE SCORE</span>
                    <span className="font-bold text-emerald-400">
                      {((debugInfo.confidence || 0.95) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">TOOL CALLS COUNT</span>
                    <span className="font-bold text-cyan-400">
                      {debugInfo.toolCalls?.length || debugInfo.toolCallsCount || 0} calls
                    </span>
                  </div>
                </div>
              </div>
            ) : activeTab === 'tools' ? (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Executed Agent Tool Calls:
                </span>
                {debugInfo.toolCalls && debugInfo.toolCalls.length > 0 ? (
                  debugInfo.toolCalls.map((call, i) => (
                    <div key={i} className="p-2.5 bg-slate-900 rounded border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-amber-300">TOOL: {call.toolName}()</span>
                        {call.durationMs && (
                          <span className="text-slate-500">{call.durationMs}ms</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        <span className="text-slate-500">Output: </span>
                        <span>{JSON.stringify(call.output)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 p-4 text-center">No tool calls recorded in current session.</div>
                )}
              </div>
            ) : activeTab === 'replan' ? (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Agent Dynamic Re-planning Events:
                </span>
                {debugInfo.replanHistory && debugInfo.replanHistory.length > 0 ? (
                  debugInfo.replanHistory.map((rep, i) => (
                    <div key={i} className="p-2.5 bg-slate-900 rounded border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold">
                        <span>REPLAN #{i + 1}</span>
                        <span className="text-[10px] text-slate-500">{rep.timestamp.split('T')[1]?.slice(0, 8)}</span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        <strong className="text-slate-400">Observation: </strong>
                        <span>{rep.triggerObservation}</span>
                      </div>
                      <div className="text-[11px] text-emerald-300">
                        <strong className="text-slate-400">Agent Reasoning: </strong>
                        <span>"{rep.reasoning}"</span>
                      </div>
                      <div className="text-[10px] text-cyan-300">
                        <strong className="text-slate-400">New Step: </strong>
                        <span>{rep.newPlanStepTitle}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 p-4 text-center">
                    No replan events triggered yet. Provide an observation during repair check to trigger replanning.
                  </div>
                )}
              </div>
            ) : activeTab === 'retrieval' ? (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Retrieved Workshop Memories ({debugInfo.sourceMemoryIds.length}):
                </span>
                {debugInfo.retrievalMatches.map((m, idx) => (
                  <div key={idx} className="p-2 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-300">{m.id}</span>
                      <span className="text-[10px] text-slate-400 block">{m.reason}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {(m.score * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <pre className="p-3 bg-slate-900 rounded text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
