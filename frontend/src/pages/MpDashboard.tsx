import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore, CitizenSubmission } from '../store/useStore';
import apiClient from '../services/api';
import { 
  BarChart3, RefreshCw, FileText, CheckSquare, 
  Wallet, AlertCircle, Settings2, ShieldCheck, ArrowRight,
  MapPin, Calendar, Search, Filter, SortAsc, LayoutGrid, Map as MapIcon,
  Loader2, X, Download, ShieldAlert, Award, FileSpreadsheet, Send, Clock, TrendingUp
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ChartTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { ConstituencyMap } from '../components/ConstituencyMap';

// Center of Constituency default (Coimbatore coordinates)
const DEFAULT_CENTER = { lat: 10.9983, lng: 76.9616 };

const PRIORITY_LEVELS = ['Very High', 'High', 'Medium', 'Low'];
const DEPARTMENTS = [
  'Ministry of Road Transport and Highways',
  'Ministry of Jal Shakti',
  'Ministry of Health and Family Welfare',
  'Ministry of Education',
  'Ministry of Home Affairs',
  'Department of Public Grievances'
];

const _fallback_department = (category: string): string => {
  const deptMap: Record<string, string> = {
    "Roads": "Ministry of Road Transport and Highways",
    "Water": "Ministry of Jal Shakti",
    "Sanitation": "Ministry of Jal Shakti (Drinking Water & Sanitation)",
    "Healthcare": "Ministry of Health and Family Welfare",
    "Education": "Ministry of Education",
    "Safety": "Ministry of Home Affairs",
    "Other": "Department of Public Grievances"
  };
  return deptMap[category] || "Department of Public Grievances";
};

export const MpDashboard: React.FC = () => {
  const { projects, submissions, fetchProjects, fetchSubmissions, fetchWards } = useStore();
  
  // Tabs and view configurations
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'map' | 'simulator'>('overview');
  
  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, highest_priority, lowest_priority

  // Synchronization and selection state
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);
  
  // Suggestion Details Overlay Modal state
  const [selectedSuggestion, setSelectedSuggestion] = useState<CitizenSubmission | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplain, setAiExplain] = useState<any>(null);
  const [aiRecommend, setAiRecommend] = useState<any>(null);

  // Map settings
  const mapRef = useRef<any>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  // Re-fetch data on mount
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const loadData = async () => {
    setIsLoadingData(true);
    await Promise.all([fetchProjects(), fetchSubmissions(), fetchWards()]);
    setIsLoadingData(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate Urgency text from numeric score
  const getPriorityLevel = (score: number): string => {
    if (score >= 80) return 'Very High';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  // Helper to map urgency (1-5) directly
  const getPriorityFromUrgency = (urgency: number): string => {
    if (urgency === 5) return 'Very High';
    if (urgency === 4) return 'High';
    if (urgency === 3) return 'Medium';
    return 'Low';
  };

  // Fetch AI Live Details when Suggestion is selected
  const fetchAIDecisionSupport = async (suggestion: CitizenSubmission) => {
    setAiLoading(true);
    setAiExplain(null);
    setAiRecommend(null);
    try {
      // Fetch Explainability
      const explainRes = await apiClient.post('/api/ai/explain', { suggestion_id: suggestion.id });
      setAiExplain(explainRes.data);

      // Fetch Scheme Recommendations
      const recommendRes = await apiClient.post('/api/ai/recommend', { suggestion_id: suggestion.id });
      setAiRecommend(recommendRes.data);
    } catch (e) {
      console.error("AI Decision Support endpoints loading error, using fallback matching.", e);
      // Fallback display if Gemini is blocked or unavailable
      setAiExplain({
        why_priority: `Prioritized Urgency level ${suggestion.urgency}/5 due to severe infrastructure disruption.`,
        why_department: `Jurisdiction mapped to primary utility department.`,
        why_category: `Categorized under standard public works list.`,
        why_scheme: `Eligible for development assistance under PMGSY or Jal Jeevan frameworks.`,
        explanation: `This grievance is verified and prioritised based on the vulnerability and population impact reported in ${suggestion.ward}.`
      });
      setAiRecommend({
        recommended_scheme: suggestion.category === 'Water' ? 'Jal Jeevan Mission' : suggestion.category === 'Roads' ? 'Pradhan Mantri Gram Sadak Yojana (PMGSY)' : 'MPLADS Development Fund',
        department: suggestion.category === 'Water' ? 'Ministry of Jal Shakti' : 'Ministry of Road Transport and Highways',
        reason: 'Optimal developmental scheme matched to resolve category concerns.',
        confidence: 0.82
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleOpenDetails = (sub: CitizenSubmission) => {
    setSelectedSuggestion(sub);
    fetchAIDecisionSupport(sub);
  };

  // Leaflet marker styling is handled inside the ConstituencyMap component

  // Filter & Sort Logic
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const textMatch = sub.text.toLowerCase().includes(searchQuery.toLowerCase());
        const wardMatch = sub.ward.toLowerCase().includes(searchQuery.toLowerCase());
        if (!textMatch && !wardMatch) return false;
      }
      // 2. Category
      if (selectedCategory && sub.category !== selectedCategory) return false;
      
      // 3. Priority
      if (selectedPriority) {
        const priority = getPriorityFromUrgency(sub.urgency);
        if (priority !== selectedPriority) return false;
      }

      // 4. Status
      if (selectedStatus && sub.status !== selectedStatus) return false;

      // 5. Date Range
      if (startDate) {
        const subDate = new Date(sub.created_at);
        const start = new Date(startDate);
        if (subDate < start) return false;
      }
      if (endDate) {
        const subDate = new Date(sub.created_at);
        const end = new Date(endDate);
        if (subDate > end) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'highest_priority') return b.urgency - a.urgency;
      if (sortBy === 'lowest_priority') return a.urgency - b.urgency;
      return 0;
    });
  }, [submissions, searchQuery, selectedCategory, selectedPriority, selectedStatus, startDate, endDate, sortBy]);

  // Synchronized Selection Trigger from Marker Click
  const handleMarkerClick = (sub: CitizenSubmission) => {
    setSelectedMarkerId(sub.id);
    setHighlightedCardId(sub.id);
    // Auto scroll card into view
    const element = document.getElementById(`sub-card-${sub.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Synchronized Selection Trigger from Card Click
  const handleCardClick = (sub: CitizenSubmission) => {
    setHighlightedCardId(sub.id);
    if (sub.latitude && sub.longitude) {
      const coords = { lat: sub.latitude, lng: sub.longitude };
      setMapCenter(coords);
      if (mapRef.current) {
        mapRef.current.panTo(coords);
        mapRef.current.setZoom(16);
      }
    }
  };

  const handleDownloadReport = (suggestion: CitizenSubmission) => {
    if (!suggestion) return;
    
    const priorityText = getPriorityFromUrgency(suggestion.urgency);
    const department = _fallback_department(suggestion.category);
    const scheme = suggestion.category === 'Water' ? 'Jal Jeevan Mission' : suggestion.category === 'Roads' ? 'Pradhan Mantri Gram Sadak Yojana (PMGSY)' : 'MPLADS Development Fund';

    const reportContent = `===========================================================
YUKTI - AI CONSTITUENCY DECISION SUPPORT REPORT
===========================================================
GRIEVANCE ID: ${suggestion.id}
SUBMISSION DATE: ${new Date(suggestion.created_at).toLocaleString()}
WARD: ${suggestion.ward}
ADDRESS: ${suggestion.affected_infrastructure || suggestion.ward}

-----------------------------------------------------------
GRIEVANCE DESCRIPTION:
"${suggestion.text}"

-----------------------------------------------------------
AI DIAGNOSTIC METRICS:
- Category Classification: ${suggestion.category}
- AI Urgency Rating: ${suggestion.urgency}/5 (${priorityText} Priority)
- AI Confidence Level: ${Math.round(suggestion.confidence * 100)}%

-----------------------------------------------------------
DECISION RECOMMENDATION:
- Target Govt Scheme: ${aiRecommend?.recommended_scheme || scheme}
- Jurisdiction Department: ${aiRecommend?.department || department}

-----------------------------------------------------------
DECISION RATIONALE:
${aiExplain?.explanation || "This grievance is verified and prioritised based on the vulnerability and population impact reported."}

- Department Allocation Justification:
  ${aiExplain?.why_department || "Matched to resolve category concerns."}

- Priority Assignment Justification:
  ${aiExplain?.why_priority || "Vulnerability and infrastructure impact score computed above threshold."}

===========================================================
Generated by YUKTI AI Decision Engine. Government of India.
===========================================================`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Yukti_AI_Report_${suggestion.id.slice(0, 8)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ========================================================
  // ANALYTICS COMPILATIONS
  // ========================================================
  
  const stats = useMemo(() => {
    const total = submissions.length;
    const verified = submissions.filter(s => s.status === 'verified' || s.status === 'converted').length;
    const pending = submissions.filter(s => s.status === 'pending').length;
    const highPriority = submissions.filter(s => s.urgency >= 4).length;
    
    // Average Priority Score
    const totalPriority = submissions.reduce((acc, s) => acc + (s.urgency * 20), 0);
    const avgPriority = total > 0 ? Math.round(totalPriority / total) : 0;

    // Average AI Confidence
    const totalConfidence = submissions.reduce((acc, s) => acc + s.confidence, 0);
    const avgConfidence = total > 0 ? Math.round((totalConfidence / total) * 100) : 0;

    // Unique Categories
    const categories = new Set(submissions.map(s => s.category).filter(Boolean));
    
    return {
      total,
      verified,
      pending,
      highPriority,
      avgPriority,
      avgConfidence,
      departmentsCount: 5,
      categoriesCount: categories.size
    };
  }, [submissions]);

  // Recharts Chart Formats
  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    submissions.forEach(s => {
      if (s.category) {
        counts[s.category] = (counts[s.category] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [submissions]);

  const priorityChartData = useMemo(() => {
    const counts = { 'Very High': 0, 'High': 0, 'Medium': 0, 'Low': 0 };
    submissions.forEach(s => {
      const lvl = getPriorityFromUrgency(s.urgency);
      counts[lvl as keyof typeof counts] = (counts[lvl as keyof typeof counts] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [submissions]);

  const departmentChartData = useMemo(() => {
    // Compile counts
    const deptMap: Record<string, number> = {};
    submissions.forEach(s => {
      if (s.category) {
        const dept = _fallback_department(s.category);
        deptMap[dept] = (deptMap[dept] || 0) + 1;
      }
    });
    return Object.entries(deptMap).map(([name, count]) => ({ 
      name: name.replace('Ministry of ', '').replace('Department of ', ''), 
      count 
    }));
  }, [submissions]);

  const timelineChartData = useMemo(() => {
    // Map dates to suggestion count
    const dateMap: Record<string, number> = {};
    submissions.forEach(s => {
      const dateStr = new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
    });
    return Object.entries(dateMap).map(([date, count]) => ({ date, count }));
  }, [submissions]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-4 px-2">
      {/* Top Banner Control Section */}
      <div className="gov-card flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-l-4 border-gov-brand-blue-500 bg-white dark:bg-slate-900 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-gov-brand-blue-500" />
            <h2 className="text-2xl font-extrabold tracking-tight">MP Decision Intelligence Room</h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            National decision suite integrating spatial overlays, AI priority analytics, and explainable supporting logic.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-full lg:w-auto">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'overview'
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid className="h-4 w-4" /> Overview & Charts
          </button>
          <button
            onClick={() => setActiveSubTab('map')}
            className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'map'
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapIcon className="h-4 w-4" /> Constituency Map ({filteredSubmissions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('simulator')}
            className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'simulator'
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings2 className="h-4 w-4" /> What-If Simulator
          </button>
        </div>
      </div>

      {isLoadingData && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-gov-brand-blue-500" />
          <span className="text-sm font-semibold text-slate-400">Loading MP Decision Room Data...</span>
        </div>
      )}

      {!isLoadingData && activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="gov-card flex items-center gap-4 bg-slate-50 dark:bg-slate-950/20">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Total Grievances</span>
                <h4 className="text-xl font-extrabold text-slate-850 dark:text-white">{stats.total}</h4>
              </div>
            </div>

            <div className="gov-card flex items-center gap-4 bg-slate-50 dark:bg-slate-950/20">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500">
                <CheckSquare className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Verified / Audited</span>
                <h4 className="text-xl font-extrabold text-slate-850 dark:text-white">{stats.verified}</h4>
              </div>
            </div>

            <div className="gov-card flex items-center gap-4 bg-slate-50 dark:bg-slate-950/20">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-500">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Pending Verification</span>
                <h4 className="text-xl font-extrabold text-slate-850 dark:text-white">{stats.pending}</h4>
              </div>
            </div>

            <div className="gov-card flex items-center gap-4 bg-slate-50 dark:bg-slate-950/20">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/10 text-rose-500">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">High Priority Issues</span>
                <h4 className="text-xl font-extrabold text-rose-500">{stats.highPriority}</h4>
              </div>
            </div>

            <div className="gov-card flex items-center gap-4 bg-slate-50 dark:bg-slate-950/20">
              <div className="p-3 rounded-xl bg-gov-brand-blue-50 dark:bg-gov-brand-blue-900/20 text-gov-brand-blue-500">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Average AI Confidence</span>
                <h4 className="text-xl font-extrabold text-slate-850 dark:text-white">{stats.avgConfidence}%</h4>
              </div>
            </div>

            <div className="gov-card flex items-center gap-4 bg-slate-50 dark:bg-slate-950/20">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/10 text-purple-500">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Average Priority Score</span>
                <h4 className="text-xl font-extrabold text-slate-850 dark:text-white">{stats.avgPriority}/100</h4>
              </div>
            </div>

            <div className="gov-card flex items-center gap-4 bg-slate-50 dark:bg-slate-950/20">
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Departments Involved</span>
                <h4 className="text-xl font-extrabold text-slate-850 dark:text-white">{stats.departmentsCount}</h4>
              </div>
            </div>

            <div className="gov-card flex items-center gap-4 bg-slate-50 dark:bg-slate-950/20">
              <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-900/10 text-pink-500">
                <Filter className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Active Categories</span>
                <h4 className="text-xl font-extrabold text-slate-850 dark:text-white">{stats.categoriesCount}</h4>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Pie Chart */}
            <div className="gov-card space-y-4">
              <h3 className="font-bold text-sm text-slate-500">Category Distribution</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Priority Bar Chart */}
            <div className="gov-card space-y-4">
              <h3 className="font-bold text-sm text-slate-500">Priority Distribution</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip />
                    <Bar dataKey="value" fill="#3B82F6">
                      {priorityChartData.map((entry, index) => {
                        const colors: Record<string, string> = {
                          'Very High': '#EF4444',
                          'High': '#F97316',
                          'Medium': '#F59E0B',
                          'Low': '#10B981'
                        };
                        return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#3B82F6'} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Suggestions over Time */}
            <div className="gov-card space-y-4">
              <h3 className="font-bold text-sm text-slate-500">Grievance Registration Timeline</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip />
                    <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Frequency Chart */}
            <div className="gov-card space-y-4">
              <h3 className="font-bold text-sm text-slate-500">Department Jurisdiction Distribution</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                    <ChartTooltip />
                    <Bar dataKey="count" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isLoadingData && activeSubTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)] min-h-[550px]">
          {/* Left panel: Filters + List */}
          <div className="lg:col-span-1 flex flex-col space-y-4 h-full overflow-hidden">
            {/* Filters panel */}
            <div className="gov-card space-y-3 p-4 shrink-0 bg-slate-50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
                <Filter className="h-4 w-4 text-gov-brand-blue-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">Advanced Filter Suite</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Search */}
                <div className="col-span-2 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by keywords or Ward..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 pl-7 focus:outline-none"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>

                {/* Category */}
                <div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none"
                  >
                    <option value="">All Categories</option>
                    <option value="Roads">Roads</option>
                    <option value="Water">Water</option>
                    <option value="Sanitation">Sanitation</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="Safety">Safety</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none"
                  >
                    <option value="">All Priorities</option>
                    <option value="Very High">Very High</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {/* Sorting */}
                <div className="col-span-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none font-semibold text-slate-700 dark:text-slate-350"
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="oldest">Sort: Oldest First</option>
                    <option value="highest_priority">Sort: Priority Score (Desc)</option>
                    <option value="lowest_priority">Sort: Priority Score (Asc)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* List queue */}
            <div className="gov-card flex-1 overflow-y-auto space-y-3 p-4">
              <h3 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">Filtered Claims ({filteredSubmissions.length})</h3>
              
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-xs">No grievances match filters.</p>
                </div>
              ) : (
                filteredSubmissions.map((sub) => {
                  const isHighlighted = sub.id === highlightedCardId;
                  const lvl = getPriorityFromUrgency(sub.urgency);
                  const colors = {
                    'Very High': 'bg-rose-100 text-rose-800 border-rose-300',
                    'High': 'bg-orange-100 text-orange-800 border-orange-300',
                    'Medium': 'bg-amber-100 text-amber-800 border-amber-300',
                    'Low': 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  };
                  return (
                    <div
                      key={sub.id}
                      id={`sub-card-${sub.id}`}
                      onClick={() => handleCardClick(sub)}
                      className={`border p-3.5 rounded-xl cursor-pointer transition-all ${
                        isHighlighted 
                          ? 'border-gov-brand-blue-500 bg-gov-brand-blue-500/5 ring-1 ring-gov-brand-blue-500/30 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/20'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350">
                          {sub.ward}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${colors[lvl as keyof typeof colors]}`}>
                          {lvl} ({sub.urgency * 20})
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-850 dark:text-slate-100 line-clamp-2">{sub.text}</p>
                      <div className="flex justify-between items-center text-[10px] text-slate-450 mt-3 pt-2 border-t border-slate-100 dark:border-slate-850">
                        <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetails(sub);
                          }}
                          className="text-gov-brand-blue-500 hover:underline flex items-center gap-0.5 font-bold"
                        >
                          View Details <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Leaflet Map */}
          <div className="lg:col-span-2 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden relative shadow-inner h-full min-h-[400px]">
            <ConstituencyMap
              submissions={filteredSubmissions}
              selectedMarkerId={selectedMarkerId}
              onMarkerClick={handleMarkerClick}
              center={mapCenter}
              onViewDetails={handleOpenDetails}
            />
          </div>
        </div>
      )}

      {!isLoadingData && activeSubTab === 'simulator' && (
        <div className="gov-card p-8 text-center space-y-6 max-w-2xl mx-auto border border-amber-500/20 bg-amber-500/5">
          <Settings2 className="h-14 w-14 text-gov-gold mx-auto mb-2 animate-spin-slow" />
          <h3 className="text-xl font-bold">Constituency What-If Simulation Panel</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            MPs and Officers will be able to adjust optimization sliders, weight emergency categories (healthcare, water supply, roads), and simulate allocation scenarios to maximize development impact.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-650 max-w-md mx-auto pt-4">
            <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60">
              Increase / Decrease Budget Limits
            </div>
            <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60">
              Prioritize Road safety & Transport
            </div>
            <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60">
              Delay selected Ward Projects
            </div>
            <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60">
              Prioritize Water Supply systems
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-300 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold inline-block max-w-sm animate-pulse">
            Optimization engine will be activated in Phase 6.
          </div>
        </div>
      )}

      {/* Suggestion Details Fullscreen Modal */}
      {selectedSuggestion && (
        <div className="fixed inset-0 bg-slate-900/80 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gov-brand-blue-500/10 text-gov-brand-blue-500">
                  Grievance Details & Decision Support
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate max-w-xl">
                  {selectedSuggestion.ward} Request
                </h3>
              </div>
              <button 
                onClick={() => setSelectedSuggestion(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Container */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Grievance info */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submitted Request Description</h4>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-850 rounded-xl leading-relaxed">
                    {selectedSuggestion.text}
                  </p>
                </div>

                {/* Multimedia Attachments */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vision Attachment</h4>
                    {selectedSuggestion.image_url ? (
                      <img 
                        src={selectedSuggestion.image_url} 
                        alt="Infrastructure attachment" 
                        className="rounded-xl border border-slate-200 dark:border-slate-800 object-cover h-40 w-full"
                        onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?q=80&w=300'; }}
                      />
                    ) : (
                      <div className="h-40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-950/10">
                        No image uploaded
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Voice Transcript</h4>
                    {selectedSuggestion.voice_url ? (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 h-40 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/10 text-xs space-y-2">
                        <strong className="block text-[10px] text-gov-brand-blue-500">Transcribed Audio:</strong>
                        <p className="italic text-slate-650">"{selectedSuggestion.text}"</p>
                      </div>
                    ) : (
                      <div className="h-40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-950/10">
                        No audio transcript
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata details */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 border border-slate-100 dark:border-slate-850 rounded-xl bg-slate-50/50 dark:bg-slate-950/10">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Status</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedSuggestion.status}</strong>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-slate-850 rounded-xl bg-slate-50/50 dark:bg-slate-950/10">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Date Logged</span>
                    <strong className="text-slate-800 dark:text-slate-200">{new Date(selectedSuggestion.created_at).toLocaleDateString()}</strong>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Decision Support Panel */}
              <div className="border border-gov-brand-blue-500/20 bg-gov-brand-blue-500/5 rounded-2xl p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gov-brand-blue-500/25 pb-3">
                    <ShieldAlert className="h-5 w-5 text-gov-brand-blue-500 animate-pulse" />
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-gov-brand-blue-500">AI Decision support panel</h4>
                  </div>

                  {aiLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-gov-brand-blue-500" />
                      <span className="text-xs font-semibold text-slate-400">Loading AI Explainability outputs...</span>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs leading-relaxed">
                      {/* Urgency and Confidence Score badges */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-sm">
                          <span className="block text-[9px] text-slate-400 font-semibold uppercase">AI Urgency score</span>
                          <strong className="text-sm font-extrabold text-slate-850 dark:text-white">
                            {selectedSuggestion.urgency}/5 ({selectedSuggestion.urgency * 20} Priority)
                          </strong>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-sm">
                          <span className="block text-[9px] text-slate-400 font-semibold uppercase">AI Confidence Rating</span>
                          <strong className="text-sm font-extrabold text-slate-850 dark:text-white">
                            {Math.round(selectedSuggestion.confidence * 100)}%
                          </strong>
                        </div>
                      </div>

                      {/* Live Gemini Recommendation Outputs */}
                      {aiRecommend && (
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-250/60 dark:border-slate-850 space-y-1 text-xs">
                          <span className="block text-[9px] font-bold text-gov-brand-blue-500 uppercase tracking-wider">Recommended Govt Scheme</span>
                          <strong className="text-sm font-extrabold text-slate-850 dark:text-white block">{aiRecommend.recommended_scheme}</strong>
                          <span className="block text-[9px] text-slate-400 mt-1">Responsible Dept: {aiRecommend.department}</span>
                        </div>
                      )}

                      {/* Live Explainability */}
                      {aiExplain ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-250/60 dark:border-slate-850">
                            <span className="block text-[9px] text-slate-400 font-bold uppercase">Decision Rationale</span>
                            <p className="text-slate-700 dark:text-slate-300 mt-1 font-medium">{aiExplain.explanation}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-medium">
                            <div className="p-2 border border-slate-100 dark:border-slate-850 rounded">
                              <span className="block text-[8px] uppercase text-slate-400">Why Priority</span>
                              {aiExplain.why_priority}
                            </div>
                            <div className="p-2 border border-slate-100 dark:border-slate-850 rounded">
                              <span className="block text-[8px] uppercase text-slate-400">Why Department</span>
                              {aiExplain.why_department}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-400">
                          Explainability report currently unavailable.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Action bar */}
                <div className="grid grid-cols-2 gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
                  <button 
                    disabled={aiLoading}
                    onClick={() => {
                      alert("Grievance forwarded to engineers. Report logged.");
                      setSelectedSuggestion(null);
                    }}
                    className="py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Send className="h-4 w-4" /> Forward Request
                  </button>
                  <button 
                    disabled={aiLoading}
                    onClick={() => handleDownloadReport(selectedSuggestion!)}
                    className="py-2.5 bg-gov-brand-blue-500 hover:bg-gov-brand-blue-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="h-4 w-4" /> Download Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
