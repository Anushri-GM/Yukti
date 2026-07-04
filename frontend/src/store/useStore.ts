import { create } from 'zustand';

export interface Ward {
  id: number;
  ward: string;
  population: number;
  literacy_rate: number;
  vulnerability_index: number;
  water_access_pct: number;
  road_connectivity_pct: number;
  health_center_distance_km: number;
}

export interface CitizenSubmission {
  id: number;
  text: string;
  voice_url?: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  ward: string;
  category: string;
  urgency: number;
  summary: string;
  affected_infrastructure: string;
  confidence: number;
  status: string;
  created_at: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  category: string;
  cost: number;
  affected_population: number;
  ward: string;
  urgency_score: number;
  priority_score: number;
  status: string;
  justification: string;
  submission_id?: number;
  is_selected?: boolean;
}

interface SimulationWeights {
  urgency: number;
  impact: number;
  demographics: number;
  cost_efficiency: number;
}

interface StoreState {
  wards: Ward[];
  submissions: CitizenSubmission[];
  projects: Project[];
  activeTab: 'dashboard' | 'citizen' | 'officer' | 'simulator';
  
  // Simulator states
  simulatedBudget: number;
  simulatedFocus: string;
  simulatedWeights: SimulationWeights;
  simulatedMultiplier: number;
  simulationResult: {
    total_cost: number;
    total_impact_score: number;
    projects: Project[];
    explanation: string;
  } | null;
  isSimulating: boolean;
  
  // Set tab
  setActiveTab: (tab: 'dashboard' | 'citizen' | 'officer' | 'simulator') => void;
  
  // Actions
  fetchWards: () => Promise<void>;
  fetchSubmissions: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  submitGrievance: (text: string, ward: string, imageFile: File | null) => Promise<boolean>;
  verifySubmission: (id: number, status: string, category: string, urgency: number, convert: boolean) => Promise<void>;
  runSimulation: (budget: number, weights: SimulationWeights, focus: string, multiplier: number) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  wards: [],
  submissions: [],
  projects: [],
  activeTab: 'dashboard',
  
  // Default simulation inputs
  simulatedBudget: 10000000, // 1 Crore default
  simulatedFocus: '',
  simulatedWeights: {
    urgency: 0.3,
    impact: 0.3,
    demographics: 0.2,
    cost_efficiency: 0.2,
  },
  simulatedMultiplier: 1.0,
  simulationResult: null,
  isSimulating: false,
  
  setActiveTab: (activeTab) => set({ activeTab }),

  fetchWards: async () => {
    try {
      const res = await fetch('/api/v1/wards');
      if (res.ok) {
        const data = await res.json();
        set({ wards: data });
      }
    } catch (e) {
      console.error("Error fetching wards:", e);
    }
  },

  fetchSubmissions: async () => {
    try {
      const res = await fetch('/api/v1/citizens/submissions');
      if (res.ok) {
        const data = await res.json();
        set({ submissions: data });
      }
    } catch (e) {
      console.error("Error fetching submissions:", e);
    }
  },

  fetchProjects: async () => {
    try {
      const res = await fetch('/api/v1/projects');
      if (res.ok) {
        const data = await res.json();
        set({ projects: data });
      }
    } catch (e) {
      console.error("Error fetching projects:", e);
    }
  },

  submitGrievance: async (text, ward, imageFile) => {
    try {
      const formData = new FormData();
      if (text) formData.append('text', text);
      if (ward) formData.append('ward', ward);
      if (imageFile) formData.append('image', imageFile);
      
      const res = await fetch('/api/v1/citizens/submit', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        await get().fetchSubmissions();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Error submitting grievance:", e);
      return false;
    }
  },

  verifySubmission: async (id, status, category, urgency, convert) => {
    try {
      const queryParams = new URLSearchParams({
        status,
        category,
        urgency: urgency.toString(),
        convert_to_project: convert.toString()
      });
      const res = await fetch(`/api/v1/officers/submissions/${id}/verify?${queryParams}`, {
        method: 'PUT'
      });
      if (res.ok) {
        await get().fetchSubmissions();
        await get().fetchProjects();
      }
    } catch (e) {
      console.error("Error verifying submission:", e);
    }
  },

  runSimulation: async (budget, weights, focus, multiplier) => {
    set({ isSimulating: true });
    try {
      const res = await fetch('/api/v1/mps/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          budget,
          weights,
          priority_focus: focus || null,
          vulnerability_multiplier: multiplier,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        set({ 
          simulationResult: data,
          simulatedBudget: budget,
          simulatedWeights: weights,
          simulatedFocus: focus,
          simulatedMultiplier: multiplier
        });
      }
    } catch (e) {
      console.error("Error running simulation:", e);
    } finally {
      set({ isSimulating: false });
    }
  }
}));
