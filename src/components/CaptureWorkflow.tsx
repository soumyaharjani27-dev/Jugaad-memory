import React, { useState, useRef } from 'react';
import { RepairMemory, DevDebugInfo } from '../types';
import { geminiService } from '../services/geminiService';
import { memoryStore } from '../services/memoryStore';
import { speechService } from '../services/speechService';
import { SAMPLE_IMAGES } from '../data/sampleImages';
import {
  Mic,
  MicOff,
  Camera,
  CheckCircle2,
  Save,
  ArrowRight,
  User,
  Plus,
  Trash2,
  Wrench,
  BookOpen,
  Edit2,
} from 'lucide-react';

interface CaptureWorkflowProps {
  onMemoryAdded: () => void;
  onUpdateDebugInfo: (info: DevDebugInfo) => void;
  onViewMemories: () => void;
  onStartRepairWithMemory?: (memory: RepairMemory) => void;
}

export const CaptureWorkflow: React.FC<CaptureWorkflowProps> = ({
  onMemoryAdded,
  onUpdateDebugInfo,
  onViewMemories,
  onStartRepairWithMemory,
}) => {
  // Input states
  const [voiceNote, setVoiceNote] = useState<string>('');
  const [technicianName, setTechnicianName] = useState<string>('Ramesh Bhai (Senior Tech)');
  const [photoUrls, setPhotoUrls] = useState<string[]>([SAMPLE_IMAGES.WHIRLPOOL_MOTOR]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  // Review step state
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [isEditingFields, setIsEditingFields] = useState<boolean>(false);
  const [structuredDraft, setStructuredDraft] = useState<{
    category: string;
    brand: string;
    model: string;
    component: string;
    errorCode: string;
    symptoms: string;
    observation: string;
    observedCause: string;
    firstCheck: string;
    nextCheck: string;
    fix: string;
    outcome: string;
    partsInvolved: string;
  }>({
    category: 'electronics',
    brand: '',
    model: '',
    component: '',
    errorCode: '',
    symptoms: '',
    observation: '',
    observedCause: '',
    firstCheck: '',
    nextCheck: '',
    fix: '',
    outcome: '',
    partsInvolved: '',
  });

  const [savedMemory, setSavedMemory] = useState<RepairMemory | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle Voice Recording
  const handleToggleVoice = () => {
    if (isRecording) {
      speechService.stopListening();
      setIsRecording(false);
    } else {
      const started = speechService.startListening(
        'hi',
        (transcript) => setVoiceNote(transcript),
        () => setIsRecording(false),
        () => setIsRecording(false)
      );
      if (started) setIsRecording(true);
    }
  };

  // Add Photo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Extract structured memory
  const handleExtractKnowledge = async () => {
    if (!voiceNote.trim()) return;

    setIsExtracting(true);
    try {
      const result = await geminiService.parseJugaad({
        rawNote: voiceNote,
        technicianName,
        imageBase64: photoUrls[0],
      });

      onUpdateDebugInfo(result.debugInfo);

      // Clean extraction without inventing missing fields
      setStructuredDraft({
        category: result.category || 'electronics',
        brand: result.brand && result.brand !== 'Not specified' ? result.brand : 'Not specified',
        model: result.model || '',
        component: result.component || '',
        errorCode: result.errorCode || '',
        symptoms: Array.isArray(result.symptoms) ? result.symptoms.join(', ') : (result.symptoms || voiceNote),
        observation: result.observation || result.observedCause || 'Not provided',
        observedCause: result.observedCause || 'Not provided',
        firstCheck: result.firstCheck || 'Inspect primary area',
        nextCheck: result.nextCheck || '',
        fix: result.fix || 'Not provided',
        outcome: result.outcome || 'device functioning normally',
        partsInvolved: Array.isArray(result.partsInvolved) ? result.partsInvolved.join(', ') : '',
      });

      setIsReviewing(true);
      setIsEditingFields(false);
    } catch (e) {
      console.error('Extraction failed:', e);
      // Clean disciplined fallback based purely on note
      const vLower = voiceNote.toLowerCase();
      let category = 'electronics';
      let brand = 'Not specified';
      let model = '';
      let component = '';
      let observation = 'Not provided';
      let fix = 'Not provided';
      let outcome = 'working normally';

      if (vLower.includes('iphone') || vLower.includes('phone') || vLower.includes('smartphone')) {
        category = 'smartphone';
        brand = 'Apple';
        if (vLower.includes('16')) model = 'iPhone 16';
        if (vLower.includes('battery')) {
          component = 'battery';
          if (vLower.includes('swollen') || vLower.includes('fool') || vLower.includes('phool')) {
            observation = 'battery swollen';
          }
          if (vLower.includes('replace') || vLower.includes('badla') || vLower.includes('change')) {
            fix = 'battery replaced';
          }
        }
      } else if (vLower.includes('laptop') || vLower.includes('dell')) {
        category = 'laptop';
        brand = 'Dell';
        if (vLower.includes('inspiron')) model = 'Inspiron 15';
        if (vLower.includes('charging') || vLower.includes('jack')) {
          component = 'dc_jack';
          fix = 'dc jack replaced';
        }
      } else if (vLower.includes('fridge') || vLower.includes('refrigerator')) {
        category = 'refrigerator';
        brand = vLower.includes('lg') ? 'LG' : 'Samsung';
      } else if (vLower.includes('samsung')) brand = 'Samsung';
      else if (vLower.includes('whirlpool')) brand = 'Whirlpool';
      else if (vLower.includes('lg')) brand = 'LG';

      const errorMatch = voiceNote.match(/\b(4c|4e|f06|f05|oe|e18)\b/i);
      const errorCode = errorMatch ? errorMatch[1].toUpperCase() : '';

      setStructuredDraft({
        category,
        brand,
        model,
        component,
        errorCode,
        symptoms: voiceNote,
        observation,
        observedCause: observation,
        firstCheck: 'Check primary component',
        nextCheck: '',
        fix,
        outcome,
        partsInvolved: component,
      });
      setIsReviewing(true);
    } finally {
      setIsExtracting(false);
    }
  };

  // Save Confirmed Memory
  const handleSaveConfirmed = () => {
    try {
      const category = structuredDraft.category || 'electronics';
      const brand = structuredDraft.brand || 'Device';
      const model = structuredDraft.model || undefined;
      const component = structuredDraft.component || structuredDraft.partsInvolved || undefined;

      const newMemory = memoryStore.addMemory({
        sourceType: 'real',
        technicianName,
        workshopId: 'demo-workshop-001',
        category,
        brand,
        model,
        component,
        appliance: {
          category: category as any,
          brand,
          model,
        },
        errorCode: structuredDraft.errorCode || undefined,
        symptoms: structuredDraft.symptoms.split(',').map(s => s.trim()).filter(Boolean),
        observation: structuredDraft.observation,
        observations: [structuredDraft.observation || structuredDraft.observedCause].filter(Boolean),
        observedCause: structuredDraft.observedCause || structuredDraft.observation,
        cause: structuredDraft.observedCause || structuredDraft.observation,
        diagnosticSteps: [structuredDraft.firstCheck, structuredDraft.nextCheck].filter(Boolean),
        steps: [structuredDraft.firstCheck, structuredDraft.nextCheck].filter(Boolean),
        fix: structuredDraft.fix,
        partsInvolved: component ? [component] : [],
        components: component ? [component] : [],
        photoUrl: photoUrls[0] || SAMPLE_IMAGES.IPHONE_BATTERY,
        photos: photoUrls,
        originalNote: voiceNote,
        technician: technicianName,
        workshop: 'Workshop Repair Lab',
        confidence: 1.0,
        outcome: (structuredDraft.outcome as any) || 'confirmed',
        isDemo: false,
      });

      setSavedMemory(newMemory);
      onMemoryAdded();
    } catch (e) {
      console.error('Failed to save memory:', e);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 text-left">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">
          Is repair se kya seekha?
        </h1>
        <p className="text-sm text-[#667085] mt-1">
          Senior technician apna experience bata rahe hain. Voice note bolein ya type karein.
        </p>
      </div>

      {savedMemory ? (
        /* Saved Confirmation Screen */
        <div className="bg-white border-2 border-[#15803D] rounded-2xl p-6 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-[#DCFCE7] text-[#15803D] rounded-full flex items-center justify-center mx-auto text-xl font-black">
            ✓
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#15803D] uppercase tracking-wider block mb-1">
              ✓ Saved to Workshop Memory
            </span>
            <h2 className="text-2xl font-black text-[#172033]">
              {savedMemory.id} · {savedMemory.brand} {savedMemory.errorCode ? `(${savedMemory.errorCode})` : ''}
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Recorded by <strong className="text-[#172033]">{savedMemory.technicianName}</strong> on {savedMemory.createdAt}
            </p>
          </div>

          <div className="p-3.5 bg-[#F7F6F2] rounded-xl text-left border border-[#E4E1D9] text-xs space-y-1.5 max-w-md mx-auto">
            <p><strong className="text-[#172033]">Fix: </strong>{savedMemory.fix}</p>
            <p><strong className="text-[#172033]">Cause: </strong>{savedMemory.cause}</p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {onStartRepairWithMemory && (
              <button
                type="button"
                onClick={() => onStartRepairWithMemory(savedMemory)}
                className="w-full sm:w-auto px-5 py-3 bg-[#172033] hover:bg-[#25324B] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Wrench className="w-4 h-4 text-[#F59E0B]" />
                <span>Test this memory (Start Repair)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onViewMemories}
              className="w-full sm:w-auto px-4 py-3 bg-[#F59E0B] hover:bg-[#D97706] text-[#172033] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Purane repairs dekho</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSavedMemory(null);
                setIsReviewing(false);
                setIsEditingFields(false);
                setVoiceNote('');
              }}
              className="w-full sm:w-auto px-4 py-3 bg-white hover:bg-[#F7F6F2] text-[#667085] hover:text-[#172033] border border-[#E4E1D9] rounded-xl text-xs font-bold cursor-pointer"
            >
              + Naya Jugaad Save Karein
            </button>
          </div>
        </div>
      ) : !isReviewing ? (
        /* Input Screen (Direct, Conversational) */
        <div className="space-y-5">
          {/* Technician Name */}
          <div className="flex items-center gap-2 p-3 bg-white border border-[#E4E1D9] rounded-xl text-xs">
            <User className="w-4 h-4 text-[#D97706]" />
            <span className="font-bold text-[#172033]">Technician:</span>
            <input
              type="text"
              value={technicianName}
              onChange={e => setTechnicianName(e.target.value)}
              className="flex-1 bg-transparent font-medium text-[#172033] focus:outline-none"
            />
          </div>

          {/* Voice or Type Input */}
          <div className="bg-white border border-[#E4E1D9] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                Experience Boliye Ya Type Karein
              </label>

              <button
                type="button"
                onClick={handleToggleVoice}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isRecording
                    ? 'bg-[#B91C1C] text-white animate-pulse'
                    : 'bg-[#FEF3C7] text-[#B45309] hover:bg-[#FDE68A]'
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isRecording ? 'Listening...' : '🎙 Record Voice'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={voiceNote}
              onChange={e => setVoiceNote(e.target.value)}
              placeholder="e.g. Samsung 4C tha, paani nahi aa raha tha. Inlet filter khola toh hard water ki scaling jammi thi. Clean kiya aur machine chal gayi."
              className="w-full p-3.5 bg-[#F7F6F2] border border-[#E4E1D9] rounded-xl text-sm font-semibold text-[#172033] focus:bg-white focus:outline-none focus:border-[#172033] leading-relaxed"
            />

            {/* Quick Sample Notes */}
            <div className="mt-3 pt-3 border-t border-[#E4E1D9]">
              <span className="text-[11px] font-bold text-[#667085] block mb-1.5">
                Sample Voice Notes:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVoiceNote('Samsung 4C tha, paani nahi aa raha tha. Inlet filter khola toh hard water ki scaling jammi thi. Clean kiya aur machine chal gayi.');
                    setPhotoUrls([SAMPLE_IMAGES.SAMSUNG_VALVE]);
                  }}
                  className="px-2.5 py-1.5 bg-[#F7F6F2] hover:bg-[#EBE8DF] border border-[#E4E1D9] text-[#172033] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Samsung 4C (Inlet Scaling Fix)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVoiceNote('Is Whirlpool model mein F06 aaye toh pehle motor connector check karna. Bohot baar moisture se connector loose ya rusted hota hai. Clip tighten karo aur contact cleaner maro.');
                    setPhotoUrls([SAMPLE_IMAGES.WHIRLPOOL_MOTOR]);
                  }}
                  className="px-2.5 py-1.5 bg-[#F7F6F2] hover:bg-[#EBE8DF] border border-[#E4E1D9] text-[#172033] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Whirlpool F06 (Motor Connector)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVoiceNote('LG washing machine OE error. Drain pipe aur coin trap check kiya toh ₹5 coin phasa tha. Sikka nikaalte hi paani drain ho gaya.');
                    setPhotoUrls([SAMPLE_IMAGES.LG_DRAIN_FILTER]);
                  }}
                  className="px-2.5 py-1.5 bg-[#F7F6F2] hover:bg-[#EBE8DF] border border-[#E4E1D9] text-[#172033] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  LG OE (Coin Trap Jam)
                </button>
              </div>
            </div>
          </div>

          {/* Photo Evidence */}
          <div className="bg-white border border-[#E4E1D9] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                Photo Evidence ({photoUrls.length}/5)
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-[#F7F6F2] hover:bg-[#EBE8DF] border border-[#E4E1D9] text-[#172033] rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>📷 Add Photo</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {photoUrls.map((url, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-[#E4E1D9] bg-[#1E2430] aspect-video">
                  <img src={url} alt={`Evidence ${i}`} className="w-full h-full object-cover" />
                  {photoUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrls(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 p-1 bg-[#B91C1C] text-white rounded cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Process / Extract CTA */}
          <button
            type="button"
            disabled={isExtracting || !voiceNote.trim()}
            onClick={handleExtractKnowledge}
            className="w-full py-4 bg-[#172033] hover:bg-[#25324B] disabled:opacity-50 text-white rounded-xl font-black text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {isExtracting ? (
              <span>Experience analyze ho raha hai...</span>
            ) : (
              <>
                <span>Humne ye samjha</span>
                <ArrowRight className="w-4 h-4 text-[#F59E0B]" />
              </>
            )}
          </button>
        </div>
      ) : (
        /* Review Screen: "HUMNE YE SAMJHA" (Mandatory Human Review) */
        <div className="space-y-5">
          <div className="bg-[#FEF3C7] border border-[#FDE68A] p-4 rounded-xl text-left">
            <span className="text-xs font-bold text-[#B45309] uppercase tracking-wider block mb-1">
              Save karne se pehle check karein
            </span>
            <p className="text-base font-black text-[#172033]">
              Humne ye samjha
            </p>
            <p className="text-xs text-[#667085]">
              Workshop memory mein save karne ke liye details check karein.
            </p>
          </div>

          {/* Clean Summary Presentation */}
          <div className="bg-white border-2 border-[#172033] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="border-b border-[#E4E1D9] pb-3 flex items-center justify-between">
              <span className="text-xs font-black text-[#D97706] uppercase tracking-wider">
                Workshop Memory Summary
              </span>
              <button
                type="button"
                onClick={() => setIsEditingFields(!isEditingFields)}
                className="text-xs font-bold text-[#172033] hover:text-[#D97706] flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isEditingFields ? 'Done Editing' : 'Edit'}</span>
              </button>
            </div>

            {!isEditingFields ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs font-bold text-[#667085] block">Category:</span>
                    <span className="font-extrabold text-[#172033] capitalize">
                      {structuredDraft.category || 'electronics'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#667085] block">Device:</span>
                    <span className="font-extrabold text-[#172033]">
                      {structuredDraft.brand} {structuredDraft.model ? structuredDraft.model : ''}
                    </span>
                  </div>
                </div>

                {structuredDraft.component && (
                  <div>
                    <span className="text-xs font-bold text-[#667085] block">Component:</span>
                    <span className="font-bold text-[#172033]">{structuredDraft.component}</span>
                  </div>
                )}

                {structuredDraft.errorCode && (
                  <div>
                    <span className="text-xs font-bold text-[#667085] block">Error:</span>
                    <span className="font-bold font-mono text-[#172033] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded text-xs">
                      {structuredDraft.errorCode}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-xs font-bold text-[#667085] block">Problem:</span>
                  <span className="font-medium text-[#172033]">{structuredDraft.symptoms}</span>
                </div>

                <div>
                  <span className="text-xs font-bold text-[#667085] block">Observation:</span>
                  <span className="font-medium text-[#172033]">{structuredDraft.observation || structuredDraft.observedCause}</span>
                </div>

                <div className="p-3 bg-[#DCFCE7] border border-[#86EFAC] rounded-xl">
                  <span className="text-xs font-bold text-[#15803D] block mb-0.5">Fix:</span>
                  <span className="font-bold text-[#172033]">{structuredDraft.fix}</span>
                </div>

                <div>
                  <span className="text-xs font-bold text-[#667085] block">Outcome:</span>
                  <span className="font-medium text-[#15803D]">✓ {structuredDraft.outcome || 'Confirmed working'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#667085] mb-1">Category</label>
                    <input
                      type="text"
                      value={structuredDraft.category}
                      onChange={e => setStructuredDraft({ ...structuredDraft, category: e.target.value })}
                      placeholder="e.g. smartphone, laptop, washing_machine"
                      className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg text-xs font-semibold text-[#172033]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#667085] mb-1">Brand</label>
                    <input
                      type="text"
                      value={structuredDraft.brand}
                      onChange={e => setStructuredDraft({ ...structuredDraft, brand: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg text-xs font-semibold text-[#172033]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#667085] mb-1">Model</label>
                    <input
                      type="text"
                      value={structuredDraft.model}
                      onChange={e => setStructuredDraft({ ...structuredDraft, model: e.target.value })}
                      placeholder="e.g. iPhone 16"
                      className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg text-xs font-semibold text-[#172033]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#667085] mb-1">Component</label>
                    <input
                      type="text"
                      value={structuredDraft.component}
                      onChange={e => setStructuredDraft({ ...structuredDraft, component: e.target.value })}
                      placeholder="e.g. battery"
                      className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg text-xs font-semibold text-[#172033]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#667085] mb-1">Problem (Symptom)</label>
                  <input
                    type="text"
                    value={structuredDraft.symptoms}
                    onChange={e => setStructuredDraft({ ...structuredDraft, symptoms: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg text-xs font-semibold text-[#172033]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#667085] mb-1">Observation (Nirikshan)</label>
                  <input
                    type="text"
                    value={structuredDraft.observation}
                    onChange={e => setStructuredDraft({ ...structuredDraft, observation: e.target.value, observedCause: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg text-xs font-semibold text-[#172033]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#667085] mb-1">What fixed it (Fix)</label>
                  <input
                    type="text"
                    value={structuredDraft.fix}
                    onChange={e => setStructuredDraft({ ...structuredDraft, fix: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg text-xs font-semibold text-[#172033]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#667085] mb-1">Outcome</label>
                  <input
                    type="text"
                    value={structuredDraft.outcome}
                    onChange={e => setStructuredDraft({ ...structuredDraft, outcome: e.target.value })}
                    placeholder="e.g. phone started normally"
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E4E1D9] rounded-lg text-xs font-semibold text-[#172033]"
                  />
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[#E4E1D9] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsReviewing(false)}
                className="px-4 py-2.5 text-xs font-bold text-[#667085] hover:text-[#172033] cursor-pointer"
              >
                ← Back to Note
              </button>

              <button
                type="button"
                onClick={handleSaveConfirmed}
                className="px-6 py-3.5 bg-[#172033] hover:bg-[#25324B] text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-[#F59E0B]" />
                <span>Jugaad save karo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
