export interface VisualTarget {
  label: string;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  width: number;
  height: number;
  description: string;
}

export interface MemoryAppliance {
  category: string; // e.g. 'smartphone', 'laptop', 'washing_machine', 'refrigerator', 'microwave', 'television', 'audio', 'electronics'
  brand: string;
  model?: string;
  type?: string;
}

export interface RepairMemory {
  id: string; // e.g. "WM-101", "SP-101", "LP-101", "WM-REAL-001"
  sourceType: 'technician' | 'demo' | 'real';
  technicianName: string;
  createdAt: string;
  updatedAt?: string;
  workshopId: string;
  appliance: MemoryAppliance;
  errorCode?: string;
  symptoms: string[];
  observations?: string[];
  diagnosis: string;
  steps: string[];
  cause: string;
  fix: string;
  components: string[];
  photos: string[];
  photoUrl: string;
  visualTarget?: VisualTarget | null;
  originalNote: string;
  confidence: number;
  outcome: 'confirmed' | 'successful' | 'partially_resolved' | 'escalated' | string;
  tags: string[];
  usageCount: number;

  // Multi-device fields
  category?: string;
  component?: string;
  visibleEvidence?: string[];
  observation?: string;
  firstCheck?: string;
  nextCheck?: string;

  // Compatibility fields for seamless UI operation
  brand: string;
  model?: string;
  applianceCategory: string;
  machineType?: 'front_load' | 'top_load' | 'semi_automatic' | string;
  observedCause: string;
  diagnosticSteps: string[];
  partsInvolved: string[];
  technician: string;
  workshop: string;
  isDemo?: boolean;
  timesReferenced: number;
  lastReferencedAt?: string;
  audioNoteDuration?: string;
}

export interface SceneInspectionResult {
  sceneType: string; // e.g. "smartphone", "laptop", "washing_machine", "refrigerator", "microwave", "television", "electronics", "audio", "unidentified_device"
  object: string; // e.g. "iPhone", "Dell Inspiron Laptop", "Samsung Washing Machine", "Electronic Circuit Board"
  category: string; // e.g. "smartphone", "computing", "appliance", "electronics"
  brand: string | null; // e.g. "Apple", "Dell", "Samsung", null
  model: string | null; // e.g. "iPhone 16", "Inspiron 15", null
  component?: string | null; // e.g. "battery", "dc_jack", "inlet_valve"
  isIdentified?: boolean; // true if device recognized, false if exact model uncertain
  identificationNote?: string | null; // e.g. "I can see an electronic device, but I can't confidently identify the exact model yet."
  isSupportedDomain?: boolean; // Universal: all repairable devices are supported
  domainReason?: string; // Informative note on identified object
  visibleIssue: string | null; // objective visual finding, null if none
  visibleText: string[];
  visibleComponents: string[];
  visualEvidence: string[];
  errorCode: string | null;
  machineType?: string | null;
  visualTarget?: VisualTarget | null;
  confidence: number;
}

export type AgentStatus =
  | 'idle'
  | 'observing'
  | 'searching_memory'
  | 'planning'
  | 'waiting_for_technician'
  | 'servicing'
  | 'replanning'
  | 'verifying_repair'
  | 'saving_memory'
  | 'complete'
  | 'uncertain';

export interface AgentObservation {
  stepNumber: number;
  action: string;
  finding: 'normal' | 'issue_found' | 'not_sure';
  technicianNote?: string;
  timestamp: string;
}

export interface AgentPlanStep {
  stepNumber: number;
  title?: string;
  instruction: string;
  instructionHindi?: string;
  actionDetailsHindi?: string[];
  reason: string;
  reasonHindi?: string;
  safetyNotice?: string;
  safetyNoticeHindi?: string;
  sourceMemoryIds: string[];
  sourceType?: 'workshop_memory' | 'ai_suggestion' | 'technician_observation';
  visualTarget?: VisualTarget | null;
  visualConfidence?: number;
  status?: 'pending' | 'active' | 'completed' | 'skipped' | 'modified';
  response?: 'normal' | 'issue_found' | 'not_sure';
  notes?: string;
  suggestedFix?: string;
  suggestedFixHindi?: string;
}

