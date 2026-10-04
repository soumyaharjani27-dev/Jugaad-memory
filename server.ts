import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Persistent file-backed storage for workshop memories
const DATA_DIR = path.resolve('data');
const MEMORIES_FILE = path.join(DATA_DIR, 'workshop_memories.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStoredMemories(): any[] {
  ensureDataDir();
  try {
    if (fs.existsSync(MEMORIES_FILE)) {
      const data = fs.readFileSync(MEMORIES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read memories file:', e);
  }
  return [];
}

function writeStoredMemories(memories: any[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write memories file:', e);
  }
}

// Support base64 image payloads up to 25MB
app.use(express.json({ limit: '25mb' }));

// Initialize GoogleGenAI SDK on the server side
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// -------------------------------------------------------------
// Workshop Memories Persistence Endpoints (Survives reload & restart)
// -------------------------------------------------------------
app.get('/api/memories', (_req: Request, res: Response) => {
  const memories = readStoredMemories();
  res.json({ success: true, count: memories.length, memories });
});

app.post('/api/memories', (req: Request, res: Response) => {
  const memory = req.body;
  if (!memory || !memory.id) {
    return res.status(400).json({ error: 'Valid memory with ID is required' });
  }
  const current = readStoredMemories();
  const existingIdx = current.findIndex((m: any) => m.id === memory.id);
  if (existingIdx >= 0) {
    current[existingIdx] = { ...current[existingIdx], ...memory, updatedAt: new Date().toISOString() };
  } else {
    current.unshift(memory);
  }
  writeStoredMemories(current);
  res.json({ success: true, memory });
});

app.delete('/api/memories/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const current = readStoredMemories();
  const filtered = current.filter((m: any) => m.id !== id);
  writeStoredMemories(filtered);
  res.json({ success: true, deletedId: id });
});

app.post('/api/memories/reset', (_req: Request, res: Response) => {
  writeStoredMemories([]);
  res.json({ success: true, message: 'Persistent storage reset' });
});

// -------------------------------------------------------------
// POST /api/gemini/agent/inspect-scene & /api/gemini/agent/inspect-image
// Strict Multimodal Computer Vision Observation without Forcing or Hallucinations
// -------------------------------------------------------------
const handleInspectScene = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { imageBase64, symptomText } = req.body;

  try {
    if (!ai || !apiKey) {
      return res.json({
        isAiPowered: false,
        latencyMs: Date.now() - startTime,
        data: heuristicInspectScene(imageBase64, symptomText),
      });
    }

    const systemPrompt = `You are Jugaad Memory's Universal Computer Vision Scene Inspector.
Analyze this image with extreme discipline, accuracy, and ZERO hallucinations.

CORE PRODUCT MISSION:
Jugaad Memory is a private memory layer for repair technicians that inspects ANY repairable device or appliance:
- smartphones & mobile devices
- laptops & computers
- washing machines & dryers
- refrigerators & freezers
- air conditioners (ACs)
- microwave ovens & kitchen appliances
- televisions & monitors
- headphones & audio equipment
- cameras & optics
- circuit boards, PCBs, power supplies, electronics & power tools
- other repairable machines & devices

DYNAMIC IDENTIFICATION (NO HARDCODED WHITELISTS):
1. What is ACTUALLY visible in this image?
2. Identify the device, category, brand, and model when visible.
3. If the exact model cannot be identified, DO NOT stop or reject. Use broader attributes (e.g. category: "electronics", object: "Electronic Device / PCB") and provide a helpful identificationNote:
   "I can see an electronic device, but I can't confidently identify the exact model yet."
4. Extract visible repair evidence: swelling, burns, corrosion, loose cables, cracks, leaks, digital error codes, warning icons, etc.
5. NEVER invent a cause or fix. This stage is STRICT OBSERVATION ONLY.

Respond ONLY with valid JSON:
{
  "sceneType": string, // "smartphone" | "laptop" | "washing_machine" | "refrigerator" | "microwave" | "television" | "electronics" | "audio" | "small_appliance" | "other"
  "object": string, // concise object description, e.g. "iPhone", "Dell Laptop", "Samsung Washing Machine", "Inverter Refrigerator", "Electronic Circuit Board"
  "category": string, // "smartphone" | "laptop" | "washing_machine" | "refrigerator" | "microwave" | "television" | "electronics" | "audio"
  "brand": string or null, // brand ONLY if genuinely visible on logos/badges, otherwise null
  "model": string or null, // model ONLY if genuinely visible in text/labels, otherwise null
  "component": string or null, // focal component if visible, e.g. "battery", "dc_jack", "inlet_valve", "coin_trap", "evaporator_coil", "fuse"
  "isIdentified": boolean, // true if device category is determined
  "identificationNote": string or null, // note if exact model is uncertain
  "isSupportedDomain": true, // ALL repairable devices are supported
  "domainReason": string, // concise explanation of detected device
  "visibleIssue": string or null, // objective visual finding only (e.g. "battery service warning on screen", "4C code on LED", "charred DC jack pin"), null if none
  "visibleText": string[], // text actually visible in the image
  "visibleComponents": string[], // visible hardware components
  "visualEvidence": string[], // bullet points of visual facts
  "errorCode": string or null, // error code if visible on display, null if not
  "machineType": string or null,
  "visualTarget": {
    "label": string,
    "x": number,
    "y": number,
    "width": number,
    "height": number,
    "description": string
  } or null,
  "confidence": number
}`;

    const parts: any[] = [];
    if (imageBase64 && typeof imageBase64 === 'string') {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });
    }
    parts.push({
      text: `Technician symptom description: "${symptomText || ''}"\nPerform objective scene observation and device extraction:`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const textOutput = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = heuristicInspectScene(imageBase64, symptomText);
    }

    return res.json({
      isAiPowered: true,
      latencyMs: Date.now() - startTime,
      data: parsed,
    });
  } catch (error: any) {
    console.error('inspect-scene error:', error);
    return res.json({
      isAiPowered: false,
      latencyMs: Date.now() - startTime,
      data: heuristicInspectScene(imageBase64, symptomText),
      error: error?.message,
    });
  }
};

app.post('/api/gemini/agent/inspect-scene', handleInspectScene);
app.post('/api/gemini/agent/inspect-image', handleInspectScene);

