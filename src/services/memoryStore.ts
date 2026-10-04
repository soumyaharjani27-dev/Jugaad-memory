import { RepairMemory } from '../types';
import { DEMO_MEMORIES } from '../data/demoMemories';

const STORAGE_KEY = 'jugaad_workshop_memories_v2';
const LEGACY_STORAGE_KEY = 'jugaad_workshop_memories_v1';
const DELETED_IDS_KEY = 'jugaad_deleted_memory_ids_v2';

export class MemoryStoreService {
  private memories: RepairMemory[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadFromStorage();
    this.fetchFromServer();
  }

  private getDeletedIds(): Set<string> {
    try {
      const raw = localStorage.getItem(DELETED_IDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (e) {
      // Ignored
    }
    return new Set();
  }

  private recordDeletedId(id: string): void {
    try {
      const set = this.getDeletedIds();
      set.add(id);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
    } catch (e) {
      // Ignored
    }
  }

  private unmarkDeletedId(id: string): void {
    try {
      const set = this.getDeletedIds();
      if (set.has(id)) {
        set.delete(id);
        localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
      }
    } catch (e) {
      // Ignored
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifySubscribers(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error('Error in memoryStore listener:', e);
      }
    }
  }

  private loadFromStorage(): void {
    const deletedIds = this.getDeletedIds();
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize existing items and exclude permanently deleted memories
          this.memories = parsed
            .filter((m: any) => m && m.id && !deletedIds.has(m.id))
            .map(this.normalizeMemory);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using demo memories', e);
    }
    // Initialize with demo memories, excluding any deleted IDs
    this.memories = DEMO_MEMORIES
      .filter(m => !deletedIds.has(m.id))
      .map(this.normalizeMemory);
    this.persist();
  }

  private async fetchFromServer(): Promise<void> {
    const deletedIds = this.getDeletedIds();
    try {
      const res = await fetch('/api/memories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.memories) && data.memories.length > 0) {
          // Merge server memories with local memories, ignoring deleted ones
          const serverMap = new Map<string, RepairMemory>();
          for (const m of data.memories) {
            if (m && m.id && !deletedIds.has(m.id)) {
              serverMap.set(m.id, this.normalizeMemory(m));
            }
          }
          // Also keep any local real memories that might not be on server yet
          for (const m of this.memories) {
            if (m.sourceType === 'real' && !serverMap.has(m.id) && !deletedIds.has(m.id)) {
              serverMap.set(m.id, m);
              this.syncToServer(m);
            }
          }
          this.memories = Array.from(serverMap.values());
          this.persist();
          this.notifySubscribers();
        }
      }
    } catch (e) {
      // Offline or server not ready, continue with localStorage
    }
  }

