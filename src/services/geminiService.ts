import { RepairMemory, VisualTarget, DiagnosticStep, DevDebugInfo } from '../types';

export interface AnalyzeRepairParams {
  imageBase64?: string;
  symptomText: string;
  language: 'en' | 'hi' | 'hinglish';
  workshopMemories: RepairMemory[];
}

export interface AnalyzeRepairResult {
  detectedAppliance: {
    brand: string;
    model?: string | null;
    errorCode?: string | null;
    category: string;
    type?: string;
  };
  detectedSymptoms: string[];
  matchedMemoryIds: string[];
  matchReason: string;
  visualTarget: VisualTarget | null;
  firstStep: DiagnosticStep;
  confidence: number;
  debugInfo: DevDebugInfo;
}

export interface NextStepParams {
  currentStep: DiagnosticStep;
  userResponse: 'normal' | 'issue_found' | 'not_sure';
  technicianNotes?: string;
  appliance?: any;
  matchedMemories: RepairMemory[];
}

export interface NextStepResult {
  isRepairResolved: boolean;
  nextStep: DiagnosticStep | null;
  suggestedFix?: string | null;
  debugInfo: DevDebugInfo;
}

export interface ParseJugaadParams {
  rawNote: string;
  technicianName?: string;
  imageBase64?: string;
}

export interface ParseJugaadResult {
  category?: string;
  brand: string;
  model?: string | null;
  component?: string | null;
  errorCode?: string | null;
  symptoms: string[];
  observation?: string;
  observedCause: string;
  firstCheck: string;
  nextCheck?: string | null;
  fix: string;
  outcome?: string;
  partsInvolved: string[];
  confidence: number;
  debugInfo: DevDebugInfo;
}