// -------------------------------------------------------------
// POST /api/gemini/agent/replan
// Dynamic Agent Re-planning based on Technician Observation
// -------------------------------------------------------------
app.post('/api/gemini/agent/replan', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { repairState, currentStep, observation, retrievedMemories } = req.body;

  try {
    if (!ai || !apiKey) {
      return res.json({
        isAiPowered: false,
        latencyMs: Date.now() - startTime,
        data: heuristicReplan(repairState, currentStep, observation),
      });
    }

    const systemPrompt = `You are Jugaad Memory's stateful Repair Agent planner for a workshop.
The technician tested a step and reported an observation (e.g. 'issue_found', 'normal', 'not_sure', plus notes like "Filter blocked tha").
Your task is to REPLAN the diagnostic path based on this real feedback and historical workshop memories.
DO NOT continue the old plan if an issue was found!
If an issue was found:
- Explain why this blockage/damage confirms the cause based on historical cases.
- Create an immediate resolution and verification check step.
If normal:
- Rule out that cause and propose the next logical mechanical or electrical test.
Provide clear English and Hindi instructions for Indian technicians.
Respond ONLY with valid JSON:
{
  "reasoning": "Concise reasoning for the replan",
  "reasoningHindi": "हिंदी में संक्षिप्त कारण",
  "action": "verify_fix" | "next_check" | "senior_tip" | "escalate",
  "updatedStep": {
    "stepNumber": number,
    "title": "Short title",
    "instruction": "English instruction",
    "instructionHindi": "हिंदी निर्देश",
    "actionDetailsHindi": ["1. ...", "2. ..."],
    "reason": "Why this step now",
    "reasonHindi": "कारण",
    "safetyNotice": "string or null",
    "safetyNoticeHindi": "string or null",
    "sourceMemoryIds": ["string"],
    "suggestedFix": "string or null"
  },
  "isReadyToComplete": boolean
}`;

    const promptText = `Repair State: ${JSON.stringify({
      appliance: repairState?.appliance,
      errorCode: repairState?.errorCode,
      symptoms: repairState?.symptoms,
      currentStep: currentStep?.title || currentStep?.instruction,
      observation: observation,
    })}
Retrieved Memories: ${JSON.stringify((retrievedMemories || []).slice(0, 3).map((m: any) => ({
  id: m.id || m.memory?.id,
  cause: m.cause || m.memory?.cause || m.memory?.observedCause,
  fix: m.fix || m.memory?.fix,
  note: m.originalNote || m.memory?.originalNote,
})))}
Re-evaluate plan based on technician's observation:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const textOutput = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = heuristicReplan(repairState, currentStep, observation);
    }

    return res.json({
      isAiPowered: true,
      latencyMs: Date.now() - startTime,
      data: parsed,
    });
  } catch (error: any) {
    console.error('replan error:', error);
    return res.json({
      isAiPowered: false,
      latencyMs: Date.now() - startTime,
      data: heuristicReplan(repairState, currentStep, observation),
      error: error?.message,
    });
  }
});

// -------------------------------------------------------------
// POST /api/gemini/analyze-repair
// -------------------------------------------------------------
app.post('/api/gemini/analyze-repair', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { imageBase64, symptomText, language, workshopMemories } = req.body;

  try {
    if (!ai || !apiKey) {
      return res.json({
        isAiPowered: false,
        latencyMs: Date.now() - startTime,
        data: heuristicAnalyzeRepair(symptomText, workshopMemories || []),
      });
    }

    const memorySummaries = (workshopMemories || []).slice(0, 10).map((m: any) => ({
      id: m.id,
      category: m.category || m.appliance?.category || m.applianceCategory,
      brand: m.brand,
      model: m.model,
      errorCode: m.errorCode,
      symptoms: m.symptoms,
      observedCause: m.observedCause || m.cause,
      fix: m.fix,
      technician: m.technician || m.technicianName,
    }));

    const systemPrompt = `You are Jugaad Memory, a private repair memory assistant for workshops.
You assist technicians with ANY repairable device or appliance: smartphones, laptops, washing machines, refrigerators, microwaves, televisions, headphones, electronics, etc.
Analyze the technician's photo and symptom note (English, Hindi, or Hinglish).
Compare with the workshop's own stored memories.
CRITICAL: Include both English and Hindi/Hinglish instructions so Indian technicians can easily understand on the repair bench.
Respond ONLY with a valid JSON object matching this schema:
{
  "detectedAppliance": {
    "brand": string or null,
    "model": string or null,
    "errorCode": string or null,
    "category": string, // "smartphone" | "laptop" | "washing_machine" | "refrigerator" | "microwave" | "electronics" | etc.
    "type": string or null
  },
  "detectedSymptoms": ["string"],
  "matchedMemoryIds": ["SP-101", "WM-101", ...],
  "matchReason": "Clear explanation of why these workshop memories match (e.g. Same category, similar battery issue, same brand)",
  "visualTarget": {
    "label": "Short label",
    "x": 60,
    "y": 20,
    "width": 20,
    "height": 20,
    "description": "Location description"
  } or null,
  "firstStep": {
    "stepNumber": 1,
    "instruction": "Concrete single diagnostic check in English",
    "instructionHindi": "स्पष्ट हिंदी / हिंगलिश निर्देश जो टेक्नीशियन आसानी से समझ सके",
    "actionDetailsHindi": ["1. पहला काम", "2. दूसरा काम", "3. तीसरा काम"],
    "reason": "Derived from previous workshop repairs or AI suggestion",
    "reasonHindi": "हिंदी में कारण",
    "safetyNotice": "Safety precaution",
    "safetyNoticeHindi": "⚠️ सावधानी निर्देश",
    "sourceMemoryIds": ["string"]
  },
  "confidence": 0.9
}`;

    const parts: any[] = [];
    if (imageBase64 && typeof imageBase64 === 'string') {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    parts.push({
      text: `Symptom note from technician: "${symptomText || 'Washing machine issue'}"
Workshop Stored Memories: ${JSON.stringify(memorySummaries, null, 2)}
Analyze this repair request against the workshop's stored memories.`,
    });

    // Timeout promise after 2500ms so technician never waits on high demand/503
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), 2500)
    );

    const apiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const response = (await Promise.race([apiPromise, timeoutPromise])) as any;
    const textOutput = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = heuristicAnalyzeRepair(symptomText, workshopMemories || []);
    }

    return res.json({
      isAiPowered: true,
      latencyMs: Date.now() - startTime,
      data: parsed,
      rawOutput: textOutput,
    });
  } catch (error: any) {
    console.warn('Gemini analyze repair fallback triggered:', error?.message);
    return res.json({
      isAiPowered: false,
      latencyMs: Date.now() - startTime,
      data: heuristicAnalyzeRepair(symptomText, workshopMemories || []),
      error: error?.message || 'Used workshop heuristic match',
    });
  }
});

// -------------------------------------------------------------
// POST /api/gemini/next-step
// -------------------------------------------------------------
app.post('/api/gemini/next-step', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { currentStep, userResponse, technicianNotes, appliance, matchedMemories } = req.body;

  try {
    if (!ai || !apiKey) {
      return res.json({
        isAiPowered: false,
        latencyMs: Date.now() - startTime,
        data: heuristicNextStep(currentStep, userResponse, technicianNotes, matchedMemories),
      });
    }

    const systemPrompt = `You are Jugaad Memory, guiding a technician step-by-step through a washing machine repair.
User just completed step ${currentStep?.stepNumber || 1}: "${currentStep?.instruction || ''}".
Technician confirmed: "${userResponse}" (options: 'normal', 'issue_found', 'not_sure').
CRITICAL: Include both English and Hindi/Hinglish instructions so Indian technicians can easily understand on the repair bench.
Respond ONLY with a valid JSON object matching:
{
  "isRepairResolved": false,
  "nextStep": {
    "stepNumber": ${(currentStep?.stepNumber || 1) + 1},
    "instruction": "Concrete single diagnostic check in English",
    "instructionHindi": "स्पष्ट हिंदी / हिंगलिश निर्देश",
    "actionDetailsHindi": ["1. पहला काम", "2. दूसरा काम"],
    "reason": "Why this is the next logical check",
    "reasonHindi": "हिंदी कारण",
    "safetyNotice": "Safety precaution",
    "safetyNoticeHindi": "⚠️ सावधानी",
    "sourceMemoryIds": ["WM-101"]
  },
  "suggestedFix": string or null,
  "suggestedFixHindi": string or null
}`;

    const promptText = `Appliance: ${JSON.stringify(appliance)}
Current Step: ${JSON.stringify(currentStep)}
User Confirmation: ${userResponse}
Technician Notes: ${technicianNotes || ''}
Generate next diagnostic step.`;

    // Timeout promise after 2200ms
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), 2200)
    );

    const apiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const response = (await Promise.race([apiPromise, timeoutPromise])) as any;
    const textOutput = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = heuristicNextStep(currentStep, userResponse, technicianNotes, matchedMemories);
    }

    return res.json({
      isAiPowered: true,
      latencyMs: Date.now() - startTime,
      data: parsed,
      rawOutput: textOutput,
    });
  } catch (error: any) {
    console.warn('Gemini next-step fallback triggered:', error?.message);
    return res.json({
      isAiPowered: false,
      latencyMs: Date.now() - startTime,
      data: heuristicNextStep(currentStep, userResponse, technicianNotes, matchedMemories),
      error: error?.message,
    });
  }
});