  private async syncToServer(memory: RepairMemory): Promise<void> {
    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memory),
      });
    } catch (e) {
      // Handled gracefully, local storage is authoritative
    }
  }

  private async deleteFromServer(id: string): Promise<void> {
    try {
      await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    } catch (e) {
      // Ignored
    }
  }

  private normalizeMemory(m: any): RepairMemory {
    const isReal = m.sourceType === 'real' || m.isDemo === false;
    const category = m.category || m.appliance?.category || m.applianceCategory || 'electronics';
    const brand = m.brand || m.appliance?.brand || 'Generic Device';
    const model = m.model || m.appliance?.model;
    const errorCode = m.errorCode;
    const cause = m.cause || m.observedCause || m.fix || 'Not provided';
    const fix = m.fix || 'Not provided';
    const techName = m.technicianName || m.technician || 'Workshop Technician';
    const date = m.createdAt || new Date().toISOString().split('T')[0];

    return {
      id: m.id || `WM-${Math.floor(Math.random() * 900) + 100}`,
      sourceType: isReal ? 'real' : 'demo',
      technicianName: techName,
      createdAt: date,
      updatedAt: m.updatedAt || date,
      workshopId: m.workshopId || 'demo-workshop-001',
      appliance: {
        category,
        brand,
        model,
        type: m.appliance?.type || m.machineType || 'standard',
      },
      category,
      component: m.component || (m.components && m.components[0]) || (m.partsInvolved && m.partsInvolved[0]),
      errorCode,
      symptoms: Array.isArray(m.symptoms) ? m.symptoms : (m.symptoms ? [m.symptoms] : []),
      observations: m.observations || [],
      diagnosis: m.diagnosis || cause,
      steps: m.steps || m.diagnosticSteps || [],
      cause,
      fix,
      components: m.components || m.partsInvolved || [],
      photos: m.photos || (m.photoUrl ? [m.photoUrl] : []),
      photoUrl: m.photoUrl || (m.photos && m.photos[0]) || '',
      visualTarget: m.visualTarget || null,
      originalNote: m.originalNote || fix,
      confidence: m.confidence ?? (isReal ? 1.0 : 0.95),
      outcome: m.outcome || 'confirmed',
      tags: m.tags || [brand, category, errorCode || 'General'].filter(Boolean),
      usageCount: m.usageCount ?? (m.timesReferenced || 0),

      // Compatibility fields for seamless UI operation
      brand,
      model,
      applianceCategory: category,
      machineType: m.machineType || 'standard',
      observedCause: cause,
      diagnosticSteps: m.diagnosticSteps || m.steps || [],
      partsInvolved: m.partsInvolved || m.components || [],
      technician: techName,
      workshop: m.workshop || 'Demo Appliance Workshop',
      isDemo: !isReal,
      timesReferenced: m.timesReferenced ?? (m.usageCount || 0),
      lastReferencedAt: m.lastReferencedAt,
      audioNoteDuration: m.audioNoteDuration,
    };
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memories));
    } catch (e) {
      console.warn('Could not write to localStorage', e);
    }
  }

  public getAll(): RepairMemory[] {
    return [...this.memories];
  }

  public getRealMemories(): RepairMemory[] {
    return this.memories.filter(m => m.sourceType === 'real');
  }

  public getDemoMemories(): RepairMemory[] {
    return this.memories.filter(m => m.sourceType === 'demo');
  }

  public getById(id: string): RepairMemory | undefined {
    return this.memories.find(m => m.id === id);
  }

  public addMemory(memoryInput: Partial<RepairMemory>): RepairMemory {
    const realMemoriesCount = this.memories.filter(m => m.sourceType === 'real').length + 1;
    const padNum = String(realMemoriesCount).padStart(3, '0');
    const category = memoryInput.category || memoryInput.appliance?.category || memoryInput.applianceCategory || 'electronics';
    const prefix = category.startsWith('smart') || category.includes('phone') ? 'SP' : (category.includes('laptop') || category.includes('comp') ? 'LP' : 'WM');
    const newId = memoryInput.id || `${prefix}-REAL-${padNum}`;

    const brand = memoryInput.appliance?.brand || memoryInput.brand || 'Device';
    const model = memoryInput.appliance?.model || memoryInput.model;
    const errorCode = memoryInput.errorCode ? memoryInput.errorCode.toUpperCase() : undefined;
    const symptoms = memoryInput.symptoms && memoryInput.symptoms.length > 0 ? memoryInput.symptoms : ['Technician observed issue'];
    const fix = memoryInput.fix?.trim() || 'Serviced and verified normal function';
    const cause = memoryInput.cause?.trim() || memoryInput.observedCause?.trim() || fix;
    const techName = memoryInput.technicianName || memoryInput.technician || 'Workshop Technician';
    const date = new Date().toISOString().split('T')[0];

    const newMemory: RepairMemory = this.normalizeMemory({
      ...memoryInput,
      id: newId,
      sourceType: 'real',
      technicianName: techName,
      createdAt: date,
      updatedAt: date,
      workshopId: memoryInput.workshopId || 'demo-workshop-001',
      appliance: {
        category,
        brand,
        model,
        type: memoryInput.appliance?.type || memoryInput.machineType || 'standard',
      },
      category,
      brand,
      model,
      errorCode,
      symptoms,
      cause,
      fix,
      isDemo: false,
      outcome: 'confirmed',
      confidence: 1.0,
      usageCount: 0,
      timesReferenced: 0,
    });

    // Remove if already exists with this ID
    this.memories = this.memories.filter(m => m.id !== newId);
    this.unmarkDeletedId(newId);
    // Prepend real memory to the front of list
    this.memories.unshift(newMemory);

    this.persist();
    this.syncToServer(newMemory);
    this.notifySubscribers();
    return newMemory;
  }

  public updateMemory(id: string, updates: Partial<RepairMemory>): RepairMemory | null {
    const idx = this.memories.findIndex(m => m.id === id);
    if (idx < 0) return null;

    const updated = this.normalizeMemory({
      ...this.memories[idx],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0],
    });
    this.memories[idx] = updated;
    this.persist();
    this.syncToServer(updated);
    this.notifySubscribers();
    return updated;
  }

  public deleteMemory(id: string): boolean {
    const initialLen = this.memories.length;
    this.memories = this.memories.filter(m => m.id !== id);
    if (this.memories.length !== initialLen) {
      this.recordDeletedId(id);
      this.persist();
      this.deleteFromServer(id);
      this.notifySubscribers();
      return true;
    }
    return false;
  }

  public recordUsage(memoryIds: string[]): void {
    const today = new Date().toISOString().split('T')[0];
    let updated = false;

    this.memories = this.memories.map(m => {
      if (memoryIds.includes(m.id)) {
        updated = true;
        const count = (m.usageCount || m.timesReferenced || 0) + 1;
        return {
          ...m,
          usageCount: count,
          timesReferenced: count,
          lastReferencedAt: today,
        };
      }
      return m;
    });

    if (updated) {
      this.persist();
      this.notifySubscribers();
    }
  }

  public resetToDemo(): void {
    // Preserve any real memories created by the user, only reset demo memories!
    const realMemories = this.memories.filter(m => m.sourceType === 'real');
    this.memories = [...realMemories, ...DEMO_MEMORIES.map(this.normalizeMemory)];
    this.persist();
    this.notifySubscribers();
  }

  public resetAll(): void {
    this.memories = DEMO_MEMORIES.map(this.normalizeMemory);
    this.persist();
    fetch('/api/memories/reset', { method: 'POST' }).catch(() => {});
    this.notifySubscribers();
  }

  public search(
    query: string,
    filters?: {
      category?: string;
      brand?: string;
      errorCode?: string;
      technician?: string;
      sourceType?: 'demo' | 'real' | 'all';
    }
  ): Array<{
    memory: RepairMemory;
    similarity: number;
    relevanceScore: number;
    matchReason: string;
    matchReasons: string[];
    sharedFactors: string[];
    confirmedOutcome: boolean;
  }> {
    const rawQuery = (query || '').toLowerCase().trim();
    const queryTokens = rawQuery.split(/\s+/).filter(Boolean);

    // Detect device category keywords
    let queryCategory: string | null = null;
    if (rawQuery.includes('phone') || rawQuery.includes('iphone') || rawQuery.includes('android') || rawQuery.includes('mobile')) {
      queryCategory = 'smartphone';
    } else if (rawQuery.includes('laptop') || rawQuery.includes('notebook') || rawQuery.includes('computer') || rawQuery.includes('pc')) {
      queryCategory = 'laptop';
    } else if (rawQuery.includes('fridge') || rawQuery.includes('refrigerator') || rawQuery.includes('freezer')) {
      queryCategory = 'refrigerator';
    } else if (rawQuery.includes('microwave') || rawQuery.includes('oven')) {
      queryCategory = 'microwave';
    } else if (rawQuery.includes('washing') || rawQuery.includes('washer') || rawQuery.includes('dryer') || rawQuery.includes('paani') || rawQuery.includes('drum')) {
      queryCategory = 'washing_machine';
    } else if (rawQuery.includes('tv') || rawQuery.includes('television')) {
      queryCategory = 'television';
    } else if (rawQuery.includes('headphone') || rawQuery.includes('earphone') || rawQuery.includes('audio')) {
      queryCategory = 'audio';
    }

    // Detect error codes in query
    const queryErrorMatch = rawQuery.match(/\b(4c|4e|f06|f05|f24|oe|ie|ue|ub|pe|e18|de|battery-service|no-charge|defrost-fail|no-heat)\b/i);
    const queryError = queryErrorMatch ? queryErrorMatch[1].toUpperCase() : null;

    // Detect brand in query
    let queryBrand: string | null = null;
    if (rawQuery.includes('apple') || rawQuery.includes('iphone')) queryBrand = 'apple';
    else if (rawQuery.includes('dell')) queryBrand = 'dell';
    else if (rawQuery.includes('hp')) queryBrand = 'hp';
    else if (rawQuery.includes('lenovo')) queryBrand = 'lenovo';
    else if (rawQuery.includes('sony')) queryBrand = 'sony';
    else if (rawQuery.includes('samsung')) queryBrand = 'samsung';
    else if (rawQuery.includes('whirlpool')) queryBrand = 'whirlpool';
    else if (rawQuery.includes('lg')) queryBrand = 'lg';
    else if (rawQuery.includes('ifb')) queryBrand = 'ifb';
    else if (rawQuery.includes('bosch')) queryBrand = 'bosch';

    // Detect component in query
    let queryComponent: string | null = null;
    if (rawQuery.includes('battery') || rawQuery.includes('swollen')) queryComponent = 'battery';
    else if (rawQuery.includes('dc jack') || rawQuery.includes('charging port') || rawQuery.includes('charge')) queryComponent = 'charging_port';
    else if (rawQuery.includes('filter') || rawQuery.includes('jaali')) queryComponent = 'filter';
    else if (rawQuery.includes('motor') || rawQuery.includes('tacho')) queryComponent = 'motor';
    else if (rawQuery.includes('pump') || rawQuery.includes('coin trap')) queryComponent = 'drain_pump';
    else if (rawQuery.includes('valve') || rawQuery.includes('solenoid')) queryComponent = 'inlet_valve';
    else if (rawQuery.includes('bimetal') || rawQuery.includes('defrost')) queryComponent = 'defrost_sensor';
    else if (rawQuery.includes('fuse')) queryComponent = 'fuse';
    else if (rawQuery.includes('screen') || rawQuery.includes('display')) queryComponent = 'display';

    const results = this.memories
      .map(memory => {
        let score = 0;
        const sharedFactors: string[] = [];
        const memCat = (memory.category || memory.appliance?.category || memory.applianceCategory || '').toLowerCase();
        const memBrand = (memory.brand || memory.appliance?.brand || '').toLowerCase();

        // Source Type Filter
        if (filters?.sourceType && filters.sourceType !== 'all') {
          if (memory.sourceType !== filters.sourceType) return null;
        }

        // Category Filter check
        if (filters?.category && filters.category !== 'All') {
          if (!memCat.includes(filters.category.toLowerCase()) && !filters.category.toLowerCase().includes(memCat)) {
            return null;
          }
        }

        // Brand Filter check
        if (filters?.brand && filters.brand !== 'All' && memBrand !== filters.brand.toLowerCase()) {
          return null;
        }
        // Error Code Filter check
        if (filters?.errorCode && filters.errorCode !== 'All' && memory.errorCode !== filters.errorCode) {
          return null;
        }
        // Technician Filter check
        if (filters?.technician && !memory.technicianName.includes(filters.technician) && !memory.technician.includes(filters.technician)) {
          return null;
        }

        // Real Workshop Memory Boost (Real field experience is prioritized)
        if (memory.sourceType === 'real') {
          score += 15;
        }

        // If empty query, return baseline score based on recency & references
        if (!rawQuery) {
          const defaultFactors: string[] = [];
          if (memory.category) {
            defaultFactors.push(`Same device category (${memory.category.replace('_', ' ')})`);
          }
          if (memory.brand && memory.brand !== 'Generic Device') {
            defaultFactors.push(`Same brand (${memory.brand})`);
          }
          defaultFactors.push('Saved workshop case');

          return {
            memory,
            similarity: 0.85,
            relevanceScore: 10 + (memory.timesReferenced || 0) + (memory.sourceType === 'real' ? 15 : 0),
            matchReason: defaultFactors.join(' · '),
            matchReasons: defaultFactors.slice(0, 3),
            sharedFactors: defaultFactors.slice(0, 3),
            confirmedOutcome: memory.outcome === 'confirmed' || memory.outcome === 'successful',
          };
        }

        // 1. Category Matching
        if (queryCategory && (memCat.includes(queryCategory) || queryCategory.includes(memCat))) {
          score += 35;
          const displayCat = memCat.charAt(0).toUpperCase() + memCat.slice(1).replace('_', ' ');
          sharedFactors.push(`Same device category (${displayCat})`);
        }

        // 2. Component Matching
        const memComponentsText = [...(memory.components || []), ...(memory.partsInvolved || []), memory.component || ''].join(' ').toLowerCase();
        if (queryComponent) {
          if (
            (queryComponent === 'battery' && (memComponentsText.includes('battery') || rawQuery.includes('battery'))) ||
            (queryComponent === 'charging_port' && (memComponentsText.includes('dc') || memComponentsText.includes('charge') || memComponentsText.includes('jack') || memComponentsText.includes('port'))) ||
            (queryComponent === 'filter' && (memComponentsText.includes('filter') || memComponentsText.includes('mesh'))) ||
            (queryComponent === 'motor' && memComponentsText.includes('motor')) ||
            (queryComponent === 'drain_pump' && (memComponentsText.includes('pump') || memComponentsText.includes('trap'))) ||
            (queryComponent === 'defrost_sensor' && (memComponentsText.includes('bimetal') || memComponentsText.includes('defrost'))) ||
            (queryComponent === 'fuse' && memComponentsText.includes('fuse'))
          ) {
            score += 35;
            sharedFactors.push(`Similar ${queryComponent.replace('_', ' ')} component`);
          }
        }

        // 3. Error Code match (High signal)
        if (queryError && memory.errorCode && memory.errorCode.toUpperCase() === queryError) {
          score += 45;
          sharedFactors.push(`Same error code (${memory.errorCode})`);
        } else if (memory.errorCode && rawQuery.includes(memory.errorCode.toLowerCase())) {
          score += 40;
          sharedFactors.push(`Same error code (${memory.errorCode})`);
        }

        // 4. Brand match
        if (queryBrand && memBrand === queryBrand) {
          score += 25;
          sharedFactors.push(`Same brand (${memory.brand})`);
        } else if (rawQuery.includes(memBrand) && memBrand.length > 2) {
          score += 20;
          sharedFactors.push(`Same brand (${memory.brand})`);
        }

        // 5. Symptoms & Notes Matching
        const fullMemoryText = [
          memory.brand,
          memory.model || '',
          memory.errorCode || '',
          memory.category || '',
          ...memory.symptoms,
          memory.observedCause,
          memory.fix,
          memory.originalNote,
          ...memory.partsInvolved,
          ...memory.components,
        ]
          .join(' ')
          .toLowerCase();

        let symptomMatched = false;
        let tokenMatches = 0;
        for (const token of queryTokens) {
          if (token.length > 2 && fullMemoryText.includes(token)) {
            tokenMatches++;
            score += 8;
          }
        }

        // Specific keyword semantics
        const keywordMap: Record<string, string[]> = {
          swollen: ['battery', 'pouch', 'puff', 'bulge', 'health'],
          battery: ['swollen', 'health', 'drain', 'charge', 'shutdown'],
          charging: ['jack', 'adapter', 'dc', 'port', 'cord', 'pin', 'usb'],
          heat: ['thermal', 'fan', 'paste', 'overheating', 'throttling'],
          frost: ['bimetal', 'heater', 'evaporator', 'defrost', 'cooling', 'ice'],
          ice: ['bimetal', 'heater', 'evaporator', 'defrost', 'freezer'],
          paani: ['water', 'inlet', 'filter', 'tap', 'fill', 'valve', 'pressure'],
          water: ['water', 'inlet', 'filter', 'tap', 'fill', 'valve', 'pressure'],
          drain: ['oe', 'e18', 'pump', 'coin', 'trap', 'impeller', 'blockage'],
          spin: ['motor', 'belt', 'f06', 'tacho', 'connector'],
          motor: ['motor', 'belt', 'f06', 'tacho', 'connector'],
        };

        for (const [key, relatedWords] of Object.entries(keywordMap)) {
          if (rawQuery.includes(key)) {
            for (const rel of relatedWords) {
              if (fullMemoryText.includes(rel)) {
                score += 10;
                symptomMatched = true;
                break;
              }
            }
          }
        }

        if (symptomMatched || tokenMatches >= 2) {
          sharedFactors.push('Similar symptom & repair context');
        }

        // Require minimum relevance score
        if (score < 18) return null;

        // Build friendly human match reasons
        const matchReasonsList = sharedFactors.length > 0 ? Array.from(new Set(sharedFactors)).slice(0, 4) : ['Similar device repair context'];
        const matchReason = matchReasonsList.join(' · ');

        // Calculate normalized similarity 0.0 to 1.0
        const similarity = Math.min(0.99, Math.max(0.68, Number((score / 90).toFixed(2))));

        return {
          memory,
          similarity,
          relevanceScore: score,
          matchReason,
          matchReasons: matchReasonsList,
          sharedFactors: matchReasonsList,
          confirmedOutcome: memory.outcome === 'confirmed' || memory.outcome === 'successful',
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r.relevanceScore > 0);

    // Sort descending by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results;
  }
}

export const memoryStore = new MemoryStoreService();
