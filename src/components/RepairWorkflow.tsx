import React, { useState, useEffect, useRef } from 'react';
import {
  RepairMemory,
  RepairState,
  AgentPlanStep,
  VisualTarget,
  DevDebugInfo,
} from '../types';
import { repairAgent } from '../services/repairAgent';
import { memoryStore } from '../services/memoryStore';
import { speechService } from '../services/speechService';
import { SAMPLE_IMAGES } from '../data/sampleImages';
import { VisualOverlay } from './VisualOverlay';
import { MemoryCard } from './MemoryCard';
import { MemoryDetailModal } from './MemoryDetailModal';
import {
  Camera,
  Upload,
  Mic,
  MicOff,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Wrench,
  Volume2,
  VolumeX,
  ShieldAlert,
  Save,
  Search,
  Check,
  RotateCcw,
  Sparkles,
  Bot,
  Activity,
  Layers,
  FileCheck,
} from 'lucide-react';

interface RepairWorkflowProps {
  onUpdateDebugInfo: (info: DevDebugInfo) => void;
  onMemoryAdded: () => void;
  presetScenario?: {
    photoUrl: string;
    symptomText: string;
  } | null;
  onClearPresetScenario?: () => void;
  onViewMemories?: () => void;
}

export const RepairWorkflow: React.FC<RepairWorkflowProps> = ({
  onUpdateDebugInfo,
  onMemoryAdded,
  presetScenario,
  onClearPresetScenario,
  onViewMemories,
}) => {
  // Navigation / stage
  const [stage, setStage] = useState<'input' | 'matched' | 'guided_step' | 'complete'>('input');
  const [photoUrl, setPhotoUrl] = useState<string>(SAMPLE_IMAGES.CONTROL_PANEL);
  const [symptomText, setSymptomText] = useState<string>('Samsung 4C, paani nahi aa raha');
  const [isAgentExecuting, setIsAgentExecuting] = useState<boolean>(false);

  // Stateful Agent Representation
  const [repairState, setRepairState] = useState<RepairState>(() =>
    repairAgent.createInitialState({
      photoUrl: SAMPLE_IMAGES.CONTROL_PANEL,
      symptomText: 'Samsung 4C, paani nahi aa raha',
    })
  );

  // Selected memory for inspection
  const [selectedInspectMemory, setSelectedInspectMemory] = useState<RepairMemory | null>(null);
  const [showVisualTarget, setShowVisualTarget] = useState<boolean>(true);
  const [replanBanner, setReplanBanner] = useState<string | null>(null);
  const [technicianNoteInput, setTechnicianNoteInput] = useState<string>('');
  const [showSeniorTip, setShowSeniorTip] = useState<boolean>(false);

  // Problem correction / custom observation states
  const [isCustomProblemOpen, setIsCustomProblemOpen] = useState<boolean>(false);
  const [customProblemText, setCustomProblemText] = useState<string>('');
  const [isRecordingCustomMic, setIsRecordingCustomMic] = useState<boolean>(false);
  const [showSaveOffer, setShowSaveOffer] = useState<boolean>(true);
  const [showSaveForm, setShowSaveForm] = useState<boolean>(false);

  // Audio state
  const [isSpeakingHindi, setIsSpeakingHindi] = useState<boolean>(false);
  const [isSpeakingEnglish, setIsSpeakingEnglish] = useState<boolean>(false);
  const [isRecordingMic, setIsRecordingMic] = useState<boolean>(false);

  // Final fix details
  const [finalFixCategory, setFinalFixCategory] = useState<string>('Blockage');
  const [finalFixText, setFinalFixText] = useState<string>('');
  const [savedMemoryId, setSavedMemoryId] = useState<string | null>(null);
  const [isSavingMemory, setIsSavingMemory] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current active step from agent plan
  const currentStep = repairState.plan[repairState.currentStepIndex] || null;

  // Sync dev debug info whenever state updates
  useEffect(() => {
    onUpdateDebugInfo({
      detectedIntent: 'AGENT_REPAIR_LOOP',
      retrievalMatches: repairState.retrievedMemories.map(m => ({
        id: m.memory.id,
        score: m.similarity,
        reason: m.matchReasons.join(', '),
      })),
      sourceMemoryIds: repairState.retrievedMemories.map(m => m.memory.id),
      confidence: repairState.retrievedMemories[0]?.similarity || 0.9,
      activeStepNumber: (repairState.currentStepIndex || 0) + 1,
      isAiPowered: true,
      isFallback: false,
      repairId: repairState.repairId,
      agentStatus: repairState.status,
      currentPlan: currentStep?.title || 'Standby',
      toolCallsCount: repairState.toolCalls.length,
      replanEventsCount: repairState.replanHistory.length,
      savedMemoryId: repairState.savedMemoryId,
      toolCalls: repairState.toolCalls,
      replanHistory: repairState.replanHistory,
    });
  }, [repairState, currentStep]);

  // Handle Preset Scenario (Try Demo)
  useEffect(() => {
    if (presetScenario) {
      setPhotoUrl(presetScenario.photoUrl);
      setSymptomText(presetScenario.symptomText);
      handleStartAgentRepair(presetScenario.photoUrl, presetScenario.symptomText);
      if (onClearPresetScenario) {
        onClearPresetScenario();
      }
    }
  }, [presetScenario]);

  // Clean stop audio on unmount
  useEffect(() => {
    return () => {
      speechService.stopSpeaking();
    };
  }, []);

  // -------------------------------------------------------------
  // START AGENT REPAIR WORKFLOW:
  // SEE → REMEMBER → REASON → PLAN
  // -------------------------------------------------------------
  const handleStartAgentRepair = async (imgUrl: string = photoUrl, query: string = symptomText) => {
    if (!query.trim()) return;

    setIsAgentExecuting(true);
    setReplanBanner(null);

    try {
      // 1. Initialize State
      let state = repairAgent.createInitialState({
        photoUrl: imgUrl,
        symptomText: query,
      });

      // 2. Multimodal Scene Observation
      state = await repairAgent.inspectScene(state, imgUrl, query);

      // 3. Search Workshop Memory across any device
      state = await repairAgent.searchWorkshopMemory(state, query, {
        brand: (state.brand && state.brand !== 'Unknown' && state.brand !== 'Device') ? state.brand : (state.appliance?.brand && state.appliance.brand !== 'Unknown' ? state.appliance.brand : undefined),
        errorCode: state.errorCode || undefined,
        category: state.category || state.appliance?.category || undefined,
      });

      // 4. Compare with Memory
      const comp = repairAgent.compareWithMemory(state);
      state = comp.state;

      // 5. Create Repair Plan (from memories or transparent AI suggestion)
      state = repairAgent.createRepairPlan(state);

      setRepairState(state);

      if (state.retrievedMemories.length > 0) {
        setStage('matched');
      } else {
        setStage('guided_step');
      }
    } catch (e) {
      console.error('Agent initialization error:', e);
    } finally {
      setIsAgentExecuting(false);
    }
  };

  // Dual Audio Helpers
  const playHindiAudio = (step: AgentPlanStep) => {
    speechService.stopSpeaking();
    setIsSpeakingEnglish(false);
    setIsSpeakingHindi(true);

    const text = [
      step.instructionHindi || step.instruction,
      ...(step.actionDetailsHindi || []),
      step.safetyNoticeHindi || '',
    ].join('. ');

    speechService.speak(
      text,
      'hi',
      () => setIsSpeakingHindi(false),
      () => setIsSpeakingHindi(false)
    );
  };

  const playEnglishAudio = (step: AgentPlanStep) => {
    speechService.stopSpeaking();
    setIsSpeakingHindi(false);
    setIsSpeakingEnglish(true);

    const text = [
      step.instruction,
      step.reason || '',
      step.safetyNotice || '',
    ].join('. ');

    speechService.speak(
      text,
      'en',
      () => setIsSpeakingEnglish(false),
      () => setIsSpeakingEnglish(false)
    );
  };

  const stopAllAudio = () => {
    speechService.stopSpeaking();
    setIsSpeakingHindi(false);
    setIsSpeakingEnglish(false);
  };

  // -------------------------------------------------------------
  // OBSERVATION HANDLERS: ACT → OBSERVE → REPLAN
  // -------------------------------------------------------------
  // "Han, yehi problem hai" -> Real Agent State Transition
  const handleConfirmProblem = () => {
    stopAllAudio();
    if (!currentStep) return;

    setIsAgentExecuting(true);
    try {
      const finding = currentStep.suggestedFix || currentStep.title || 'Identified Component Issue';
      const result = repairAgent.confirmIdentifiedProblem(repairState, finding);
      setRepairState(result.state);
      setReplanBanner(`✓ Problem confirm hui (${finding})! Agla repair step taiyar hai.`);
      setIsCustomProblemOpen(false);
      setCustomProblemText('');

      // Pre-fill suggested fix category & text
      setFinalFixCategory('Part Serviced');
      setFinalFixText(currentStep.suggestedFix || `${finding} serviced and verified.`);
    } catch (e) {
      console.error('Confirm problem failed:', e);
    } finally {
      setIsAgentExecuting(false);
    }
  };

  // "Problem kuch aur hai" -> Submits custom technician finding & replans
  const handleSubmitCustomProblem = (textToSubmit?: string) => {
    stopAllAudio();
    const text = (textToSubmit || customProblemText).trim();
    if (!text) return;

    setIsAgentExecuting(true);
    try {
      const result = repairAgent.reportAlternativeProblem(repairState, text);
      setRepairState(result.state);
      setReplanBanner(`✓ Aapki observation note ki gayi: "${text}". Naya step taiyar hai!`);
      setIsCustomProblemOpen(false);
      setCustomProblemText('');
      setFinalFixCategory('Loose pin / wiring');
      setFinalFixText(`${text} checked and repaired.`);
    } catch (e) {
      console.error('Custom problem replan failed:', e);
    } finally {
      setIsAgentExecuting(false);
    }
  };

  const handleToggleCustomMic = () => {
    if (isRecordingCustomMic) {
      speechService.stopListening();
      setIsRecordingCustomMic(false);
    } else {
      const started = speechService.startListening(
        'hi',
        (txt) => setCustomProblemText(txt),
        () => setIsRecordingCustomMic(false),
        () => setIsRecordingCustomMic(false)
      );
      if (started) setIsRecordingCustomMic(true);
    }
  };

  const handleObservation = async (finding: 'normal' | 'issue_found' | 'not_sure') => {
    stopAllAudio();
    if (!currentStep) return;

    setIsAgentExecuting(true);
    try {
      // 1. TOOL 6: recordTechnicianObservation
      const note = technicianNoteInput.trim() || (
        finding === 'issue_found'
          ? 'Problem found'
          : finding === 'not_sure'
          ? 'Technician unsure, help requested'
          : 'Component looks normal'
      );
      let state = repairAgent.recordTechnicianObservation(
        repairState,
        finding,
        note
      );

      // 2. TOOL 7: replan (Crucial Agentic Re-planning)
      const lastObs = state.observations[state.observations.length - 1];
      const replanResult = await repairAgent.replan(state, lastObs);
      state = replanResult.state;

      setReplanBanner(replanResult.replanNote || 'Observation note ki gayi. Guidance update hui.');
      setRepairState(state);
      setTechnicianNoteInput('');

      if (finding === 'issue_found') {
        // Pre-populate verified workshop fix or suggested fix
        if (currentStep.suggestedFix) {
          setFinalFixCategory('Replaced / Serviced Component');
          setFinalFixText(currentStep.suggestedFix);
        } else if (currentStep.title?.toLowerCase().includes('filter') || currentStep.instruction?.toLowerCase().includes('filter')) {
          setFinalFixCategory('Blockage / Filter Cleaning');
          setFinalFixText('Filter mesh / screen was cleared and flushed.');
        } else if (currentStep.title?.toLowerCase().includes('connector') || currentStep.title?.toLowerCase().includes('pin')) {
          setFinalFixCategory('Loose Connector / Terminal');
          setFinalFixText('Crimped loose terminal pin and cleaned contacts.');
        } else {
          setFinalFixCategory('Part Serviced');
          setFinalFixText(`${currentStep.title || 'Component'} inspected and serviced.`);
        }
      } else if (finding === 'not_sure') {
        setShowSeniorTip(true);
      }
    } catch (e) {
      console.error('Replan failed:', e);
    } finally {
      setIsAgentExecuting(false);
    }
  };

  // Human Confirmation of physical operation
  const handleConfirmRepairStatus = (isWorking: boolean) => {
    stopAllAudio();
    const updated = repairAgent.completeRepair(
      repairState,
      isWorking,
      'Kya device ab theek chal raha hai?'
    );

    if (isWorking) {
      setRepairState(updated);
      setShowSaveOffer(true);
      setShowSaveForm(false);
      setStage('complete');
    } else {
      // Replan escalation step when device is not working yet
      const nextStepNum = updated.plan.length + 1;
      const escalationStep: AgentPlanStep = {
        stepNumber: nextStepNum,
        title: 'Escalated Check: Control Board / Main Power Rails',
        instruction: 'Component check did not resolve issue. Test main board power rails, secondary fuses, and connection harness.',
        instructionHindi: 'डिवाइस अभी नहीं चला। मुख्य कंट्रोल बोर्ड और पावर सप्लाई वोल्टेज की जांच करें।',
        actionDetailsHindi: [
          '1. बोर्ड पर कोई काला निशान या जला हुआ कंपोनेंट तो नहीं है देखें।',
          '2. इनपुट और आउटपुट DC/AC वोल्टेज मल्टीमीटर से चेक करें।',
          '3. लूज कनेक्टर या ड्राई सोल्डर की जांच करें।'
        ],
        reason: 'Initial component service completed but device did not pass functional test; isolating control stage.',
        reasonHindi: 'पहला चेक पर्याप्त नहीं था; अब कंट्रोल बोर्ड और पावर सप्लाई की जांच जरूरी है।',
        safetyNotice: 'Ensure device is isolated from mains power before probing internal circuits.',
        safetyNoticeHindi: 'सावधानी: सर्किट छूने से पहले मुख्य पावर अनप्लग रखें।',
        sourceMemoryIds: [],
        sourceType: 'ai_suggestion',
        status: 'active',
      };

      const replannedState: RepairState = {
        ...updated,
        status: 'waiting_for_technician',
        plan: [...updated.plan, escalationStep],
        currentStepIndex: updated.plan.length,
      };

      setReplanBanner('Device not working yet. Agent has replanned an escalation check for circuit board & supply rails.');
      setRepairState(replannedState);
    }
  };

  // -------------------------------------------------------------
  // CLOSE THE LOOP: CONFIRM → LEARN (Save new workshop memory)
  // -------------------------------------------------------------
  const handleSaveFinalOutcome = () => {
    setIsSavingMemory(true);
    try {
      const fix = finalFixText.trim() || `${finalFixCategory} checked and repaired.`;
      const res = repairAgent.saveRepairMemory(repairState, fix, 'Workshop Technician');

      setRepairState(res.state);
      setSavedMemoryId(res.savedMemory.id);
      onMemoryAdded();
    } catch (e) {
      console.error('Failed to save memory:', e);
    } finally {
      setIsSavingMemory(false);
    }
  };

  // Reset to new repair
  const handleReset = () => {
    stopAllAudio();
    setStage('input');
    setSymptomText('Samsung 4C, paani nahi aa raha');
    setSavedMemoryId(null);
    setShowSeniorTip(false);
    setReplanBanner(null);
    setTechnicianNoteInput('');
    setRepairState(
      repairAgent.createInitialState({
        photoUrl: SAMPLE_IMAGES.CONTROL_PANEL,
        symptomText: 'Samsung 4C, paani nahi aa raha',
      })
    );
  };

  // Agent Status Badge Color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'observing':
        return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
      case 'searching_memory':
        return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
      case 'planning':
        return 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]';
      case 'replanning':
        return 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]';
      case 'verifying_repair':
        return 'bg-[#FEF9C3] text-[#A16207] border-[#FEF08A]';
      case 'complete':
        return 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]';
      default:
        return 'bg-[#F7F6F2] text-[#172033] border-[#E4E1D9]';
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 text-left space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. INPUT SCREEN: SIMPLE & DIRECT */}
      {/* ------------------------------------------------------------- */}
      {stage === 'input' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">
              Device ya machine mein kya problem hai?
            </h1>
            <p className="text-sm text-[#667085] mt-1">
              Whatever you're repairing, Jugaad Memory remembers what your workshop has learned.
            </p>
          </div>

          {/* 1. Add Photo */}
          <div className="bg-white border border-[#E4E1D9] rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block mb-3">
              1. Device / Appliance ki photo lein
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="sm:col-span-2">
                <VisualOverlay imageUrl={photoUrl} visualTarget={null} />
              </div>

              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setPhotoUrl(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  accept="image/*"
                  className="hidden"
                />

                {/* Primary visual action: Photo lein */}
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3.5 px-4 bg-[#172033] hover:bg-[#25324B] text-white rounded-xl text-sm font-black flex items-center justify-center gap-2.5 cursor-pointer shadow-md active:scale-98 transition-all"
                  >
                    <Camera className="w-5 h-5 text-[#F59E0B]" />
                    <span>Device ki photo lein</span>
                  </button>
                  <p className="text-[11px] text-[#667085] text-center mt-1.5">
                    Camera khol kar device, fault ya error ki photo kheencho
                  </p>
                </div>

                {/* Demoted sample photos labeled clearly for demo */}
                <div className="pt-2.5 border-t border-[#E4E1D9]">
                  <span className="text-[11px] font-semibold text-[#8A94A6] block mb-1.5">
                    Demo ke liye sample devices
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUrl(SAMPLE_IMAGES.CONTROL_PANEL);
                        setSymptomText('Samsung 4C, paani nahi aa raha');
                      }}
                      className={`py-1.5 px-2 text-[11px] rounded-lg border font-medium text-left transition-colors cursor-pointer ${
                        photoUrl === SAMPLE_IMAGES.CONTROL_PANEL
                          ? 'border-[#D97706] bg-[#FEF3C7] text-[#172033] font-bold'
                          : 'border-dashed border-[#DCD7CB] bg-[#F7F6F2] text-[#667085] hover:bg-[#EBE8DF]'
                      }`}
                    >
                      Samsung 4C
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUrl(SAMPLE_IMAGES.IPHONE_BATTERY);
                        setSymptomText('iPhone 16 battery swollen issue');
                      }}
                      className={`py-1.5 px-2 text-[11px] rounded-lg border font-medium text-left transition-colors cursor-pointer ${
                        photoUrl === SAMPLE_IMAGES.IPHONE_BATTERY
                          ? 'border-[#D97706] bg-[#FEF3C7] text-[#172033] font-bold'
                          : 'border-dashed border-[#DCD7CB] bg-[#F7F6F2] text-[#667085] hover:bg-[#EBE8DF]'
                      }`}
                    >
                      iPhone 16 Battery
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUrl(SAMPLE_IMAGES.LAPTOP_CHARGING);
                        setSymptomText('Dell Inspiron DC jack charging port issue');
                      }}
                      className={`py-1.5 px-2 text-[11px] rounded-lg border font-medium text-left transition-colors cursor-pointer ${
                        photoUrl === SAMPLE_IMAGES.LAPTOP_CHARGING
                          ? 'border-[#D97706] bg-[#FEF3C7] text-[#172033] font-bold'
                          : 'border-dashed border-[#DCD7CB] bg-[#F7F6F2] text-[#667085] hover:bg-[#EBE8DF]'
                      }`}
                    >
                      Dell Laptop DC Jack
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUrl(SAMPLE_IMAGES.REFRIGERATOR_DEFROST);
                        setSymptomText('LG Refrigerator defrost failure ice buildup');
                      }}
                      className={`py-1.5 px-2 text-[11px] rounded-lg border font-medium text-left transition-colors cursor-pointer ${
                        photoUrl === SAMPLE_IMAGES.REFRIGERATOR_DEFROST
                          ? 'border-[#D97706] bg-[#FEF3C7] text-[#172033] font-bold'
                          : 'border-dashed border-[#DCD7CB] bg-[#F7F6F2] text-[#667085] hover:bg-[#EBE8DF]'
                      }`}
                    >
                      LG Fridge Defrost
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUrl(SAMPLE_IMAGES.WHIRLPOOL_MOTOR);
                        setSymptomText('Whirlpool F06, motor nahi ghoom raha');
                      }}
                      className={`py-1.5 px-2 text-[11px] rounded-lg border font-medium text-left transition-colors cursor-pointer ${
                        photoUrl === SAMPLE_IMAGES.WHIRLPOOL_MOTOR
                          ? 'border-[#D97706] bg-[#FEF3C7] text-[#172033] font-bold'
                          : 'border-dashed border-[#DCD7CB] bg-[#F7F6F2] text-[#667085] hover:bg-[#EBE8DF]'
                      }`}
                    >
                      Whirlpool F06
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUrl(SAMPLE_IMAGES.ELECTRONIC_PCB);
                        setSymptomText('Electronic board no power output');
                      }}
                      className={`py-1.5 px-2 text-[11px] rounded-lg border font-medium text-left transition-colors cursor-pointer ${
                        photoUrl === SAMPLE_IMAGES.ELECTRONIC_PCB
                          ? 'border-[#D97706] bg-[#FEF3C7] text-[#172033] font-bold'
                          : 'border-dashed border-[#DCD7CB] bg-[#F7F6F2] text-[#667085] hover:bg-[#EBE8DF]'
                      }`}
                    >
                      Electronic PCB Board
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Problem / Error Code */}
          <div className="bg-white border border-[#E4E1D9] rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block mb-2">
              2. Problem / Error Code / Symptoms
            </span>

            <div className="relative">
              <input
                type="text"
                value={symptomText}
                onChange={e => setSymptomText(e.target.value)}
                placeholder="e.g. iPhone 16 battery swollen, or Samsung 4C, paani nahi aa raha"
                className="w-full pl-4 pr-12 py-3.5 bg-[#F7F6F2] border border-[#E4E1D9] rounded-xl text-base text-[#172033] font-semibold focus:bg-white focus:outline-none focus:border-[#F59E0B]"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleStartAgentRepair();
                }}
              />

              <button
                type="button"
                onClick={() => {
                  if (isRecordingMic) {
                    speechService.stopListening();
                    setIsRecordingMic(false);
                  } else {
                    const started = speechService.startListening(
                      'hi',
                      (txt) => setSymptomText(txt),
                      () => setIsRecordingMic(false),
                      () => setIsRecordingMic(false)
                    );
                    if (started) setIsRecordingMic(true);
                  }
                }}
                title="Speak symptom in Hindi/English"
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-lg transition-colors cursor-pointer ${
                  isRecordingMic
                    ? 'bg-[#B91C1C] text-white animate-pulse'
                    : 'text-[#667085] hover:text-[#172033] hover:bg-[#E4E1D9]'
                }`}
              >
                {isRecordingMic ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 3. Primary CTA: Trigger Agent Loop */}
          <button
            type="button"
            disabled={isAgentExecuting || !symptomText.trim()}
            onClick={() => handleStartAgentRepair()}
            className="w-full py-4 px-6 bg-[#172033] hover:bg-[#25324B] disabled:opacity-50 text-white rounded-xl font-black text-base shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {isAgentExecuting ? (
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#F59E0B] animate-spin" />
                <span>Agent Inspecting Scene & Searching Memory...</span>
              </span>
            ) : (
              <>
                <Search className="w-5 h-5 text-[#F59E0B]" />
                <span>🔎 Purane Repairs Dekhein</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. MATCH FOUND SCREEN: REPAIR AGENT SUMMARY */}
      {/* ------------------------------------------------------------- */}
      {stage === 'matched' && (
        <div className="space-y-6">
          {/* Big Obvious Message */}
          <div className="bg-white border-2 border-[#172033] rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#15803D] uppercase tracking-wider block">
                ✓ YOUR WORKSHOP HAS SEEN THIS BEFORE
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${getStatusColor(repairState.status)}`}>
                AGENT: {repairState.status.replace('_', ' ')}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">
              Is problem ko pehle bhi repair kiya hai.
            </h2>
            <p className="text-sm font-semibold text-[#15803D] mt-1">
              {repairState.retrievedMemories.length} similar repairs found in workshop history
            </p>

            {/* Simple Match Reasons */}
            <div className="mt-4 pt-3 border-t border-[#E4E1D9] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-[#667085]">
              <span className="text-[#172033]">Ye repair kyon dikhaya?</span>
              {repairState.retrievedMemories[0]?.matchReasons.map((r, i) => (
                <span key={i} className="text-[#15803D]">✓ {r}</span>
              ))}
            </div>
          </div>

          {/* Visual Target Area */}
          <div className="bg-white border border-[#E4E1D9] rounded-2xl p-4 shadow-xs">
            <VisualOverlay
              imageUrl={photoUrl}
              visualTarget={currentStep?.visualTarget || null}
              altText="Component location"
              provenanceNotice={repairState.retrievedMemories[0]?.matchReasons.join(' · ')}
              onContinueWithoutHighlight={() => setStage('guided_step')}
            />
          </div>

          {/* Previous Cases: What happened? What fixed it? Who recorded it? */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              Previous Workshop Cases ({repairState.retrievedMemories.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {repairState.retrievedMemories.map(({ memory, matchReasons, similarity }) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  matchReasons={matchReasons}
                  matchReason={matchReasons.join(' · ')}
                  relevanceScore={Math.round(similarity * 100)}
                  onSelect={m => setSelectedInspectMemory(m)}
                />
              ))}
            </div>
          </div>

          {/* Start Guided Repair Button */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-3 text-xs font-bold text-[#667085] hover:text-[#172033] cursor-pointer"
            >
              ← Back
            </button>

            <button
              onClick={() => {
                setStage('guided_step');
                if (currentStep) {
                  setTimeout(() => playHindiAudio(currentStep), 300);
                }
              }}
              className="flex-1 py-4 px-6 bg-[#172033] hover:bg-[#25324B] text-white font-extrabold text-base rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Step 1 Check Karein</span>
              <ArrowRight className="w-5 h-5 text-[#F59E0B]" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. GUIDED REPAIR: STATEFUL AGENT WORKBENCH */}
      {/* ------------------------------------------------------------- */}
      {stage === 'guided_step' && currentStep && (
        <div className="space-y-5">
          {/* Agent Active Panel */}
          <div className="bg-[#172033] text-white rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#F59E0B]" />
                <span className="font-extrabold text-xs tracking-wider uppercase text-[#F59E0B]">
                  REPAIR AGENT
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-bold text-slate-200">
                  {repairState.brand || repairState.appliance?.brand || repairState.detectedDevice || 'Device'} {repairState.model ? `· ${repairState.model}` : ''} {repairState.errorCode || ''}
                </span>
              </div>

              {/* Agent Status Badge */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${getStatusColor(repairState.status)}`}>
                {repairState.status.replace('_', ' ')}
              </span>
            </div>

            {/* Agent Progress Breadcrumb */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <span className="text-emerald-400 font-semibold">Understanding the problem ✓</span>
              <span className="text-emerald-400 font-semibold">Workshop memory searched ✓</span>
              <span className="text-emerald-400 font-semibold">Diagnostic plan created ✓</span>
            </div>
          </div>

          {/* Source Indicator: WORKSHOP MEMORY vs AI SUGGESTION */}
          {repairState.planSource === 'ai_suggestion' ? (
            <div className="p-3 bg-[#FEF3C7] border border-[#FDE68A] text-[#B45309] rounded-xl text-xs font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
                <div>
                  <strong className="font-extrabold uppercase text-[#172033] block">AI SUGGESTION — NOT FROM WORKSHOP MEMORY</strong>
                  <span className="text-[11px] font-normal text-[#B45309] block">
                    No matching workshop memory found. The agent created a general baseline diagnostic check.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] rounded-xl text-xs font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                <div>
                  <strong className="font-extrabold uppercase text-[#15803D] block">WORKSHOP MEMORY GUIDED</strong>
                  <span className="text-[11px] font-normal text-[#166534] block">
                    Derived from {repairState.retrievedMemories.length} verified workshop repair case(s).
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Replan Notification Banner */}
          {replanBanner && (
            <div className="p-3.5 bg-[#FEF3C7] border-2 border-[#D97706] text-[#B45309] rounded-xl text-xs font-bold animate-in fade-in flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <div>
                <span className="block font-black text-[#172033] uppercase text-[11px]">
                  ⚡ Agent Re-plan Active
                </span>
                <span>{replanBanner}</span>
              </div>
            </div>
          )}

          {/* Visual Component Area */}
          <div className="bg-white border border-[#E4E1D9] rounded-2xl p-3 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
                Component View
              </span>
              {currentStep.visualTarget && (
                <button
                  type="button"
                  onClick={() => setShowVisualTarget(!showVisualTarget)}
                  className="text-xs font-bold text-[#D97706] hover:underline cursor-pointer"
                >
                  {showVisualTarget ? 'Hide highlight' : 'Show me where'}
                </button>
              )}
            </div>

            <VisualOverlay
              imageUrl={photoUrl}
              visualTarget={showVisualTarget ? currentStep.visualTarget : null}
              altText="Component inspection"
              provenanceNotice={currentStep.reasonHindi || currentStep.reason}
            />
          </div>

          {/* Step Card: Grounded & Clear */}
          <div className="bg-white border-2 border-[#172033] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            {/* Header: Step counter & Error */}
            <div className="flex items-center justify-between border-b border-[#E4E1D9] pb-3">
              <span className="text-xs font-black tracking-wider text-[#D97706] uppercase">
                STEP {currentStep.stepNumber} OF {repairState.plan.length}
              </span>
              <span className="text-xs font-bold text-[#667085]">
                {repairState.brand || repairState.appliance?.brand || repairState.detectedDevice || 'Device'} {repairState.model ? `(${repairState.model})` : ''} {repairState.errorCode ? `· ${repairState.errorCode}` : ''}
              </span>
            </div>

            {/* Instruction: Direct & Technician Friendly */}
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#172033] leading-snug">
                🔧 {currentStep.instructionHindi || currentStep.instruction}
              </h2>
              <p className="text-xs text-[#667085] mt-1 font-medium italic">
                "{currentStep.instruction}"
              </p>
            </div>

            {/* Grounded Evidence Reason */}
            {currentStep.reason && (
              <div className="p-3 bg-[#F7F6F2] rounded-xl border border-[#E4E1D9] text-xs text-[#172033]">
                <strong className="text-[#D97706] block mb-0.5 font-bold">Why check this?</strong>
                <span>"{currentStep.reason}"</span>
              </div>
            )}

            {/* Step Action Bullets in natural Hinglish */}
            {currentStep.actionDetailsHindi && currentStep.actionDetailsHindi.length > 0 && (
              <div className="p-3.5 bg-[#F7F6F2] rounded-xl border border-[#E4E1D9] space-y-1.5">
                <span className="text-xs font-bold text-[#172033] block mb-1">
                  Kya karna hai:
                </span>
                {currentStep.actionDetailsHindi.map((point, idx) => (
                  <p key={idx} className="text-sm font-medium text-[#172033]">
                    {point}
                  </p>
                ))}
              </div>
            )}

            {/* Safety Notice */}
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#B91C1C] flex items-start gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{currentStep.safetyNoticeHindi || currentStep.safetyNotice || 'Ensure power is disconnected before service.'}</span>
            </div>

            {/* Dual Audio Readout (Hindi + English) */}
            <div className="p-3 bg-[#F7F6F2] border border-[#E4E1D9] rounded-xl flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs font-bold text-[#172033]">
                Bolkar sunein:
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isSpeakingHindi) stopAllAudio();
                    else playHindiAudio(currentStep);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isSpeakingHindi
                      ? 'bg-[#D97706] text-white'
                      : 'bg-white text-[#172033] border border-[#E4E1D9] hover:bg-[#EBE8DF]'
                  }`}
                >
                  {isSpeakingHindi ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#D97706]" />}
                  <span>{isSpeakingHindi ? 'Stop' : '🔊 Hindi'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isSpeakingEnglish) stopAllAudio();
                    else playEnglishAudio(currentStep);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isSpeakingEnglish
                      ? 'bg-[#172033] text-white'
                      : 'bg-white text-[#667085] border border-[#E4E1D9] hover:bg-[#EBE8DF]'
                  }`}
                >
                  {isSpeakingEnglish ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{isSpeakingEnglish ? 'Stop' : '🔊 English'}</span>
                </button>
              </div>
            </div>

            {/* Senior Tech Tip (If Pata Nahi clicked) */}
            {showSeniorTip && (
              <div className="p-3.5 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl text-xs text-[#B45309] space-y-1">
                <strong>Ramesh Bhai (Senior Tech) tip:</strong>
                <p>
                  "Agar jaali saaf lag rahi hai, toh pehle tap kholkar bucket mein paani ka pressure dekhein. Pressure theek hai toh valve coil test karein."
                </p>
              </div>
            )}

            {/* Optional Observation Voice/Text Note */}
            <div className="pt-2 border-t border-[#E4E1D9]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#667085]">
                  Aapne kya dekha? (Optional note)
                </label>
              </div>
              <input
                type="text"
                value={technicianNoteInput}
                onChange={e => setTechnicianNoteInput(e.target.value)}
                placeholder="e.g. Filter blocked tha / Loose clip mila"
                className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg text-xs font-medium text-[#172033]"
              />
            </div>

            {/* If servicing: Technician is fixing or replacing component */}
            {repairState.status === 'servicing' ? (
              <div className="pt-3 border-t-2 border-[#15803D] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#15803D] uppercase tracking-wider block">
                    ⚙️ Servicing & Repair Action
                  </span>
                  <span className="text-[11px] text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-2 py-0.5 rounded font-bold">
                    Step {currentStep.stepNumber} of {repairState.plan.length}
                  </span>
                </div>
                <p className="text-sm font-extrabold text-[#172033]">
                  Yeh service step poora karein. Fix karne ke baad device test run karein:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isAgentExecuting}
                    onClick={() => {
                      stopAllAudio();
                      setRepairState(prev => ({
                        ...prev,
                        status: 'verifying_repair',
                      }));
                    }}
                    className="py-4 px-4 bg-[#15803D] hover:bg-[#166534] active:bg-[#14532D] text-white font-extrabold text-sm rounded-xl shadow-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <span>Repair ho gaya, device test karein</span>
                    </div>
                    <span className="text-[11px] text-emerald-100 font-medium">
                      (Check if device runs normally)
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isAgentExecuting}
                    onClick={() => setIsCustomProblemOpen(!isCustomProblemOpen)}
                    className={`py-4 px-4 font-extrabold text-sm rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-98 ${
                      isCustomProblemOpen
                        ? 'bg-[#FEF3C7] border-[#D97706] text-[#B45309]'
                        : 'bg-white hover:bg-[#F7F6F2] text-[#172033] border-[#E4E1D9] hover:border-[#172033]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-[#D97706]" />
                      <span>Problem kuch aur hai</span>
                    </div>
                    <span className="text-[11px] text-[#667085] font-medium">
                      (Naya observation bolein ya likhein)
                    </span>
                  </button>
                </div>

                {/* Inline "Achha, kya problem mili?" Input Panel */}
                {isCustomProblemOpen && (
                  <div className="p-4 bg-[#FEF3C7] border-2 border-[#D97706] rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-[#B45309] flex items-center gap-1.5">
                        <span>Achha, kya problem mili?</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomProblemOpen(false)}
                        className="text-xs font-bold text-[#667085] hover:text-[#172033] cursor-pointer"
                      >
                        ✕ Cancel
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={customProblemText}
                        onChange={e => setCustomProblemText(e.target.value)}
                        placeholder="Jaise: Battery connector loose hai, ya Wire cut hai, ya Coil burnt hai..."
                        className="w-full pl-3.5 pr-11 py-3 bg-white border border-[#D97706] rounded-xl text-xs font-bold text-[#172033] focus:outline-none"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSubmitCustomProblem();
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleToggleCustomMic}
                        title="Voice se bolein"
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors cursor-pointer ${
                          isRecordingCustomMic
                            ? 'bg-[#B91C1C] text-white animate-pulse'
                            : 'text-[#667085] hover:text-[#172033] hover:bg-[#FDE68A]'
                        }`}
                      >
                        {isRecordingCustomMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {[
                        'Battery connector loose hai',
                        'Wire cut / burnt hai',
                        'Carbon / Corrosion mila',
                        'Supply voltage nahi aa rahi',
                        'Physical part damage hai',
                      ].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            setCustomProblemText(chip);
                            handleSubmitCustomProblem(chip);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-[#FEF9C3] border border-[#D97706]/40 rounded-lg text-[#B45309] font-bold cursor-pointer transition-colors"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-[#FDE68A]">
                      <button
                        type="button"
                        disabled={!customProblemText.trim() || isAgentExecuting}
                        onClick={() => handleSubmitCustomProblem()}
                        className="px-5 py-2.5 bg-[#172033] hover:bg-[#25324B] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
                      >
                        {isAgentExecuting ? 'Replanning...' : 'Agent ko batao (Replan) →'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : repairState.status === 'verifying_repair' ? (
              <div className="pt-3 border-t-2 border-[#15803D] space-y-3">
                <span className="text-xs font-black text-[#15803D] uppercase tracking-wider block">
                  ✓ Operation Verification Check
                </span>
                <p className="text-base font-extrabold text-[#172033]">
                  Kya device ab theek chal raha hai? (Is the device working normally now?)
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleConfirmRepairStatus(true)}
                    className="py-4 px-4 bg-[#15803D] hover:bg-[#166534] text-white font-extrabold text-sm rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>Haan, repair complete</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmRepairStatus(false)}
                    className="py-4 px-4 bg-white hover:bg-[#FEF2F2] text-[#B91C1C] border-2 border-[#FECACA] font-extrabold text-sm rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-5 h-5" />
                    <span>Nahi, continue diagnosis</span>
                  </button>
                </div>
              </div>
            ) : (
              /* CONFIRM PROBLEM & OBSERVATION ACTIONS */
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#172033] uppercase tracking-wider block">
                    Problem confirm karo
                  </span>
                  <span className="text-[11px] text-[#667085]">
                    Technician confirmation required
                  </span>
                </div>

                {/* Primary Action Buttons: "Theek hai, problem mil gayi" vs "Problem kuch aur hai" */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Button 1: Theek hai, problem mil gayi / Han, yehi problem hai */}
                  <button
                    type="button"
                    disabled={isAgentExecuting}
                    onClick={handleConfirmProblem}
                    className="py-4 px-4 bg-[#15803D] hover:bg-[#166534] active:bg-[#14532D] text-white font-extrabold text-sm rounded-xl shadow-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <span>Theek hai, problem mil gayi</span>
                    </div>
                    <span className="text-[11px] text-emerald-100 font-medium">
                      (Han, yehi problem hai)
                    </span>
                  </button>

                  {/* Button 2: Problem kuch aur hai */}
                  <button
                    type="button"
                    disabled={isAgentExecuting}
                    onClick={() => setIsCustomProblemOpen(!isCustomProblemOpen)}
                    className={`py-4 px-4 font-extrabold text-sm rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-98 ${
                      isCustomProblemOpen
                        ? 'bg-[#FEF3C7] border-[#D97706] text-[#B45309]'
                        : 'bg-white hover:bg-[#F7F6F2] text-[#172033] border-[#E4E1D9] hover:border-[#172033]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-[#D97706]" />
                      <span>Problem kuch aur hai</span>
                    </div>
                    <span className="text-[11px] text-[#667085] font-medium">
                      (Apna observation likhein ya bolein)
                    </span>
                  </button>
                </div>

                {/* Inline "Achha, kya problem mili?" Input Panel */}
                {isCustomProblemOpen && (
                  <div className="p-4 bg-[#FEF3C7] border-2 border-[#D97706] rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-[#B45309] flex items-center gap-1.5">
                        <span>Achha, kya problem mili?</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomProblemOpen(false)}
                        className="text-xs font-bold text-[#667085] hover:text-[#172033] cursor-pointer"
                      >
                        ✕ Cancel
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={customProblemText}
                        onChange={e => setCustomProblemText(e.target.value)}
                        placeholder="Jaise: Battery connector loose hai, ya Wire cut hai, ya Coil burnt hai..."
                        className="w-full pl-3.5 pr-11 py-3 bg-white border border-[#D97706] rounded-xl text-xs font-bold text-[#172033] focus:outline-none"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSubmitCustomProblem();
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleToggleCustomMic}
                        title="Voice se bolein"
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors cursor-pointer ${
                          isRecordingCustomMic
                            ? 'bg-[#B91C1C] text-white animate-pulse'
                            : 'text-[#667085] hover:text-[#172033] hover:bg-[#FDE68A]'
                        }`}
                      >
                        {isRecordingCustomMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Quick suggestion chips */}
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {[
                        'Battery connector loose hai',
                        'Wire cut / burnt hai',
                        'Carbon / Corrosion mila',
                        'Supply voltage nahi aa rahi',
                        'Physical part damage hai',
                      ].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            setCustomProblemText(chip);
                            handleSubmitCustomProblem(chip);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-[#FEF9C3] border border-[#D97706]/40 rounded-lg text-[#B45309] font-bold cursor-pointer transition-colors"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-[#FDE68A]">
                      <button
                        type="button"
                        disabled={!customProblemText.trim() || isAgentExecuting}
                        onClick={() => handleSubmitCustomProblem()}
                        className="px-5 py-2.5 bg-[#172033] hover:bg-[#25324B] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
                      >
                        {isAgentExecuting ? 'Replanning...' : 'Agent ko batao (Replan) →'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Secondary Check Options: Normal or Not Sure */}
                <div className="pt-2 border-t border-[#E4E1D9] flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-[#667085]">
                    Agar yeh component theek lag raha hai:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isAgentExecuting}
                      onClick={() => handleObservation('normal')}
                      className="px-3 py-1.5 bg-white hover:bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg text-xs font-bold text-[#475467] hover:text-[#172033] cursor-pointer"
                    >
                      Sab theek hai (Normal)
                    </button>
                    <button
                      type="button"
                      disabled={isAgentExecuting}
                      onClick={() => handleObservation('not_sure')}
                      className="px-3 py-1.5 bg-[#F7F6F2] hover:bg-[#EBE8DF] border border-[#E4E1D9] rounded-lg text-xs font-bold text-[#667085] hover:text-[#172033] cursor-pointer"
                    >
                      Pata nahi (Help chahiye)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. REPAIR COMPLETE & CLOSE THE LOOP: CONFIRM → LEARN */}
      {/* ------------------------------------------------------------- */}
      {stage === 'complete' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-[#15803D] rounded-2xl p-6 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 bg-[#DCFCE7] text-[#15803D] rounded-full flex items-center justify-center mx-auto text-2xl font-black">
              ✓
            </div>

            <div>
              <span className="text-xs font-bold text-[#15803D] uppercase tracking-wider block mb-1">
                REPAIR RESOLVED & VERIFIED
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#172033]">
                Device Repair Ho Gaya!
              </h2>
              <p className="text-xs text-[#667085] mt-1 max-w-md mx-auto">
                Machine chal gayi aur verify ho gayi.
              </p>
            </div>

            {savedMemoryId ? (
              <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-xl text-left space-y-2">
                <span className="text-xs font-bold text-[#15803D] block">
                  ✓ Saved to Workshop Memory as {savedMemoryId}
                </span>
                <p className="text-xs text-[#172033]">
                  Yeh new memory ab agle repairs ke liye instantly searchable hai!
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  {onViewMemories && (
                    <button
                      type="button"
                      onClick={onViewMemories}
                      className="px-3 py-1.5 bg-[#172033] text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Purane repairs dekho
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-white border border-[#E4E1D9] text-[#172033] rounded-lg text-xs font-bold cursor-pointer"
                  >
                    + Naya Repair Shuru Karein
                  </button>
                </div>
              </div>
            ) : showSaveOffer && !showSaveForm ? (
              /* OFFER TO SAVE: "Is repair ko Jugaad Memory mein save karein?" */
              <div className="p-4 sm:p-5 bg-[#F7F6F2] border border-[#E4E1D9] rounded-2xl space-y-3 text-center">
                <span className="text-sm sm:text-base font-extrabold text-[#172033] block">
                  Is repair ko Jugaad Memory mein save karein?
                </span>
                <p className="text-xs text-[#667085] max-w-sm mx-auto">
                  Is repair ko save karne par agli baar similar problem aane par aapko aur doosre technicians ko yeh verified fix turant mil sakega.
                </p>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSaveForm(true)}
                    className="px-6 py-3 bg-[#15803D] hover:bg-[#166534] text-white font-extrabold text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Jugaad save karo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-5 py-3 bg-white hover:bg-[#EBE8DF] border border-[#E4E1D9] text-[#667085] hover:text-[#172033] font-bold text-sm rounded-xl transition-colors cursor-pointer"
                  >
                    <span>Abhi nahi</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Capture Final Verified Fix */
              <div className="space-y-4 text-left pt-2 border-t border-[#E4E1D9]">
                <div>
                  <label className="text-xs font-bold text-[#667085] uppercase tracking-wider block mb-2">
                    What actually fixed the problem? (Samadhan kya tha?)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {['Blockage', 'Loose pin / wiring', 'Damaged part', 'Component cleaned'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFinalFixCategory(cat)}
                        className={`p-2 text-xs rounded-lg border font-bold text-center transition-colors cursor-pointer ${
                          finalFixCategory === cat
                            ? 'border-[#D97706] bg-[#FEF3C7] text-[#172033]'
                            : 'border-[#E4E1D9] bg-[#F7F6F2] text-[#667085] hover:bg-[#EBE8DF]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    value={finalFixText}
                    onChange={e => setFinalFixText(e.target.value)}
                    placeholder="e.g. Battery replace ki aur phone on ho gaya, ya Inlet filter mesh acid wash se saaf kiya."
                    className="w-full p-3 bg-[#F7F6F2] border border-[#E4E1D9] rounded-xl text-xs font-semibold text-[#172033]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSaveForm(false)}
                    className="px-4 py-3 bg-white hover:bg-[#F7F6F2] border border-[#E4E1D9] text-[#667085] rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Abhi nahi
                  </button>

                  <button
                    type="button"
                    disabled={isSavingMemory}
                    onClick={handleSaveFinalOutcome}
                    className="flex-1 py-4 bg-[#172033] hover:bg-[#25324B] text-white font-black text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Save className="w-4 h-4 text-[#F59E0B]" />
                    <span>{isSavingMemory ? 'Saving Memory...' : 'Repair save karo'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Memory Details Modal */}
      <MemoryDetailModal
        memory={selectedInspectMemory}
        onClose={() => setSelectedInspectMemory(null)}
      />
    </div>
  );
};