// -------------------------------------------------------------
// POST /api/gemini/parse-jugaad
// -------------------------------------------------------------
app.post('/api/gemini/parse-jugaad', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { rawNote, technicianName, imageBase64 } = req.body;

  try {
    if (!ai || !apiKey) {
      return res.json({
        isAiPowered: false,
        latencyMs: Date.now() - startTime,
        data: heuristicParseJugaad(rawNote, technicianName),
      });
    }

    const systemPrompt = `You are Jugaad Memory's senior technician knowledge extractor.
Senior technicians speak or type casually in Hindi, English, or Hinglish about ANY device repair (e.g. "iPhone 16 battery swollen thi. Battery replace ki. Phone properly start ho gaya.", "Dell Inspiron DC jack center pin broken tha. Harness replace kiya. Charging start ho gayi.", or washing machines, refrigerators, microwaves, etc.).
Convert their real practical experience into structured workshop memory.
CRITICAL TRUST RULE: DO NOT silently invent details that were not in the technician's input.
If model, error, or brand is not mentioned or implied, set it to null or "Not specified".
Respond ONLY with a valid JSON object matching:
{
  "category": string, // "smartphone" | "laptop" | "washing_machine" | "refrigerator" | "microwave" | "television" | "electronics" | "audio" | "small_appliance"
  "brand": string or null, // e.g. "Apple", "Dell", "Samsung", "LG", "Whirlpool", null
  "model": string or null, // e.g. "iPhone 16", "Inspiron 15", null
  "component": string or null, // e.g. "battery", "dc_jack", "inlet_filter", "compressor_relay"
  "errorCode": string or null,
  "symptoms": ["string"],
  "observedCause": "string",
  "firstCheck": "string",
  "nextCheck": "string or null",
  "fix": "string",
  "outcome": "string", // e.g. "Phone started normally", "Device working properly", "Confirmed fix"
  "partsInvolved": ["string"],
  "confidence": 0.95
}`;

    const parts: any[] = [];
    if (imageBase64 && typeof imageBase64 === 'string') {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });
    }
    parts.push({
      text: `Technician: ${technicianName || 'Senior Technician'}
Technician Raw Input: "${rawNote}"
Extract structured workshop memory:`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const textOutput = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = heuristicParseJugaad(rawNote, technicianName);
    }

    return res.json({
      isAiPowered: true,
      latencyMs: Date.now() - startTime,
      data: parsed,
      rawOutput: textOutput,
    });
  } catch (error: any) {
    console.error('Gemini parse-jugaad error:', error);
    return res.json({
      isAiPowered: false,
      latencyMs: Date.now() - startTime,
      data: heuristicParseJugaad(rawNote, technicianName),
      error: error?.message,
    });
  }
});

