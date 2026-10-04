/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroHome } from './components/HeroHome';
import { RepairWorkflow } from './components/RepairWorkflow';
import { CaptureWorkflow } from './components/CaptureWorkflow';
import { MemoryBrowser } from './components/MemoryBrowser';
import { WorkshopOverview } from './components/WorkshopOverview';
import { DevDebugDrawer } from './components/DevDebugDrawer';
import { LogoMark } from './components/LogoMark';
import { DevDebugInfo } from './types';
import { memoryStore } from './services/memoryStore';
import { SAMPLE_IMAGES } from './data/sampleImages';

export default function App() {
  const [activeTab, setActiveTab] = useState<'repair' | 'memory' | 'capture' | 'workshop'>('repair');
  const [isHomeVisible, setIsHomeVisible] = useState<boolean>(true);
  const [devModeOpen, setDevModeOpen] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<DevDebugInfo | null>(null);
  const [presetScenario, setPresetScenario] = useState<{ photoUrl: string; symptomText: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const totalMemoriesCount = memoryStore.getAll().length;

  // Handler for Hero "Try Demo"
  const handleRunDemo = () => {
    setIsHomeVisible(false);
    setActiveTab('repair');
    setPresetScenario({
      photoUrl: SAMPLE_IMAGES.CONTROL_PANEL,
      symptomText: 'Samsung 4C, paani nahi aa raha',
    });
  };

  const handleStartRepair = () => {
    setIsHomeVisible(false);
    setActiveTab('repair');
    setPresetScenario(null);
  };

  const handleCaptureJugaad = () => {
    setIsHomeVisible(false);
    setActiveTab('capture');
  };

  const handleTabChange = (tab: 'repair' | 'memory' | 'capture' | 'workshop') => {
    setActiveTab(tab);
    setIsHomeVisible(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#172033]">
      {/* Top Header & Mobile Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onRunDemo={handleRunDemo}
        devModeOpen={devModeOpen}
        setDevModeOpen={setDevModeOpen}
      />

      {/* Main Content Area: pb-24 on mobile to accommodate bottom navigation bar */}
      <main className="flex-1 pb-24 md:pb-12">
        {isHomeVisible && (
          <HeroHome
            onStartRepair={handleStartRepair}
            onCaptureJugaad={handleCaptureJugaad}
            onTryDemo={handleRunDemo}
            totalMemoriesCount={totalMemoriesCount}
          />
        )}

        {/* View switching */}
        {!isHomeVisible && activeTab === 'repair' && (
          <RepairWorkflow
            onUpdateDebugInfo={setDebugInfo}
            onMemoryAdded={() => setRefreshTrigger(prev => prev + 1)}
            presetScenario={presetScenario}
            onClearPresetScenario={() => setPresetScenario(null)}
            onViewMemories={() => setActiveTab('memory')}
          />
        )}

        {!isHomeVisible && activeTab === 'memory' && (
          <MemoryBrowser
            onStartRepairWithMemory={mem => {
              setPresetScenario({
                photoUrl: mem.photoUrl,
                symptomText: `${mem.brand} ${mem.errorCode || ''} ${mem.symptoms[0] || ''}`,
              });
              setActiveTab('repair');
            }}
          />
        )}

        {!isHomeVisible && activeTab === 'capture' && (
          <CaptureWorkflow
            onMemoryAdded={() => setRefreshTrigger(prev => prev + 1)}
            onUpdateDebugInfo={setDebugInfo}
            onViewMemories={() => setActiveTab('memory')}
            onStartRepairWithMemory={mem => {
              setPresetScenario({
                photoUrl: mem.photoUrl,
                symptomText: `${mem.brand} ${mem.errorCode || ''} ${mem.symptoms[0] || mem.fix}`.trim(),
              });
              setActiveTab('repair');
            }}
          />
        )}

        {!isHomeVisible && activeTab === 'workshop' && (
          <WorkshopOverview
            onStartRepair={() => setActiveTab('repair')}
            onViewMemories={() => setActiveTab('memory')}
            onDataReset={() => setRefreshTrigger(prev => prev + 1)}
            onStartRepairWithMemory={mem => {
              setPresetScenario({
                photoUrl: mem.photoUrl,
                symptomText: `${mem.brand} ${mem.errorCode || ''} ${mem.symptoms[0] || mem.fix}`.trim(),
              });
              setActiveTab('repair');
            }}
            onCaptureJugaad={() => setActiveTab('capture')}
          />
        )}
      </main>

      {/* Developer Diagnostics Drawer */}
      <DevDebugDrawer
        debugInfo={debugInfo}
        isOpen={devModeOpen}
        onToggle={() => setDevModeOpen(!devModeOpen)}
      />

      {/* Workshop Utilitarian Footer */}
      <footer className="border-t border-[#E4E1D9] bg-white py-4 text-xs text-[#667085] hidden md:block">
        <div className="max-w-6xl mx-auto px-4 flex flex-row items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5">
            <LogoMark size="sm" />
            <span className="font-bold text-[#172033]">Jugaad Memory</span>
            <span>·</span>
            <span>Private Workshop Memory Layer · Demo Appliance Workshop</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#8A94A6]">
            <span>DEMO WORKSHOP DATA</span>
            <span>·</span>
            <button
              onClick={() => setIsHomeVisible(!isHomeVisible)}
              className="text-[#172033] hover:underline font-semibold cursor-pointer"
            >
              {isHomeVisible ? 'Go to Workbench' : 'Home'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