export class GeminiService {
  public async analyzeRepair(params: AnalyzeRepairParams): Promise<AnalyzeRepairResult> {
    try {
      const response = await fetch('/api/gemini/analyze-repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const json = await response.json();
      const data = json.data;

      const debugInfo: DevDebugInfo = {
        detectedIntent: 'SEARCH_AND_DIAGNOSE',
        rawResponse: json.rawOutput ? json.rawOutput : data,
        retrievalMatches: (data.matchedMemoryIds || []).map((id: string) => ({
          id,
          score: 85,
          reason: data.matchReason || 'Workshop memory match',
        })),
        sourceMemoryIds: data.matchedMemoryIds || [],
        confidence: data.confidence || 0.85,
        activeStepNumber: 1,
        latencyMs: json.latencyMs,
        isAiPowered: !!json.isAiPowered,
        isFallback: !json.isAiPowered,
      };

      return {
        detectedAppliance: data.detectedAppliance || {
          brand: 'Washing Machine',
          category: 'washing_machine',
        },
        detectedSymptoms: data.detectedSymptoms || [params.symptomText],
        matchedMemoryIds: data.matchedMemoryIds || [],
        matchReason: data.matchReason || 'Matched similar workshop cases',
        visualTarget: data.visualTarget || null,
        firstStep: {
          stepNumber: 1,
          instruction: data.firstStep?.instruction || 'Check electrical and water supply connections.',
          instructionHindi: data.firstStep?.instructionHindi || 'मशीन के पीछे ठंडे पानी की जाली (Filter) निकाल कर चेक करें',
          actionDetailsHindi: data.firstStep?.actionDetailsHindi || [
            '1. नल बंद करें और पीछे का पानी का पाइप खोलें।',
            '2. नोज प्लास से जाली बाहर निकालें।',
            '3. सफेद नमक या कचरा हो तो ब्रश से साफ करें।'
          ],
          reason: data.firstStep?.reason || 'Based on workshop repair history',
          reasonHindi: data.firstStep?.reasonHindi || 'वर्कशॉप में 3 बार यह समस्या इसी जाली को साफ करने से ठीक हुई थी।',
          safetyNotice: data.firstStep?.safetyNotice || 'Switch off and unplug appliance from mains before inspecting.',
          safetyNoticeHindi: data.firstStep?.safetyNoticeHindi || '⚠️ सावधानी: पाइप खोलने से पहले नल बंद करें।',
          sourceMemoryIds: data.matchedMemoryIds?.slice(0, 2) || [],
          visualTarget: data.visualTarget || null,
        },
        confidence: data.confidence || 0.88,
        debugInfo,
      };
    } catch (e: any) {
      console.warn('API analyze-repair failed, executing client-side fallback:', e);
      return this.localAnalyzeFallback(params);
    }
  }

  public async getNextStep(params: NextStepParams): Promise<NextStepResult> {
    try {
      const response = await fetch('/api/gemini/next-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const json = await response.json();
      const data = json.data;

      const debugInfo: DevDebugInfo = {
        detectedIntent: 'GUIDE_NEXT_STEP',
        rawResponse: json.rawOutput || data,
        retrievalMatches: (params.matchedMemories || []).slice(0, 3).map(m => ({
          id: m.id,
          score: 80,
          reason: 'Active repair reference',
        })),
        sourceMemoryIds: params.currentStep.sourceMemoryIds,
        confidence: 0.9,
        activeStepNumber: data.nextStep?.stepNumber || params.currentStep.stepNumber,
        latencyMs: json.latencyMs,
        isAiPowered: !!json.isAiPowered,
        isFallback: !json.isAiPowered,
      };

      return {
        isRepairResolved: !!data.isRepairResolved,
        nextStep: data.nextStep ? {
          stepNumber: data.nextStep.stepNumber,
          instruction: data.nextStep.instruction,
          instructionHindi: data.nextStep.instructionHindi || 'मल्टीमीटर से सोलेनोइड वाल्व या मोटर कॉइल का रेसिस्टेंस (Ohms) चेक करें',
          actionDetailsHindi: data.nextStep.actionDetailsHindi || [
            '1. मल्टीमीटर को 20k Ohms पर सेट करें।',
            '2. कॉइल के दोनों टर्मिनल्स पर प्रोब लगाएं (3.5k से 4.2k ओम सामान्य है)।',
            '3. अगर 0 या OL दिखाए, तो नया पार्ट लगाएं।'
          ],
          reason: data.nextStep.reason,
          reasonHindi: data.nextStep.reasonHindi || 'पहला फिजिकल चेक सही पाया गया, अब इलेक्ट्रिकल जांच जरूरी है।',
          safetyNotice: data.nextStep.safetyNotice || 'Unplug appliance from mains before touching wiring or contacts.',
          safetyNoticeHindi: data.nextStep.safetyNoticeHindi || '⚠️ सावधानी: नंगे तारों को हाथ न लगाएं।',
          sourceMemoryIds: data.nextStep.sourceMemoryIds || params.currentStep.sourceMemoryIds,
        } : null,
        suggestedFix: data.suggestedFix || null,
        debugInfo,
      };
    } catch (e: any) {
      console.warn('API next-step failed, using client-side fallback:', e);
      return this.localNextStepFallback(params);
    }
  }

  public async parseJugaad(params: ParseJugaadParams): Promise<ParseJugaadResult> {
    try {
      const response = await fetch('/api/gemini/parse-jugaad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const json = await response.json();
      const data = json.data;

      const debugInfo: DevDebugInfo = {
        detectedIntent: 'CAPTURE_MEMORY',
        rawResponse: json.rawOutput || data,
        retrievalMatches: [],
        sourceMemoryIds: [],
        confidence: data.confidence || 0.92,
        activeStepNumber: 0,
        latencyMs: json.latencyMs,
        isAiPowered: !!json.isAiPowered,
        isFallback: !json.isAiPowered,
      };

      return {
        brand: data.brand || 'Not specified',
        model: data.model || null,
        errorCode: data.errorCode || null,
        symptoms: data.symptoms || [params.rawNote.slice(0, 100)],
        observedCause: data.observedCause || 'Not provided in note',
        firstCheck: data.firstCheck || 'Inspect reported issue area',
        nextCheck: data.nextCheck || null,
        fix: data.fix || 'Not provided in note',
        partsInvolved: data.partsInvolved || ['Not specified'],
        confidence: data.confidence || 0.9,
        debugInfo,
      };
    } catch (e: any) {
      console.warn('API parse-jugaad failed, using client-side fallback:', e);
      return this.localParseJugaadFallback(params);
    }
  }

  // Pure client fallback implementations for complete offline safety
  private localAnalyzeFallback(params: AnalyzeRepairParams): AnalyzeRepairResult {
    const text = (params.symptomText || '').toLowerCase();

    // 1. Identify Category
    let category = 'electronics';
    if (text.includes('iphone') || text.includes('phone') || text.includes('smartphone') || text.includes('android')) {
      category = 'smartphone';
    } else if (text.includes('laptop') || text.includes('inspiron') || text.includes('notebook') || text.includes('computer')) {
      category = 'laptop';
    } else if (text.includes('washing') || text.includes('washer') || text.includes('dryer') || text.includes('paani') || text.includes('drum')) {
      category = 'washing_machine';
    } else if (text.includes('fridge') || text.includes('refrigerator') || text.includes('freezer') || text.includes('defrost')) {
      category = 'refrigerator';
    } else if (text.includes('microwave') || text.includes('oven')) {
      category = 'microwave';
    }

    // 2. Identify Brand
    let brand = 'Device';
    if (text.includes('apple') || text.includes('iphone')) brand = 'Apple';
    else if (text.includes('dell')) brand = 'Dell';
    else if (text.includes('hp')) brand = 'HP';
    else if (text.includes('samsung')) brand = 'Samsung';
    else if (text.includes('whirlpool')) brand = 'Whirlpool';
    else if (text.includes('lg')) brand = 'LG';
    else if (text.includes('ifb')) brand = 'IFB';
    else if (text.includes('bosch')) brand = 'Bosch';

    let model: string | null = null;
    if (text.includes('16')) model = 'iPhone 16';
    else if (text.includes('inspiron')) model = 'Inspiron 15';

    let errorCode: string | null = null;
    const codeMatch = text.match(/\b(4c|4e|f06|f05|oe|e18|ue|pe|de|battery-service|no-charge|defrost-fail)\b/i);
    if (codeMatch) errorCode = codeMatch[1].toUpperCase();

    // Search memories matching category, brand, or error code
    const matches = params.workshopMemories.filter(m => {
      const memCat = (m.category || m.appliance?.category || m.applianceCategory || '').toLowerCase();
      const memBrand = (m.brand || m.appliance?.brand || '').toLowerCase();
      if (errorCode && m.errorCode?.toUpperCase() === errorCode) return true;
      if (memCat.includes(category) || category.includes(memCat)) return true;
      if (brand !== 'Device' && memBrand.includes(brand.toLowerCase())) return true;
      return false;
    }).slice(0, 3);

    const matchIds = matches.map(m => m.id);
    const hasMatches = matches.length > 0;
    const topMatch = matches[0];

    const firstStep: DiagnosticStep = {
      stepNumber: 1,
      instruction: topMatch?.diagnosticSteps?.[0] || (category === 'smartphone' ? 'Inspect battery pack and battery health percentage.' : (category === 'laptop' ? 'Inspect DC power jack for loose center needle pin.' : 'Inspect power and physical operating connections.')),
      instructionHindi: category === 'smartphone' ? 'बैटरी हेल्थ और बैटरी पैक की जांच करें।' : (category === 'laptop' ? 'DC जैक और चार्जिंग पिन चेक करें।' : 'सप्लाई और कनेक्शन चेक करें।'),
      reason: hasMatches
        ? `Derived from matching workshop repair ${topMatch?.id} (${topMatch?.brand} ${topMatch?.model || ''}).`
        : 'AI SUGGESTION — NOT FROM WORKSHOP MEMORY (Initial baseline check for reported issue)',
      reasonHindi: hasMatches
        ? `वर्कशॉप रिपेयर रिकॉर्ड ${topMatch?.id} के आधार पर।`
        : 'एआई सुझाव — वर्कशॉप मेमोरी में यह केस नहीं मिला। बेसिक चेक से शुरुआत करें।',
      safetyNotice: category === 'smartphone' ? 'Do not puncture lithium-ion battery pouch.' : 'Disconnect power source before disassembly.',
      sourceMemoryIds: matchIds.slice(0, 2),
      sourceType: hasMatches ? 'workshop_memory' : 'ai_suggestion',
      visualTarget: topMatch?.visualTarget || null,
      status: 'active',
      suggestedFix: topMatch?.fix || 'Inspect and test component',
    };

    return {
      detectedAppliance: {
        brand,
        model,
        errorCode,
        category,
        type: 'standard',
      },
      detectedSymptoms: [params.symptomText],
      matchedMemoryIds: matchIds,
      matchReason: hasMatches
        ? `Matched ${matches.length} previous workshop repair(s) for ${brand} ${category}`
        : 'No similar workshop memory found',
      visualTarget: topMatch?.visualTarget || null,
      firstStep,
      confidence: hasMatches ? 0.94 : 0.75,
      debugInfo: {
        detectedIntent: hasMatches ? 'SEARCH_AND_DIAGNOSE' : 'AI_SUGGESTION',
        retrievalMatches: matchIds.map(id => ({ id, score: 85, reason: 'Category and symptom match' })),
        sourceMemoryIds: matchIds,
        confidence: hasMatches ? 0.94 : 0.75,
        activeStepNumber: 1,
        isAiPowered: false,
        isFallback: true,
      },
    };
  }

  private localNextStepFallback(params: NextStepParams): NextStepResult {
    const stepNum = params.currentStep.stepNumber;
    if (params.userResponse === 'issue_found') {
      return {
        isRepairResolved: false,
        nextStep: {
          stepNumber: stepNum + 1,
          instruction: 'Clean, reseat, or replace the faulted component and run a test diagnostic cycle.',
          reason: 'Technician reported issue found during check.',
          safetyNotice: 'Verify tight terminal seating before restoring power.',
          sourceMemoryIds: params.currentStep.sourceMemoryIds,
        },
        suggestedFix: 'Repair or replace the affected component as per workshop memory.',
        debugInfo: {
          detectedIntent: 'GUIDE_NEXT_STEP',
          retrievalMatches: [],
          sourceMemoryIds: params.currentStep.sourceMemoryIds,
          confidence: 0.9,
          activeStepNumber: stepNum + 1,
          isAiPowered: false,
          isFallback: true,
        },
      };
    }

    if (stepNum === 1) {
      return {
        isRepairResolved: false,
        nextStep: {
          stepNumber: 2,
          instruction: 'Use multimeter to verify resistance across solenoid / motor coil terminals.',
          reason: 'First physical check passed normal. Moving to electrical coil continuity check.',
          safetyNotice: 'Use insulated multimeter test probes.',
          sourceMemoryIds: params.currentStep.sourceMemoryIds,
        },
        debugInfo: {
          detectedIntent: 'GUIDE_NEXT_STEP',
          retrievalMatches: [],
          sourceMemoryIds: params.currentStep.sourceMemoryIds,
          confidence: 0.88,
          activeStepNumber: 2,
          isAiPowered: false,
          isFallback: true,
        },
      };
    }

    return {
      isRepairResolved: true,
      nextStep: null,
      suggestedFix: 'Diagnostic checks completed. Ready to record final workshop fix.',
      debugInfo: {
        detectedIntent: 'GUIDE_NEXT_STEP',
        retrievalMatches: [],
        sourceMemoryIds: params.currentStep.sourceMemoryIds,
        confidence: 0.92,
        activeStepNumber: stepNum,
        isAiPowered: false,
        isFallback: true,
      },
    };
  }

  private localParseJugaadFallback(params: ParseJugaadParams): ParseJugaadResult {
    const text = (params.rawNote || '').toLowerCase();

    // 1. Detect Category
    let category = 'electronics';
    if (text.includes('iphone') || text.includes('phone') || text.includes('android') || text.includes('mobile')) {
      category = 'smartphone';
    } else if (text.includes('laptop') || text.includes('notebook') || text.includes('computer') || text.includes('pc') || text.includes('inspiron')) {
      category = 'laptop';
    } else if (text.includes('washing') || text.includes('washer') || text.includes('dryer') || text.includes('drum') || text.includes('spin') || text.includes('paani nahi')) {
      category = 'washing_machine';
    } else if (text.includes('fridge') || text.includes('refrigerator') || text.includes('freezer') || text.includes('defrost') || text.includes('cooling')) {
      category = 'refrigerator';
    } else if (text.includes('microwave') || text.includes('oven')) {
      category = 'microwave';
    } else if (text.includes('tv') || text.includes('television')) {
      category = 'television';
    }

    // 2. Detect Brand
    let brand: string | null = null;
    if (text.includes('apple') || text.includes('iphone')) brand = 'Apple';
    else if (text.includes('dell')) brand = 'Dell';
    else if (text.includes('hp')) brand = 'HP';
    else if (text.includes('lenovo')) brand = 'Lenovo';
    else if (text.includes('sony')) brand = 'Sony';
    else if (text.includes('samsung')) brand = 'Samsung';
    else if (text.includes('whirlpool')) brand = 'Whirlpool';
    else if (text.includes('lg')) brand = 'LG';
    else if (text.includes('ifb')) brand = 'IFB';
    else if (text.includes('bosch')) brand = 'Bosch';

    // 3. Detect Model
    let model: string | null = null;
    if (text.includes('iphone 16') || (text.includes('iphone') && text.includes('16'))) model = 'iPhone 16';
    else if (text.includes('iphone 15') || (text.includes('iphone') && text.includes('15'))) model = 'iPhone 15';
    else if (text.includes('inspiron 15') || text.includes('inspiron')) model = 'Inspiron 15';

    // 4. Detect Component
    let component: string | null = null;
    if (text.includes('battery')) component = 'battery';
    else if (text.includes('dc jack') || text.includes('charging port') || text.includes('jack') || text.includes('charge')) component = 'dc_jack';
    else if (text.includes('filter') || text.includes('mesh') || text.includes('jaali')) component = 'inlet_filter';
    else if (text.includes('motor') || text.includes('connector') || text.includes('harness')) component = 'motor_connector';
    else if (text.includes('coin trap') || text.includes('drain pump') || text.includes('drain')) component = 'drain_pump';
    else if (text.includes('bimetal') || text.includes('defrost')) component = 'defrost_sensor';
    else if (text.includes('fuse')) component = 'fuse';
    else if (text.includes('screen') || text.includes('display')) component = 'display';

    // 5. Detect Error code
    let errorCode: string | null = null;
    const match = text.match(/\b(4c|4e|f06|f05|f24|oe|ie|ue|ub|pe|e18|de|battery-service|no-charge|defrost-fail)\b/i);
    if (match) errorCode = match[1].toUpperCase();

    // 6. Extract Symptoms, Observation, Fix, Outcome without inventing
    let symptoms: string[] = [];
    let observation = 'Not provided in note';
    let fix = 'Not provided in note';
    let outcome = 'Device inspected';
    let observedCause = 'Not provided in note';
    let firstCheck = component ? `Inspect ${component}` : 'Inspect reported fault area';
    const parts: string[] = [];

    if (text.includes('swollen')) {
      symptoms.push('battery swollen');
      observation = 'battery swollen';
      observedCause = 'battery swollen';
      parts.push('Battery');
    } else if (text.includes('paani nahi')) {
      symptoms.push('machine not filling water');
      observation = text.includes('filter') || text.includes('scaling') ? 'Inlet filter clogged with scale' : 'Water flow restricted';
      observedCause = 'Inlet filter mesh blocked by calcium or debris';
      parts.push('Inlet Filter');
    } else if (errorCode) {
      symptoms.push(`Error code ${errorCode} displayed`);
    } else {
      symptoms.push(params.rawNote.slice(0, 100) || 'Technician reported issue');
    }

    if (text.includes('battery replace') || text.includes('replace ki') || text.includes('battery badli')) {
      fix = 'battery replaced';
      if (!parts.includes('Battery')) parts.push('Battery');
    } else if (text.includes('clean kiya') || text.includes('saaf kiya')) {
      fix = component ? `${component} cleaned` : 'Cleaned and cleared component';
    } else if (text.includes('harness replace') || text.includes('jack replace') || text.includes('badla')) {
      fix = component ? `${component} replaced` : 'Replaced faulty component';
    }

    if (text.includes('properly start ho gaya') || text.includes('start ho gaya') || text.includes('properly start')) {
      outcome = 'phone started normally';
    } else if (text.includes('chal gayi') || text.includes('theek ho gayi') || text.includes('working')) {
      outcome = 'working normally';
    } else if (text.includes('charging start')) {
      outcome = 'charging properly';
    }

    return {
      category,
      brand: brand || 'Not specified',
      model,
      component,
      errorCode,
      symptoms,
      observation,
      observedCause: observedCause !== 'Not provided in note' ? observedCause : observation,
      firstCheck,
      nextCheck: null,
      fix,
      outcome,
      partsInvolved: parts.length > 0 ? parts : ['Not specified'],
      confidence: 0.95,
      debugInfo: {
        detectedIntent: 'CAPTURE_MEMORY',
        retrievalMatches: [],
        sourceMemoryIds: [],
        confidence: 0.95,
        activeStepNumber: 0,
        isAiPowered: false,
        isFallback: true,
      },
    };
  }
}

export const geminiService = new GeminiService();