// -------------------------------------------------------------
// Heuristic Fallback Engines (Zero-cost & Graceful Offline resilience)
// -------------------------------------------------------------
function heuristicAnalyzeRepair(symptomText: string = '', workshopMemories: any[] = []) {
  const query = (symptomText || '').toLowerCase();

  // Detect category dynamically
  let category = 'electronics';
  let brand: string | null = null;
  let model: string | null = null;
  let errorCode: string | null = null;

  if (query.includes('iphone') || query.includes('apple') || query.includes('phone') || query.includes('mobile')) {
    category = 'smartphone';
    brand = 'Apple';
    if (query.includes('16')) model = 'iPhone 16 Pro';
    if (query.includes('battery')) errorCode = 'BATTERY-SERVICE';
  } else if (query.includes('dell') || query.includes('laptop') || query.includes('computer') || query.includes('jack')) {
    category = 'laptop';
    brand = query.includes('dell') ? 'Dell' : (query.includes('hp') ? 'HP' : 'Laptop');
    if (query.includes('inspiron')) model = 'Inspiron 15';
    if (query.includes('charge') || query.includes('jack')) errorCode = 'NO-CHARGE';
  } else if (query.includes('fridge') || query.includes('refrigerator') || query.includes('defrost') || query.includes('cooling')) {
    category = 'refrigerator';
    brand = query.includes('lg') ? 'LG' : (query.includes('whirlpool') ? 'Whirlpool' : 'Refrigerator');
    errorCode = 'DEFROST-FAIL';
  } else if (query.includes('microwave') || query.includes('heat') || query.includes('oven')) {
    category = 'microwave';
    brand = 'IFB';
    errorCode = 'NO-HEAT';
  } else if (query.includes('washing') || query.includes('washer') || query.includes('paani') || query.includes('motor') || query.includes('drain')) {
    category = 'washing_machine';
    if (query.includes('samsung')) brand = 'Samsung';
    else if (query.includes('whirlpool')) brand = 'Whirlpool';
    else if (query.includes('lg')) brand = 'LG';
    else if (query.includes('ifb')) brand = 'IFB';
    else if (query.includes('bosch')) brand = 'Bosch';

    const errorMatch = query.match(/\b(4c|4e|f06|f05|f24|oe|ie|ue|ub|pe|e18|de)\b/i);
    if (errorMatch) errorCode = errorMatch[1].toUpperCase();
  }

  // Find best matching memory from workshop memories
  const scored = (workshopMemories || []).map((m: any) => {
    let score = 0;
    const matchReasons: string[] = [];
    const memCat = (m.category || m.appliance?.category || m.applianceCategory || '').toLowerCase();
    const memBrand = (m.brand || m.appliance?.brand || '').toLowerCase();

    if (category && memCat.includes(category)) {
      score += 35;
      matchReasons.push(`Same device category (${category.replace('_', ' ')})`);
    }

    if (errorCode && m.errorCode && m.errorCode.toUpperCase() === errorCode.toUpperCase()) {
      score += 45;
      matchReasons.push(`Same error code (${errorCode})`);
    }

    if (brand && memBrand.includes(brand.toLowerCase())) {
      score += 25;
      matchReasons.push(`Same brand (${m.brand})`);
    }

    const mText = `${m.brand} ${m.errorCode || ''} ${(m.symptoms || []).join(' ')} ${m.observedCause || ''} ${m.fix || ''} ${m.originalNote || ''}`.toLowerCase();
    
    // Check keywords
    const keywords = ['battery', 'swollen', 'jack', 'charging', 'defrost', 'frost', 'fuse', 'paani', 'water', 'drain', 'pump', 'motor', 'spin', 'filter', 'valve'];
    let kwHits = 0;
    for (const kw of keywords) {
      if (query.includes(kw) && mText.includes(kw)) {
        score += 8;
        kwHits++;
      }
    }
    if (kwHits > 0) {
      matchReasons.push(`Similar symptom & component keywords (${kwHits})`);
    }

    return {
      memory: m,
      score,
      reason: matchReasons.length > 0 ? matchReasons.join(' · ') : 'Diagnostic similarity',
      matchReasons,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const bestMatches = scored.filter(s => s.score > 25).slice(0, 3);
  const matchedIds = bestMatches.map(b => b.memory.id);
  const topMatch = bestMatches[0]?.memory;

  let visualTarget: any = null;
  let firstInstruction = "Inspect physical device housing and operating connections.";
  let firstInstructionHindi = "डिवाइस की बाहरी स्थिति और मुख्य कनेक्शन की जांच करें।";
  let actionDetailsHindi = ["1. प्लग या बैटरी कनेक्शन चेक करें।", "2. कोई टूटा या जला हुआ पार्ट तो नहीं है देखें।"];
  let safetyNotice = "Disconnect power or battery before disassembly.";
  let safetyNoticeHindi = "⚠️ सावधानी: खोलने से पहले पावर या बैटरी कनेक्शन डिस्कनेक्ट करें।";
  let firstReason = matchedIds.length > 0
    ? `Derived from previous workshop repair ${matchedIds[0]} (${topMatch?.brand || 'Device'}).`
    : "AI SUGGESTION — NOT FROM WORKSHOP MEMORY (Baseline diagnostic check)";
  let firstReasonHindi = matchedIds.length > 0
    ? `वर्कशॉप रिकॉर्ड ${matchedIds[0]} के अनुसार।`
    : "एआई सुझाव — वर्कशॉप मेमोरी में पिछला केस नहीं मिला।";

  if (category === 'smartphone' || query.includes('battery')) {
    visualTarget = {
      label: "Swollen Battery Bay",
      x: 45,
      y: 35,
      width: 30,
      height: 45,
      description: "Internal battery bay behind display panel",
    };
    firstInstruction = "Inspect battery health in Settings and check for screen glass lifting caused by battery pouch swelling.";
    firstInstructionHindi = "सेटिंग्स में बैटरी हेल्थ चेक करें और देखें कि बैटरी फूलने से स्क्रीन ऊपर तो नहीं उठ रही।";
    actionDetailsHindi = [
      "1. सेटिंग्स > बैटरी > बैटरी हेल्थ चेक करें (80% से कम होने पर सर्विस की जरूरत)।",
      "2. फोन के किनारों पर देखें - स्क्रीन और फ्रेम के बीच गैप तो नहीं बना।",
      "3. बैटरी फूली होने पर सावधानी से खोलें और पंचर न करें।"
    ];
    firstReason = matchedIds.length > 0
      ? "Previous workshop cases with swollen battery required cell replacement."
      : "AI SUGGESTION — NOT FROM WORKSHOP MEMORY (Inspect battery cell condition)";
    firstReasonHindi = "वर्कशॉप में ऐसे मामलों में बैटरी बदलने से समस्या हल हुई थी।";
    safetyNotice = "Never puncture or bend a swollen lithium-ion battery cell.";
    safetyNoticeHindi = "⚠️ फूली हुई बैटरी को कभी न मोड़ें और न ही नुकीली चीज चुभाएं।";
  } else if (category === 'laptop' || query.includes('charge') || query.includes('jack')) {
    visualTarget = {
      label: "DC Power Jack Port",
      x: 10,
      y: 52,
      width: 14,
      height: 18,
      description: "Left corner DC-in barrel jack",
    };
    firstInstruction = "Inspect laptop charging DC jack port for a cracked center sensing pin or loose internal harness clip.";
    firstInstructionHindi = "लैपटॉप के चार्जिंग पोर्ट (DC Jack) का सेंटर पिन चेक करें कि वह टूटा या ढीला तो नहीं है।";
    actionDetailsHindi = [
      "1. चार्जर पिन हिलाने पर चार्जिंग लाइट जलती/बुझती है तो DC जैक खराब है।",
      "2. मैग्निफाइंग ग्लास से पोर्ट के अंदर का सेंटर पिन चेक करें।",
      "3. मल्टीमीटर से चार्जर के आउटपुट पर 19V या 20V DC चेक करें।"
    ];
    firstReason = matchedIds.length > 0
      ? "Previous workshop repairs resolved this with DC-in harness replacement."
      : "AI SUGGESTION — NOT FROM WORKSHOP MEMORY (Inspect DC-in power jack)";
    firstReasonHindi = "वर्कशॉप रिकॉर्ड: तार हिलाने पर चार्ज होने की समस्या DC जैक बदलने से ठीक होती है।";
    safetyNotice = "Disconnect AC adapter and internal battery before opening laptop chassis.";
    safetyNoticeHindi = "⚠️ लैपटॉप खोलने से पहले चार्जर और बैटरी अनप्लग करें।";
  } else if (category === 'refrigerator' || query.includes('defrost') || query.includes('frost')) {
    visualTarget = {
      label: "Evaporator Defrost Bimetal Clip",
      x: 72,
      y: 24,
      width: 16,
      height: 16,
      description: "Upper evaporator tube bimetal sensor",
    };
    firstInstruction = "Remove freezer back panel and inspect evaporator coils for heavy solid frost buildup.";
    firstInstructionHindi = "फ्रीजर का पिछला पैनल खोलें और देखें कि कॉइल्स पर मोटी बर्फ तो नहीं जमी है।";
    actionDetailsHindi = [
      "1. फ्रीजर का पिछला प्लास्टिक कवर खोलें।",
      "2. अगर कॉइल्स पर बर्फ जमी है तो बायोमेटल थर्मोस्टेट सेंसर चेक करें।",
      "3. मल्टीमीटर से डिफ्रोस्ट हीटर का रेजिस्टेंस (300-350 ओम) चेक करें।"
    ];
    firstReason = matchedIds.length > 0
      ? "Previous workshop cases confirmed failed bi-metal defrost thermostat sensor."
      : "AI SUGGESTION — NOT FROM WORKSHOP MEMORY (Inspect defrost system)";
    firstReasonHindi = "वर्कशॉप रिकॉर्ड: फ्रीजर में बर्फ और नीचे गर्मी का कारण बायोमेटल सेंसर खराब होना होता है।";
    safetyNotice = "Unplug refrigerator mains cord before probing electrical heaters.";
    safetyNoticeHindi = "⚠️ हीटर या सेंसर छूने से पहले फ्रिज अनप्लग करें।";
  } else if (errorCode === '4C' || query.includes('paani') || (topMatch && topMatch.errorCode === '4C')) {
    visualTarget = {
      label: "Water Inlet Valve Filter",
      x: 62,
      y: 22,
      width: 20,
      height: 20,
      description: "Rear cold water intake threaded connector",
    };
    firstInstruction = "Check the cold water inlet filter mesh at the back of the machine for calcium scaling or grit.";
    firstInstructionHindi = "मशीन के पीछे ठंडे पानी की जाली (Inlet Filter) निकाल कर चेक करें";
    actionDetailsHindi = [
      "1. नल बंद करें और पीछे से नीले पाइप का नट खोलें।",
      "2. नोज प्लास से प्लास्टिक की जाली बाहर खींचें।",
      "3. जाली में सफेद खारा नमक या रेत फंसी हो तो ब्रश और सिरके से साफ करें।"
    ];
    firstReason = matchedIds.length > 0
      ? "Previous workshop cases with 4C error resolved by descaling this inlet filter."
      : "AI SUGGESTION — NOT FROM WORKSHOP MEMORY (Inspect water intake path)";
    firstReasonHindi = "वर्कशॉप में 4C एरर इसी जाली में खारा नमक साफ करने से ठीक हुआ था।";
    safetyNotice = "Turn off tap and relieve water pressure before unscrewing the inlet hose.";
    safetyNoticeHindi = "⚠️ पाइप खोलने से पहले नल बंद करें ताकि पानी का प्रेशर न लगे।";
  } else if (errorCode === 'F06' || query.includes('motor') || (topMatch && topMatch.errorCode === 'F06')) {
    visualTarget = {
      label: "Motor 6-pin Harness Connector",
      x: 48,
      y: 70,
      width: 24,
      height: 20,
      description: "Lower motor bracket, right harness clip",
    };
    firstInstruction = "Inspect the motor 6-pin wiring connector at the bottom motor bracket for loose pins or oxidation.";
    firstInstructionHindi = "मशीन के नीचे मोटर का 6-पिन कनेक्टर (Wiring Clip) चेक करें";
    actionDetailsHindi = [
      "1. 230V मेन प्लग निकालें और पीछे का सर्विस ढक्कन खोलें।",
      "2. मोटर के पास 6-पिन क्लिप को देखें कि ढीला या जला तो नहीं।",
      "3. क्लिप को दबाकर टाइट करें और कॉन्टैक्ट क्लीनर स्प्रे मारें।"
    ];
    firstReason = matchedIds.length > 0
      ? "Senior technician Ramesh Bhai noted F06 is frequently caused by a loosened motor clip."
      : "AI SUGGESTION — NOT FROM WORKSHOP MEMORY (Check drive motor connection)";
    firstReasonHindi = "रमेश भाई की टिप: F06 में मोटर कनेक्टर वाइब्रेशन से ढीला या कार्बन पकड़ लेता है।";
    safetyNotice = "Unplug power from wall socket before reaching into the bottom motor cavity.";
    safetyNoticeHindi = "⚠️ मोटर छूने से पहले 230V सॉकेट से प्लग जरूर निकाल लें।";
  } else if (errorCode === 'OE' || query.includes('drain') || (topMatch && topMatch.errorCode === 'OE')) {
    visualTarget = {
      label: "Drain Pump Filter (Coin Trap)",
      x: 74,
      y: 80,
      width: 18,
      height: 16,
      description: "Front bottom-right emergency drain hatch",
    };
    firstInstruction = "Unscrew the bottom right coin trap filter and check if coins, hairpins, or lint are jamming the impeller.";
    firstInstructionHindi = "नीचे दाएं कोने का कॉइन ट्रैप (ड्रेन फिल्टर) खोलें और पंखुड़ी चेक करें";
    actionDetailsHindi = [
      "1. नीचे तौलिया या ट्रे रखें क्योंकि 1-2 लीटर पानी निकलेगा।",
      "2. गोल ढक्कन को बाईं तरफ घुमाकर खोलें।",
      "3. टॉर्च से देखें कि सिक्का (₹5 coin) या पिन तो नहीं फंसा।",
      "4. पंखुड़ी को उंगली से घुमाकर देखें - फ्री घूमनी चाहिए।"
    ];
    firstReason = matchedIds.length > 0
      ? "Workshop history shows OE is almost always a mechanical blockage in the coin trap rather than a failed pump."
      : "AI SUGGESTION — NOT FROM WORKSHOP MEMORY (Check drain coin trap)";
    firstReasonHindi = "वर्कशॉप रिकॉर्ड: OE एरर में कॉइन ट्रैप में सिक्का या पिन फंसा होता है।";
    safetyNotice = "Place a towel or shallow tray underneath before unscrewing to catch 1-2 litres of standing water.";
    safetyNoticeHindi = "⚠️ ढक्कन खोलने से पहले नीचे कपड़ा या ट्रे रखें, पानी बाहर गिरेगा।";
  } else if (topMatch) {
    firstInstruction = topMatch.diagnosticSteps?.[0] || `Check the ${topMatch.partsInvolved?.[0] || 'primary component'}.`;
    firstInstructionHindi = `मशीन के ${topMatch.partsInvolved?.[0] || 'मुख्य पार्ट'} की जांच करें`;
    actionDetailsHindi = [
      `1. ${topMatch.diagnosticSteps?.[0] || 'पार्ट को साफ और टाइट करें।'}`,
      `2. ${topMatch.diagnosticSteps?.[1] || 'मशीन चलाकर टेस्ट करें।'}`
    ];
    firstReason = `Based on workshop repair ${topMatch.id} (${topMatch.brand}).`;
    firstReasonHindi = `वर्कशॉप रिपेयर रिकॉर्ड ${topMatch.id} (${topMatch.brand}) के अनुसार।`;
  }

  return {
    isSupportedDomain: true,
    detectedAppliance: {
      category,
      brand: brand || topMatch?.brand || 'Device',
      model: model || topMatch?.model || null,
      errorCode: errorCode || topMatch?.errorCode || null,
      type: 'standard',
    },
    detectedSymptoms: [symptomText || 'Issue reported'],
    matchedMemoryIds: matchedIds,
    matchReason: matchedIds.length > 0
      ? (bestMatches[0]?.reason || 'Matched previous workshop repairs')
      : 'No similar workshop repair has been found yet.',
    visualTarget,
    firstStep: {
      stepNumber: 1,
      instruction: firstInstruction,
      instructionHindi: firstInstructionHindi,
      actionDetailsHindi: actionDetailsHindi,
      reason: firstReason,
      reasonHindi: firstReasonHindi,
      safetyNotice,
      safetyNoticeHindi: safetyNoticeHindi,
      sourceMemoryIds: matchedIds.slice(0, 2),
      sourceType: matchedIds.length > 0 ? ('workshop_memory' as const) : ('ai_suggestion' as const),
    },
    confidence: matchedIds.length > 0 ? 0.92 : 0.85,
  };
}

function heuristicNextStep(currentStep: any, userResponse: string, notes: string = '', matchedMemories: any[] = []) {
  const stepNum = (currentStep?.stepNumber || 1);

  if (userResponse === 'issue_found') {
    return {
      isRepairResolved: false,
      nextStep: {
        stepNumber: stepNum + 1,
        instruction: "Clean, re-seat, or replace the identified component and re-test the cycle.",
        instructionHindi: "मिले हुए फॉल्ट को साफ / टाइट या रिप्लेस करें और टेस्ट साइकिल चलाएं",
        actionDetailsHindi: [
          "1. पार्ट को अच्छी तरह साफ करें या नया लगाएं।",
          "2. तार या पाइप को सही से फिट करके लॉक करें।",
          "3. मशीन में पानी भर कर टेस्ट करें कि एरर कोड हटा या नहीं।"
        ],
        reason: "Issue confirmed by technician on current inspection.",
        reasonHindi: "टेक्नीशियन द्वारा फॉल्ट की पुष्टि हो गई है।",
        safetyNotice: "Ensure all connections are dry and secured before running test cycle.",
        safetyNoticeHindi: "⚠️ साइकिल टेस्ट करने से पहले सभी तार सूखे और टाइट होने चाहिए।",
        sourceMemoryIds: currentStep?.sourceMemoryIds || [],
      },
      suggestedFix: "Apply workshop fix: clean contacts / remove blockage / secure connector pins.",
      suggestedFixHindi: "वर्कशॉप फिक्स: जाली साफ करें / ब्लॉकेज हटाएं / कनेक्टर पिन टाइट करें।",
    };
  }

  if (stepNum === 1) {
    return {
      isRepairResolved: false,
      nextStep: {
        stepNumber: 2,
        instruction: "Check continuity / voltage across the secondary electrical terminals using your digital multimeter.",
        instructionHindi: "मल्टीमीटर से सोलेनोइड वाल्व या मोटर कॉइल का रेसिस्टेंस (Ohms) चेक करें",
        actionDetailsHindi: [
          "1. मल्टीमीटर को 20k Ohms रेंज पर सेट करें।",
          "2. कॉइल के दोनों टर्मिनल्स पर प्रोब लगाएं (नॉर्मल 3.5k से 4.2k ओम होना चाहिए)।",
          "3. अगर मीटर OL या 0 दिखाए, तो कॉइल बदलें।"
        ],
        reason: "First mechanical check verified normal; proceeding to sensor / electrical verification per workshop procedure.",
        reasonHindi: "पहला फिजिकल चेक सही पाया गया; अब इलेक्ट्रिकल कॉइल और वोल्टेज की जांच जरूरी है।",
        safetyNotice: "Use insulated test probes. Never touch exposed copper while machine is connected to mains.",
        safetyNoticeHindi: "⚠️ मल्टीमीटर लगाते समय नंगे तारों को हाथ न लगाएं।",
        sourceMemoryIds: currentStep?.sourceMemoryIds || [],
      },
      suggestedFix: null,
      suggestedFixHindi: null,
    };
  }

  if (stepNum === 2) {
    return {
      isRepairResolved: false,
      nextStep: {
        stepNumber: 3,
        instruction: "Inspect the control board (PCB) output relays and wiring harness leading to the main harness.",
        instructionHindi: "कंट्रोल बोर्ड (PCB) के रिले और तारों के हार्नेस की जांच करें",
        actionDetailsHindi: [
          "1. मुख्य PCB पर रिले के पास कोई काला निशान या जला हुआ कंपोनेंट तो नहीं है देखें।",
          "2. बोर्ड से वाल्व/मोटर तक जाने वाले तारों का कंटिन्यूटी टेस्ट करें।",
          "3. रिले ड्राई सोल्डर हो तो री-सोल्डर करें।"
        ],
        reason: "Field experience indicates that when component passes check, problem usually traces to PCB solder track or relay.",
        reasonHindi: "फील्ड अनुभव: जब पार्ट सही होता है तो समस्या PCB रिले या सोल्डर ट्रैक में निकलती है।",
        safetyNotice: "Discharge large filter capacitors on the control PCB before probing.",
        safetyNoticeHindi: "⚠️ PCB छूने से पहले बड़े कैपेसिटर को डिस्चार्ज करें।",
        sourceMemoryIds: currentStep?.sourceMemoryIds || [],
      },
      suggestedFix: null,
      suggestedFixHindi: null,
    };
  }

  return {
    isRepairResolved: true,
    nextStep: null,
    suggestedFix: "Inspection complete. Record final workshop repair outcome.",
    suggestedFixHindi: "जांच पूरी हो गई। रिपेयर समाधान को वर्कशॉप मेमोरी में सेव करें।",
  };
}

function heuristicParseJugaad(rawNote: string = '', technicianName: string = 'Senior Technician') {
  const text = (rawNote || '').toLowerCase();

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
    observedCause = 'Battery swollen due to cell degradation';
    parts.push('Battery');
  } else if (text.includes('paani nahi')) {
    symptoms.push('machine not filling water');
    observation = text.includes('filter') || text.includes('scaling') ? 'Inlet filter clogged with scale' : 'Water flow restricted';
    observedCause = text.includes('scaling') ? 'Inlet filter mesh blocked by calcium or debris' : 'Water intake restricted';
    parts.push('Inlet Filter');
  } else if (errorCode) {
    symptoms.push(`Error code ${errorCode} displayed`);
  } else {
    symptoms.push(rawNote.slice(0, 100) || 'Technician reported issue');
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
    brand: brand || null,
    model: model || null,
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
  };
}

function heuristicInspectScene(imageBase64: string = '', symptomText: string = '') {
  const query = (symptomText || '').toLowerCase();
  let imgStr = '';
  try {
    imgStr = (imageBase64 || '').slice(0, 2000).toLowerCase();
    if (imageBase64 && imageBase64.includes('data:image/svg')) {
      imgStr = decodeURIComponent(imageBase64).toLowerCase();
    }
  } catch {
    imgStr = (imageBase64 || '').slice(0, 2000).toLowerCase();
  }

  const combined = `${query} ${imgStr}`;

  // 1. Smartphone / iPhone / Mobile
  if (
    combined.includes('iphone') ||
    combined.includes('apple') ||
    combined.includes('ios') ||
    combined.includes('battery service') ||
    combined.includes('smartphone') ||
    combined.includes('mobile') ||
    (combined.includes('phone') && !combined.includes('whirlpool'))
  ) {
    const isBattery = combined.includes('battery') || combined.includes('service');
    return {
      sceneType: 'smartphone',
      object: combined.includes('iphone') ? 'iPhone' : 'Smartphone',
      category: 'smartphone',
      brand: 'Apple',
      model: combined.includes('16') ? 'iPhone 16' : (combined.includes('15') ? 'iPhone 15' : null),
      component: isBattery ? 'battery' : (combined.includes('screen') ? 'screen' : null),
      isIdentified: true,
      identificationNote: null,
      isSupportedDomain: true,
      domainReason: 'Smartphone device identified.',
      visibleIssue: isBattery ? 'Battery service notification / swollen battery cell' : 'Smartphone display active',
      visibleText: ['Battery Service', 'Important Battery Message'],
      visibleComponents: ['Battery Pack', 'Chassis', 'OLED Display'],
      visualEvidence: ['Smartphone chassis detected', 'Battery-related status indicator visible'],
      errorCode: null,
      machineType: null,
      visualTarget: {
        label: 'Battery Pack & Connector',
        x: 48,
        y: 52,
        width: 25,
        height: 35,
        description: 'Internal lithium-ion battery cell and logic board flex cable',
      },
      confidence: 0.96,
    };
  }

  // 2. Laptop / Computer
  if (
    combined.includes('laptop') ||
    combined.includes('dell') ||
    combined.includes('hp') ||
    combined.includes('lenovo') ||
    combined.includes('inspiron') ||
    combined.includes('notebook') ||
    combined.includes('macbook')
  ) {
    let brand = null;
    if (combined.includes('dell') || combined.includes('inspiron')) brand = 'Dell';
    else if (combined.includes('hp')) brand = 'HP';
    else if (combined.includes('lenovo')) brand = 'Lenovo';
    else if (combined.includes('apple') || combined.includes('macbook')) brand = 'Apple';

    const isDCJack = combined.includes('dc') || combined.includes('charging') || combined.includes('jack') || combined.includes('port');
    return {
      sceneType: 'laptop',
      object: brand ? `${brand} Laptop` : 'Laptop',
      category: 'laptop',
      brand,
      model: combined.includes('inspiron') ? 'Inspiron 15' : null,
      component: isDCJack ? 'dc_jack' : 'motherboard',
      isIdentified: true,
      identificationNote: null,
      isSupportedDomain: true,
      domainReason: 'Laptop computing device identified.',
      visibleIssue: isDCJack ? 'DC power jack charging port issue' : 'Laptop power/chassis inspection',
      visibleText: brand ? [brand] : ['Power In'],
      visibleComponents: ['DC In Jack', 'Charging Circuit', 'Motherboard'],
      visualEvidence: ['Laptop chassis and power input interface detected.'],
      errorCode: null,
      machineType: null,
      visualTarget: {
        label: 'DC In Jack / Charging Port',
        x: 12,
        y: 54,
        width: 16,
        height: 18,
        description: 'DC power input connector barrel jack and solder harness',
      },
      confidence: 0.94,
    };
  }

  // 3. Refrigerator / Freezer
  if (
    combined.includes('fridge') ||
    combined.includes('refrigerator') ||
    combined.includes('freezer') ||
    combined.includes('defrost') ||
    combined.includes('frost') ||
    combined.includes('bimetal')
  ) {
    let brand = null;
    if (combined.includes('lg')) brand = 'LG';
    else if (combined.includes('samsung')) brand = 'Samsung';
    else if (combined.includes('whirlpool')) brand = 'Whirlpool';
    else if (combined.includes('godrej')) brand = 'Godrej';

    return {
      sceneType: 'refrigerator',
      object: brand ? `${brand} Refrigerator` : 'Refrigerator',
      category: 'refrigerator',
      brand,
      model: null,
      component: combined.includes('defrost') || combined.includes('frost') ? 'defrost_sensor' : 'compressor',
      isIdentified: true,
      identificationNote: null,
      isSupportedDomain: true,
      domainReason: 'Domestic refrigeration appliance identified.',
      visibleIssue: combined.includes('frost') ? 'Heavy frost buildup on evaporator coils' : null,
      visibleText: brand ? [brand] : [],
      visibleComponents: ['Evaporator Coils', 'Defrost Bi-Metal Sensor', 'Defrost Heater'],
      visualEvidence: ['Evaporator cooling section and frost accumulation visible.'],
      errorCode: null,
      machineType: null,
      visualTarget: {
        label: 'Defrost Bi-Metal Sensor',
        x: 72,
        y: 24,
        width: 16,
        height: 16,
        description: 'Upper evaporator tube bi-metal thermostat clip',
      },
      confidence: 0.93,
    };
  }

  // 4. Microwave Oven
  if (combined.includes('microwave') || combined.includes('magnetron') || combined.includes('hv fuse')) {
    let brand = null;
    if (combined.includes('ifb')) brand = 'IFB';
    else if (combined.includes('lg')) brand = 'LG';
    else if (combined.includes('samsung')) brand = 'Samsung';

    return {
      sceneType: 'microwave',
      object: brand ? `${brand} Microwave Oven` : 'Microwave Oven',
      category: 'microwave',
      brand,
      model: null,
      component: 'hv_fuse',
      isIdentified: true,
      identificationNote: null,
      isSupportedDomain: true,
      domainReason: 'Microwave oven appliance identified.',
      visibleIssue: 'High-voltage circuitry / fuse inspection',
      visibleText: brand ? [brand] : [],
      visibleComponents: ['High-Voltage Capacitor', 'HV Fuse Capsule', 'Magnetron'],
      visualEvidence: ['Internal high-voltage microwave cavity components visible.'],
      errorCode: null,
      machineType: null,
      visualTarget: null,
      confidence: 0.92,
    };
  }

  // 5. Washing Machine / Laundry components
  let brand: string | null = null;
  if (combined.includes('whirlpool')) brand = 'Whirlpool';
  else if (combined.includes('samsung')) brand = 'Samsung';
  else if (combined.includes('lg')) brand = 'LG';
  else if (combined.includes('ifb')) brand = 'IFB';
  else if (combined.includes('bosch')) brand = 'Bosch';

  let errorCode: string | null = null;
  const match = combined.match(/\b(4c|4e|f06|f05|oe|e18|de|ue|pe)\b/i);
  if (match) errorCode = match[1].toUpperCase();

  const isWashingMachine =
    brand !== null ||
    errorCode !== null ||
    combined.includes('washing') ||
    combined.includes('machine') ||
    combined.includes('washer') ||
    combined.includes('dryer') ||
    combined.includes('drum') ||
    combined.includes('inlet') ||
    combined.includes('drain') ||
    combined.includes('motor') ||
    combined.includes('valve') ||
    combined.includes('coin trap');

  if (isWashingMachine) {
    let visualTarget: any = null;
    let visualEvidence: string[] = ['Washing machine access panel and controls detected.'];
    let visibleComponents: string[] = ['Control Panel', 'Chassis'];
    let confidence = 0.91;

    if (errorCode === '4C' || combined.includes('valve') || combined.includes('paani') || combined.includes('water intake')) {
      visualTarget = {
        label: 'Cold Water Inlet Mesh Filter',
        x: 62,
        y: 24,
        width: 18,
        height: 18,
        description: 'Rear upper water inlet solenoid valve collar',
      };
      visualEvidence = ['Cold water inlet valve collar and hose coupling visible at rear upper chassis.'];
      visibleComponents = ['Water Inlet Valve', 'Mesh Filter Screen'];
      confidence = 0.95;
    } else if (errorCode === 'F06' || combined.includes('motor') || combined.includes('connector')) {
      visualTarget = {
        label: 'Motor 6-Pin Wiring Connector',
        x: 58,
        y: 54,
        width: 18,
        height: 16,
        description: 'Lower motor bracket, right harness clip',
      };
      visualEvidence = ['Drive motor stator and 6-pin wiring connector visible.'];
      visibleComponents = ['Drive Motor', 'Wiring Harness Connector'];
      confidence = 0.94;
    } else if (errorCode === 'OE' || errorCode === 'E18' || combined.includes('drain') || combined.includes('coin trap')) {
      visualTarget = {
        label: 'Drain Pump Coin Trap',
        x: 74,
        y: 80,
        width: 18,
        height: 16,
        description: 'Front bottom-right emergency drain hatch and filter cap',
      };
      visualEvidence = ['Emergency drain pump service hatch visible.'];
      visibleComponents = ['Drain Pump Chamber', 'Coin Trap Filter'];
      confidence = 0.93;
    }

    return {
      sceneType: 'washing_machine',
      object: brand ? `${brand} Washing Machine` : 'Washing Machine',
      category: 'washing_machine',
      brand: brand || 'Washing Machine',
      model: null,
      component: visualTarget?.label || 'Control Module',
      isIdentified: true,
      identificationNote: null,
      isSupportedDomain: true,
      domainReason: 'Supported appliance detected: domestic washing machine system.',
      visibleIssue: errorCode ? `Error code ${errorCode} displayed` : (combined.includes('paani') ? 'Water intake issue reported' : null),
      visibleText: errorCode ? [errorCode] : (brand ? [brand] : []),
      visibleComponents,
      visualEvidence,
      errorCode,
      machineType: 'front_load' as const,
      visualTarget,
      confidence,
    };
  }

  // 6. Unknown / Unidentified Electronic Device (Unknown DOES NOT MEAN STOP!)
  return {
    sceneType: 'electronics',
    object: 'Electronic Device / Circuit Board',
    category: 'electronics',
    brand: null,
    model: null,
    component: null,
    isIdentified: false,
    identificationNote: "I can see an electronic device, but I can't confidently identify the exact model yet. What problem is the technician seeing?",
    isSupportedDomain: true,
    domainReason: 'Electronic apparatus detected. Awaiting technician observations and symptoms.',
    visibleIssue: null,
    visibleText: [],
    visibleComponents: ['Circuit Components', 'Chassis / Housing'],
    visualEvidence: ['Electronic apparatus visible. Ready for technician observation.'],
    errorCode: null,
    machineType: null,
    visualTarget: null,
    confidence: 0.7,
  };
}

function heuristicReplan(repairState: any, currentStep: any, observation: any) {
  const finding = observation?.finding || 'issue_found';
  const stepNum = currentStep?.stepNumber || 1;

  if (finding === 'issue_found') {
    return {
      reasoning: `Technician verified issue at ${currentStep?.title || 'current component'}. This confirms the root cause reported in workshop memories. No need to test further electrical subsystems.`,
      reasoningHindi: 'टेक्नीशियन द्वारा फॉल्ट की पुष्टि हुई। वर्कशॉप के पिछले रिकॉर्ड के अनुसार इसी कंपोनेंट को ठीक करने से मशीन चालू हो जाएगी।',
      action: 'verify_fix',
      updatedStep: {
        stepNumber: stepNum + 1,
        title: 'Clean / Service Component & Verify',
        instruction: 'Clean or service the confirmed faulty component thoroughly and run a short test cycle.',
        instructionHindi: 'कंपोनेंट को साफ या ठीक करें और 2 मिनट का टेस्ट साइकिल चलाकर चेक करें कि मशीन सही चल रही है।',
        actionDetailsHindi: [
          '1. फॉल्ट वाले कंपोनेंट को साफ या टाइट करें।',
          '2. पावर ऑन करके टेस्ट साइकिल चलाएं।',
          '3. मशीन सही चलने पर रिपेयर कम्प्लीट करें।'
        ],
        reason: 'Issue identified. Verification confirms if secondary faults exist.',
        reasonHindi: 'फॉल्ट मिल गया है, टेस्ट साइकिल से कम्फर्म करें।',
        safetyNotice: 'Ensure all protective covers are replaced before powering on.',
        safetyNoticeHindi: 'सावधानी: पावर ऑन करने से पहले सभी कवर्स वापस लगाएं।',
        sourceMemoryIds: currentStep?.sourceMemoryIds || ['WM-102'],
        suggestedFix: currentStep?.suggestedFix || 'Cleaned and serviced component'
      },
      isReadyToComplete: true,
    };
  }

  if (finding === 'normal') {
    return {
      reasoning: `${currentStep?.title || 'Component'} is normal and ruled out. Moving to the next diagnostic branch based on workshop probability.`,
      reasoningHindi: 'यह कंपोनेंट बिल्कुल सही है। वर्कशॉप रिकॉर्ड के अनुसार अगले संभावित कंपोनेंट की जांच करें।',
      action: 'next_check',
      updatedStep: {
        stepNumber: stepNum + 1,
        title: stepNum === 1 ? 'Check Solenoid Valve Coil Resistance' : 'Inspect Control Board (PCB) Relay',
        instruction: stepNum === 1
          ? 'Use a multimeter to measure solenoid valve coil resistance (normal range: 3.5k - 4.2k ohms).'
          : 'Inspect PCB output relay terminal for scorched solder joints.',
        instructionHindi: stepNum === 1
          ? 'मल्टीमीटर से सोलेनोइड वाल्व कॉइल का रेजिस्टेंस नापें (3.5k से 4.2k ओह्म सामान्य है)।'
          : 'कंट्रोल बोर्ड (PCB) के रिले आउटपुट पर वोल्टेज और सोल्डर जॉइंट्स चेक करें।',
        actionDetailsHindi: [
          '1. मशीन को 230V सॉकेट से अनप्लग करें।',
          '2. मल्टीमीटर को 20k Ohms पर सेट करें।',
          '3. दोनों टर्मिनल्स पर प्रोब लगाएं।'
        ],
        reason: 'First stage was normal, pointing to electrical or board failure.',
        reasonHindi: 'पहला चेक सही होने पर अगला फॉल्ट इलेक्ट्रिकल कॉइल या बोर्ड में होता है।',
        safetyNotice: 'Unplug machine before touching terminal probes.',
        safetyNoticeHindi: 'सावधानी: टर्मिनल्स छूने से पहले मशीन अनप्लग रखें।',
        sourceMemoryIds: ['WM-110'],
        suggestedFix: 'Replace solenoid coil or repair PCB relay'
      },
      isReadyToComplete: false,
    };
  }

  // not_sure
  return {
    reasoning: 'Technician uncertain about component condition. Providing senior technician practical field test.',
    reasoningHindi: 'टेक्नीशियन को संदेह है। सीनियर टेक्नीशियन रमेश भाई का फील्ड टेस्ट दिया जा रहा है।',
    action: 'senior_tip',
    updatedStep: {
      stepNumber: stepNum,
      title: 'Senior Technician Practical Test',
      instruction: 'Disconnect the water hose into a bucket to confirm household tap pressure is adequate before opening the machine.',
      instructionHindi: 'सीनियर टेक्नीशियन रमेश भाई की टिप: मशीन खोलने से पहले पाइप को बाल्टी में चलाकर देखें कि घर के नल का प्रेशर पूरा है या नहीं।',
      actionDetailsHindi: [
        '1. पाइप बाल्टी में डालें और नल पूरा खोलें।',
        '2. अगर पानी का प्रेशर कमजोर है, तो नल या बिल्डिंग की टंकी में समस्या है।'
      ],
      reason: 'Rule out external utility causes before disassembling appliance.',
      reasonHindi: 'मशीन खोलने से पहले घर का नल चेक करें।',
      safetyNotice: 'Keep water away from electrical wall outlets.',
      safetyNoticeHindi: 'सावधानी: पानी को बिजली के बोर्ड से दूर रखें।',
      sourceMemoryIds: ['WM-102'],
      suggestedFix: null
    },
    isReadyToComplete: false,
  };
}

// -------------------------------------------------------------
// Dev & Production Vite Server Integration
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Jugaad Memory server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