export interface AgentToolCall {
  toolName:
    | 'inspectScene'
    | 'checkDomain'
    | 'searchWorkshopMemory'
    | 'compareWithMemory'
    | 'createRepairPlan'
    | 'showDiagnosticTarget'
    | 'recordTechnicianObservation'
    | 'replan'
    | 'verifyRepair'
    | 'completeRepair'
    | 'saveRepairMemory';
  input: any;
  output: any;
  timestamp: string;
  durationMs?: number;
}

export interface ReplanEvent {
  timestamp: string;
  triggerObservation: string;
  reasoning: string;
  previousPlanStepTitle?: string;
  newPlanStepTitle: string;
}

export interface RepairState {
  repairId: string;
  workshopId: string;
  status: AgentStatus;
  startedAt: string;
  photoUrl: string;
  currentImage?: string;
  symptomText: string;
  scene?: SceneInspectionResult | null;
  detectedDevice?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  visibleEvidence?: string[];
  symptoms?: string[];
  isSupportedDomain?: boolean;
  outOfDomainReason?: string | null;
  planSource?: 'workshop_memory' | 'ai_suggestion' | 'none';
  appliance: {
    category: string | null;
    brand: string | null;
    model?: string | null;
    type?: string | null;
  };
  errorCode: string | null;
  retrievedMemories: Array<{
    memory: RepairMemory;
    similarity: number;
    matchReasons: string[];
    confirmedOutcome: boolean;
  }>;
  workshopMemories?: Array<{
    memory: RepairMemory;
    similarity: number;
    matchReasons: string[];
    confirmedOutcome: boolean;
  }>;
  plan: AgentPlanStep[];
  currentPlan?: AgentPlanStep[];
  currentStepIndex: number;
  currentStep?: number;
  observations: AgentObservation[];
  technicianObservations?: AgentObservation[];
  previousObservations?: AgentObservation[];
  replanHistory: ReplanEvent[];
  toolCalls: AgentToolCall[];
  technicianConfirmations: Array<{
    question: string;
    answer: boolean;
    timestamp: string;
  }>;
  finalOutcome: 'confirmed' | 'partial' | 'escalated' | null;
  outcome?: 'confirmed' | 'partial' | 'escalated' | null;
  language?: 'en' | 'hi' | 'hinglish';
  savedMemoryId?: string | null;
  technicianConfirmedProblem?: boolean;
  technicianConfirmedFinding?: string | null;
  technicianObservationText?: string | null;
}

export interface DiagnosticStep extends AgentPlanStep {}

export interface RepairSession {
  id: string;
  startedAt: string;
  photoUrl?: string;
  symptomInput: string;
  language: 'en' | 'hi' | 'hinglish';
  detectedAppliance?: {
    brand?: string;
    model?: string;
    category?: string;
    type?: string;
    errorCode?: string;
  };
  matchingMemories: Array<{
    memory: RepairMemory;
    relevanceScore: number;
    matchReason: string;
    sharedFactors: string[];
  }>;
  currentStepIndex: number;
  steps: DiagnosticStep[];
  isCompleted: boolean;
  finalFix?: {
    category: string;
    details: string;
    technicianName: string;
    savedAsMemoryId?: string;
  };
}

export interface CaptureDraft {
  rawNote: string;
  photoUrls: string[];
  structured: {
    brand: string;
    model?: string;
    errorCode?: string;
    symptoms: string[];
    observedCause: string;
    firstCheck: string;
    nextCheck?: string;
    fix: string;
    partsInvolved: string[];
  };
  confidence: number;
  technicianName: string;
}

export interface DevDebugInfo {
  detectedIntent: string;
  rawResponse?: any;
  retrievalMatches: Array<{ id: string; score: number; reason: string }>;
  sourceMemoryIds: string[];
  confidence: number;
  activeStepNumber: number;
  latencyMs?: number;
  isAiPowered: boolean;
  isFallback: boolean;
  // Agentic extensions
  repairId?: string;
  agentStatus?: AgentStatus;
  currentPlan?: string;
  toolCallsCount?: number;
  replanEventsCount?: number;
  lastObservation?: string;
  replanReason?: string;
  savedMemoryId?: string | null;
  toolCalls?: AgentToolCall[];
  replanHistory?: ReplanEvent[];
}
