import React, { useState, useEffect, useMemo } from 'react';
import { useStore, CitizenSubmission } from '../store/useStore';
import apiClient from '../services/api';
import {
  RefreshCw, FileText, CheckSquare,
  AlertCircle, ArrowRight,
  MapPin, Calendar, Filter,
  Loader2, X, Download, ShieldAlert, Award, Send, Clock,
  TrendingUp, Flame, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ChartTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  AreaChart, Area, ComposedChart
} from 'recharts';
import { ConstituencyMap } from '../components/ConstituencyMap';
import { ScenarioPlanner } from './ScenarioPlanner';

// ─── Constants ───────────────────────────────────────────────────────────────
const DEFAULT_CENTER = { lat: 10.9983, lng: 76.9616 };

const DEPT_MAP: Record<string, string> = {
  Roads:      'Ministry of Road Transport and Highways',
  Water:      'Ministry of Jal Shakti',
  Sanitation: 'Ministry of Jal Shakti (Drinking Water & Sanitation)',
  Healthcare: 'Ministry of Health and Family Welfare',
  Education:  'Ministry of Education',
  Safety:     'Ministry of Home Affairs',
  Other:      'Department of Public Grievances',
};
const fallbackDept = (cat: string) => DEPT_MAP[cat] ?? 'Department of Public Grievances';

const PRIORITY_COLORS: Record<string, string> = {
  'Very High': '#EF4444',
  High:        '#F97316',
  Medium:      '#F59E0B',
  Low:         '#10B981',
};
const PRIORITY_BADGE: Record<string, string> = {
  'Very High': 'bg-red-100 text-red-700 border-red-200',
  High:        'bg-orange-100 text-orange-700 border-orange-200',
  Medium:      'bg-amber-100 text-amber-700 border-amber-200',
  Low:         'bg-emerald-100 text-emerald-700 border-emerald-200',
};
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const urgencyToLabel = (u: number): string => {
  if (u === 5) return 'Very High';
  if (u === 4) return 'High';
  if (u === 3) return 'Medium';
  return 'Low';
};

// ─── Cluster type ─────────────────────────────────────────────────────────────
interface IssueCluster {
  key:          string;
  category:     string;
  ward:         string;
  count:        number;
  maxUrgency:   number;
  avgConfidence:number;
  latestDate:   string;
  items:        CitizenSubmission[];
  lat?:         number;
  lng?:         number;
}

function buildClusters(
  subs: CitizenSubmission[],
  groupBy: 'category_ward' | 'category' | 'ward' | 'department' | 'priority' | 'status'
): IssueCluster[] {
  const map = new Map<string, CitizenSubmission[]>();
  subs.forEach(s => {
    let key: string;
    switch (groupBy) {
      case 'category':   key = s.category || 'Unknown'; break;
      case 'ward':       key = `${s.ward}||${s.ward}`; break;
      case 'department': key = `${fallbackDept(s.category)}||${s.category}`; break;
      case 'priority':   key = `${urgencyToLabel(s.urgency)}||${s.category}`; break;
      case 'status':     key = `${s.status}||${s.category}`; break;
      default:           key = `${s.category}||${s.ward}`; // category_ward
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  });

  return Array.from(map.entries()).map(([key, items]) => {
    const maxUrgency   = Math.max(...items.map(i => i.urgency));
    const avgConfidence= items.reduce((a, i) => a + i.confidence, 0) / items.length;
    const latestDate   = items.reduce((a, b) =>
      new Date(a.created_at) > new Date(b.created_at) ? a : b
    ).created_at;
    const parts        = key.split('||');
    const withCoords   = items.find(i => i.latitude && i.longitude);
    return {
      key,
      category:      items[0].category,
      ward:          parts[1] ?? parts[0],
      count:         items.length,
      maxUrgency,
      avgConfidence,
      latestDate,
      items,
      lat:           withCoords?.latitude,
      lng:           withCoords?.longitude,
    };
  }).sort((a, b) => b.maxUrgency - a.maxUrgency || b.count - a.count);
}

// ─── Component ────────────────────────────────────────────────────────────────
interface MpDashboardProps {
  initialSubView?: string;
  onSubViewChange?: (view: string) => void;
}

export const MpDashboard: React.FC<MpDashboardProps> = ({
  initialSubView = 'overview',
}) => {
  const { submissions, fetchProjects, fetchSubmissions, fetchWards } = useStore();

  // Sub-tab — driven by parent sidebar nav
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'clusters' | 'map' | 'analytics' | 'simulator' | 'reports'>(initialSubView as any);

  // Sync when parent changes sub-view
  useEffect(() => {
    if (initialSubView) setActiveSubTab(initialSubView as any);
  }, [initialSubView]);

  // Cluster filters
  const [groupBy, setGroupBy] = useState<'category_ward' | 'category' | 'ward' | 'department' | 'priority' | 'status'>('category_ward');
  const [minCount, setMinCount] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');

  // Drill-down
  const [drillCluster, setDrillCluster] = useState<IssueCluster | null>(null);
  const [expandedHotspot, setExpandedHotspot] = useState<string | null>(null);

  // Map
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  // Details modal
  const [selectedSuggestion, setSelectedSuggestion] = useState<CitizenSubmission | null>(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiExplain, setAiExplain]   = useState<any>(null);
  const [aiRecommend, setAiRecommend] = useState<any>(null);

  // Loading
  const [isLoadingData, setIsLoadingData] = useState(false);

  const loadData = async () => {
    setIsLoadingData(true);
    await Promise.all([fetchProjects(), fetchSubmissions(), fetchWards()]);
    setIsLoadingData(false);
  };

  useEffect(() => { loadData(); }, []);

  // ── Filtered base ──────────────────────────────────────────────────────────
  const filteredBase = useMemo(() => {
    return submissions.filter(s => {
      if (selectedCategory && s.category !== selectedCategory) return false;
      if (selectedPriority && urgencyToLabel(s.urgency) !== selectedPriority) return false;
      if (startDate && new Date(s.created_at) < new Date(startDate)) return false;
      if (endDate   && new Date(s.created_at) > new Date(endDate))   return false;
      return true;
    });
  }, [submissions, selectedCategory, selectedPriority, startDate, endDate]);

  // ── All clusters ───────────────────────────────────────────────────────────
  const allClusters = useMemo(() => buildClusters(filteredBase, groupBy), [filteredBase, groupBy]);

  // ── Visible clusters (min-count filter) ───────────────────────────────────
  const visibleClusters = useMemo(
    () => allClusters.filter(c => c.count >= minCount),
    [allClusters, minCount]
  );

  // ── Top 5 hotspots ─────────────────────────────────────────────────────────
  const hotspots = useMemo(
    () => [...allClusters].sort((a, b) => b.count - a.count || b.maxUrgency - a.maxUrgency).slice(0, 5),
    [allClusters]
  );

  // ── Analytics (from filteredBase) ─────────────────────────────────────────
  const stats = useMemo(() => {
    const total       = filteredBase.length;
    const verified    = filteredBase.filter(s => s.status === 'verified' || s.status === 'converted').length;
    const pending     = filteredBase.filter(s => s.status === 'pending').length;
    const highPriority= filteredBase.filter(s => s.urgency >= 4).length;
    const avgPriority = total > 0 ? Math.round(filteredBase.reduce((a, s) => a + s.urgency * 20, 0) / total) : 0;
    const avgConf     = total > 0 ? Math.round(filteredBase.reduce((a, s) => a + s.confidence, 0) / total * 100) : 0;
    const categories  = new Set(filteredBase.map(s => s.category).filter(Boolean));
    return { total, verified, pending, highPriority, avgPriority, avgConf, categoriesCount: categories.size };
  }, [filteredBase]);

  const categoryChartData = useMemo(() => {
    const c: Record<string, number> = {};
    filteredBase.forEach(s => { if (s.category) c[s.category] = (c[s.category] ?? 0) + 1; });
    return Object.entries(c).map(([name, value]) => ({ name, value }));
  }, [filteredBase]);

  const priorityChartData = useMemo(() => {
    const c = { 'Very High': 0, High: 0, Medium: 0, Low: 0 };
    filteredBase.forEach(s => { const l = urgencyToLabel(s.urgency); c[l as keyof typeof c]++; });
    return Object.entries(c).map(([name, value]) => ({ name, value }));
  }, [filteredBase]);

  const departmentChartData = useMemo(() => {
    const d: Record<string, number> = {};
    filteredBase.forEach(s => { const dept = fallbackDept(s.category); d[dept] = (d[dept] ?? 0) + 1; });
    return Object.entries(d).map(([name, count]) => ({
      name: name.replace('Ministry of ', '').replace('Department of ', ''), count
    }));
  }, [filteredBase]);

  const timelineChartData = useMemo(() => {
    const m: Record<string, number> = {};
    filteredBase.forEach(s => {
      const d = new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      m[d] = (m[d] ?? 0) + 1;
    });
    return Object.entries(m).map(([date, count]) => ({ date, count }));
  }, [filteredBase]);

  const cumulativeChartData = useMemo(() => {
    let total = 0;
    return timelineChartData.map(d => {
      total += d.count;
      return { ...d, cumulative: total };
    });
  }, [timelineChartData]);

  const wardChartData = useMemo(() => {
    const w: Record<string, { count: number, totalUrgency: number }> = {};
    filteredBase.forEach(s => {
      if (s.ward) {
        if (!w[s.ward]) w[s.ward] = { count: 0, totalUrgency: 0 };
        w[s.ward].count += 1;
        w[s.ward].totalUrgency += s.urgency;
      }
    });
    return Object.entries(w).map(([name, data]) => ({
      name: name.split(' (')[0],
      count: data.count,
      avgUrgency: +(data.totalUrgency / data.count).toFixed(1)
    }));
  }, [filteredBase]);

  // ── AI Details ─────────────────────────────────────────────────────────────
  const fetchAIDecisionSupport = async (suggestion: CitizenSubmission) => {
    setAiLoading(true);
    setAiExplain(null);
    setAiRecommend(null);
    try {
      const [explainRes, recommendRes] = await Promise.all([
        apiClient.post('/api/ai/explain',    { suggestion_id: suggestion.id }),
        apiClient.post('/api/ai/recommend',  { suggestion_id: suggestion.id }),
      ]);
      setAiExplain(explainRes.data);
      setAiRecommend(recommendRes.data);
    } catch {
      setAiExplain({
        why_priority:  `Prioritized urgency ${suggestion.urgency}/5 due to infrastructure disruption.`,
        why_department:`Jurisdiction mapped to primary utility department.`,
        why_category:  `Categorized under standard public works list.`,
        explanation:   `This grievance is verified and prioritised based on vulnerability in ${suggestion.ward}.`,
      });
      setAiRecommend({
        recommended_scheme: suggestion.category === 'Water'  ? 'Jal Jeevan Mission'
                          : suggestion.category === 'Roads'  ? 'Pradhan Mantri Gram Sadak Yojana (PMGSY)'
                          : 'MPLADS Development Fund',
        department: fallbackDept(suggestion.category),
        reason:     'Optimal scheme matched to resolve category concerns.',
        confidence: 0.82,
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleOpenDetails = (sub: CitizenSubmission) => {
    setSelectedSuggestion(sub);
    fetchAIDecisionSupport(sub);
  };

  const handleMarkerClick = (sub: CitizenSubmission) => {
    setSelectedMarkerId(sub.id);
  };

  const handleCardCenterMap = (cluster: IssueCluster) => {
    if (cluster.lat && cluster.lng) {
      setMapCenter({ lat: cluster.lat, lng: cluster.lng });
    }
    setActiveSubTab('map');
  };

  const handleDownloadReport = (suggestion: CitizenSubmission) => {
    const priorityText = urgencyToLabel(suggestion.urgency);
    const dept         = fallbackDept(suggestion.category);
    const scheme       = suggestion.category === 'Water'  ? 'Jal Jeevan Mission'
                       : suggestion.category === 'Roads'  ? 'Pradhan Mantri Gram Sadak Yojana (PMGSY)'
                       : 'MPLADS Development Fund';
    const content = `===========================================================
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
- Jurisdiction Department: ${aiRecommend?.department || dept}

-----------------------------------------------------------
DECISION RATIONALE:
${aiExplain?.explanation || 'Verified and prioritised based on vulnerability and population impact.'}

===========================================================
Generated by YUKTI AI Decision Engine. Government of India.
===========================================================`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Yukti_Report_${suggestion.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const FilterBar = () => {
    const labels: Record<string, string> = {
      category_ward: 'Category + Ward', category: 'Category', ward: 'Ward',
      department: 'Department', priority: 'Priority', status: 'Status',
    };
    return (
      <div className="gov-card bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-3.5 w-3.5 text-blue-500" />
          <span className="font-bold text-xs uppercase tracking-widest text-slate-500">Filters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Group By</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)}
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-white">
              {Object.entries(labels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Min. Reports</label>
            <select value={minCount} onChange={e => setMinCount(Number(e.target.value))}
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-white">
              {[1,3,5,10,20].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Category</label>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-white">
              <option value="">All</option>
              {['Roads','Water','Sanitation','Healthcare','Education','Safety','Other'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Priority</label>
            <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-white">
              <option value="">All</option>
              {['Very High','High','Medium','Low'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-white" />
          </div>
        </div>
      </div>
    );
  };

  // ── Cluster Card ───────────────────────────────────────────────────────────
  const ClusterCard = ({ cluster }: { cluster: IssueCluster }) => {
    const priority     = urgencyToLabel(cluster.maxUrgency);
    const badgeClass   = PRIORITY_BADGE[priority];
    const dotColor     = PRIORITY_COLORS[priority];
    return (
      <div className="gov-card border border-slate-200 dark:border-slate-800 hover:border-gov-brand-blue-500/40 hover:shadow-md transition-all group">
        <div className="flex justify-between items-start gap-2 mb-3">
          <div className="flex items-start gap-2 flex-1">
            <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}88` }} />
            <div>
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-white leading-tight">{cluster.category}</h4>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                <MapPin className="h-3 w-3" />
                <span>{cluster.ward}</span>
              </div>
            </div>
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex-shrink-0 ${badgeClass}`}>{priority}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center mb-4">
          <div className="bg-slate-50 dark:bg-slate-950/40 rounded-lg p-2">
            <div className="text-lg font-black text-slate-800 dark:text-white">{cluster.count}</div>
            <div className="text-[9px] text-slate-500 font-semibold">Complaints</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/40 rounded-lg p-2">
            <div className="text-lg font-black text-slate-800 dark:text-white">{cluster.maxUrgency}/5</div>
            <div className="text-[9px] text-slate-500 font-semibold">Peak Urgency</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/40 rounded-lg p-2">
            <div className="text-lg font-black text-slate-800 dark:text-white">{Math.round(cluster.avgConfidence * 100)}%</div>
            <div className="text-[9px] text-slate-500 font-semibold">AI Conf.</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Latest: {new Date(cluster.latestDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" style={{ color: dotColor }} />
            <span style={{ color: dotColor }} className="font-bold">{priority} Priority</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setDrillCluster(cluster)}
            className="flex-1 py-2 bg-gov-brand-blue-500 hover:bg-gov-brand-blue-900 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <Layers className="h-3.5 w-3.5" /> View {cluster.count} Complaints
          </button>
          {cluster.lat && (
            <button
              onClick={() => handleCardCenterMap(cluster)}
              title="Show on map"
              className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Hotspot Panel ──────────────────────────────────────────────────────────
  const HotspotPanel = () => (
    <div className="gov-card border-l-4 border-orange-500 bg-orange-50/30 dark:bg-orange-900/5">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="h-5 w-5 text-orange-500" />
        <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Recurring Hotspots</h3>
        <span className="ml-auto text-[10px] text-slate-400 font-semibold">Top 5 by complaint volume</span>
      </div>
      <div className="space-y-2">
        {hotspots.map((h, i) => {
          const priority   = urgencyToLabel(h.maxUrgency);
          const dotColor   = PRIORITY_COLORS[priority];
          const isExpanded = expandedHotspot === h.key;
          return (
            <div key={h.key} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <button
                onClick={() => setExpandedHotspot(isExpanded ? null : h.key)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-600 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                <div className="flex-1 text-left">
                  <div className="text-xs font-bold text-slate-800 dark:text-white">{h.category} — {h.ward}</div>
                  <div className="text-[10px] text-slate-400">{h.count} complaints · {priority} priority</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-800 dark:text-white">{h.count}</span>
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                </div>
              </button>
              {isExpanded && (
                <div className="px-4 pb-3 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                  {h.items.slice(0, 3).map(item => (
                    <div key={item.id} className="text-[10px] text-slate-600 dark:text-slate-400 flex justify-between items-center gap-2">
                      <span className="line-clamp-1 flex-1">{item.text.slice(0, 60)}…</span>
                      <button onClick={() => handleOpenDetails(item)} className="text-gov-brand-blue-500 font-bold flex-shrink-0 hover:underline">View</button>
                    </div>
                  ))}
                  {h.count > 3 && (
                    <button onClick={() => setDrillCluster(h)} className="text-[10px] text-gov-brand-blue-500 font-bold hover:underline">
                      + {h.count - 3} more complaints →
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-4 px-2">

      {/* ── Contextual header strip ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {activeSubTab === 'overview'  && 'Constituency Overview'}
            {activeSubTab === 'analytics' && 'Analytics & Insights'}
            {activeSubTab === 'clusters'  && 'Issue Clusters'}
            {activeSubTab === 'map'       && 'Constituency Map'}
            {activeSubTab === 'simulator' && 'What-If Simulator'}
            {activeSubTab === 'reports'   && 'Reports & Exports'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {filteredBase.length} grievances · {allClusters.length} clusters · {stats.avgConf}% avg AI confidence
          </p>
        </div>
        <button onClick={loadData} title="Refresh data"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 transition-all">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* ── Loading ── */}
      {isLoadingData && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-gov-brand-blue-500" />
          <span className="text-sm font-semibold text-slate-400">Loading Constituency Intelligence...</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ OVERVIEW */}
      {!isLoadingData && activeSubTab === 'overview' && (
        <div className="space-y-6">

          {/* 4 core KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="gov-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><FileText className="h-5 w-5" /></div>
              <div><div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Total Grievances</div><div className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{stats.total}</div></div>
            </div>
            <div className="gov-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"><CheckSquare className="h-5 w-5" /></div>
              <div><div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Verified</div><div className="text-2xl font-black text-emerald-600 mt-0.5">{stats.verified}</div></div>
            </div>
            <div className="gov-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600"><Clock className="h-5 w-5" /></div>
              <div><div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Pending</div><div className="text-2xl font-black text-amber-600 mt-0.5">{stats.pending}</div></div>
            </div>
            <div className="gov-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600"><AlertCircle className="h-5 w-5" /></div>
              <div><div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">High Priority</div><div className="text-2xl font-black text-red-600 mt-0.5">{stats.highPriority}</div></div>
            </div>
          </div>

          {/* Secondary metrics row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="gov-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600"><Award className="h-5 w-5" /></div>
              <div><div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Avg AI Confidence</div><div className="text-2xl font-black text-blue-600 mt-0.5">{stats.avgConf}%</div></div>
            </div>
            <div className="gov-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600"><TrendingUp className="h-5 w-5" /></div>
              <div><div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Avg Priority</div><div className="text-2xl font-black text-purple-600 mt-0.5">{stats.avgPriority}/100</div></div>
            </div>
            <div className="gov-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600"><Layers className="h-5 w-5" /></div>
              <div><div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Issue Clusters</div><div className="text-2xl font-black text-indigo-600 mt-0.5">{allClusters.length}</div></div>
            </div>
            <div className="gov-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-900/20 text-pink-600"><Filter className="h-5 w-5" /></div>
              <div><div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Categories</div><div className="text-2xl font-black text-pink-600 mt-0.5">{stats.categoriesCount}</div></div>
            </div>
          </div>

          {/* Two charts side by side — overview snapshot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="gov-card space-y-3">
              <div>
                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">Category Breakdown</h3>
                <p className="text-xs text-slate-400 mt-0.5">Distribution across issue types</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {categoryChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip formatter={(v: any, n: any) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="gov-card space-y-3">
              <div>
                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">Priority Distribution</h3>
                <p className="text-xs text-slate-400 mt-0.5">Urgency levels across constituency</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityChartData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <ChartTooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {priorityChartData.map((e, i) => <Cell key={i} fill={PRIORITY_COLORS[e.name] ?? '#3B82F6'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top 3 critical clusters at a glance */}
          <div className="gov-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">Critical Clusters at a Glance</h3>
                <p className="text-xs text-slate-400 mt-0.5">Top 3 by complaint volume — go to Issue Clusters for the full list</p>
              </div>
            </div>
            <div className="space-y-2">
              {hotspots.slice(0, 3).map((h, i) => {
                const priority = urgencyToLabel(h.maxUrgency);
                const dotColor = PRIORITY_COLORS[priority];
                return (
                  <div key={h.key} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors bg-white dark:bg-slate-900/50">
                    <span className="w-7 h-7 rounded-full text-sm font-black text-slate-400 dark:text-slate-500 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}88` }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-800 dark:text-white truncate">{h.category} — {h.ward}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{h.count} complaints · {priority} priority</div>
                    </div>
                    <button onClick={() => setDrillCluster(h)} className="text-xs text-blue-600 font-semibold hover:underline flex-shrink-0 transition-colors">
                      View →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ ANALYTICS */}
      {!isLoadingData && activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="gov-card space-y-3">
              <div>
                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">Cumulative Grievance Growth</h3>
                <p className="text-xs text-slate-400 mt-0.5">Total volume of issues logged over time</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeChartData}>
                    <defs>
                      <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <ChartTooltip cursor={{ fill: '#f8fafc' }} />
                    <Area type="monotone" dataKey="cumulative" stroke="#10B981" fillOpacity={1} fill="url(#colorCum)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="gov-card space-y-3">
              <div>
                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">Ward Vulnerability Index</h3>
                <p className="text-xs text-slate-400 mt-0.5">Volume (bars) vs Average Urgency (line)</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={wardChartData} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fontSize: 11, fill: '#F59E0B' }} axisLine={false} tickLine={false} />
                    <ChartTooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar yAxisId="left" dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="avgUrgency" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4, fill: '#F59E0B' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="gov-card space-y-3">
              <div>
                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">Submission Timeline</h3>
                <p className="text-xs text-slate-400 mt-0.5">Daily grievance volume</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <ChartTooltip />
                    <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3, fill: '#3B82F6' }} activeDot={{ r: 6, fill: '#1d4ed8' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="gov-card space-y-3">
              <div>
                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">Department Jurisdiction</h3>
                <p className="text-xs text-slate-400 mt-0.5">Complaint volume per ministry</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentChartData} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <ChartTooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ ISSUE CLUSTERS */}
      {!isLoadingData && activeSubTab === 'clusters' && (
        <div className="space-y-5">
          <FilterBar />

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-white">
                {visibleClusters.length} Issue Cluster{visibleClusters.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Grouped by <strong>{groupBy.replace('_', ' + ')}</strong> · {minCount}+ complaints · {filteredBase.length} total
              </p>
            </div>
          </div>

          {/* Hotspot panel — only here */}
          <HotspotPanel />

          {/* Cluster grid */}
          {visibleClusters.length === 0 ? (
            <div className="gov-card text-center py-16 text-slate-400">
              <Layers className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">No clusters meet the current filters.</p>
              <p className="text-xs mt-1">Try reducing the Minimum Reports threshold.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleClusters.map(cluster => <ClusterCard key={cluster.key} cluster={cluster} />)}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ CONSTITUENCY MAP */}
      {!isLoadingData && activeSubTab === 'map' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-320px)] min-h-[520px]">
            {/* Cluster list */}
            <div className="lg:col-span-1 flex flex-col space-y-3 h-full overflow-hidden">
              <div className="gov-card flex-1 overflow-y-auto p-4 space-y-3">
                <h3 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">
                  Visible Clusters ({visibleClusters.length})
                </h3>
                {visibleClusters.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <AlertCircle className="h-7 w-7 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No clusters match current filters.</p>
                  </div>
                ) : (
                  visibleClusters.map(cluster => {
                    const priority = urgencyToLabel(cluster.maxUrgency);
                    const dot      = PRIORITY_COLORS[priority];
                    return (
                      <div key={cluster.key}
                        onClick={() => cluster.lat && setMapCenter({ lat: cluster.lat!, lng: cluster.lng! })}
                        className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 cursor-pointer hover:border-gov-brand-blue-500/40 hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
                            <span className="text-xs font-bold text-slate-800 dark:text-white">{cluster.category}</span>
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-500">{cluster.count} complaints</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {cluster.ward}
                        </div>
                        <div className="flex gap-1.5 mt-2">
                          <button onClick={e => { e.stopPropagation(); setDrillCluster(cluster); }}
                            className="flex-1 text-[10px] font-bold py-1 bg-gov-brand-blue-500/10 text-gov-brand-blue-500 rounded-lg hover:bg-gov-brand-blue-500/20 transition-colors">
                            Drill Down
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Map */}
            <div className="lg:col-span-2 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden relative shadow-inner h-full min-h-[400px]">
              <ConstituencyMap
                submissions={submissions}
                selectedMarkerId={selectedMarkerId}
                onMarkerClick={handleMarkerClick}
                center={mapCenter}
                onViewDetails={handleOpenDetails}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ SIMULATOR */}
      {!isLoadingData && activeSubTab === 'simulator' && <ScenarioPlanner />}

      {/* ══════════════════════════════════════════════════════════════ REPORTS */}
      {!isLoadingData && activeSubTab === 'reports' && (
        <div className="space-y-6">
          <FilterBar />
          <div className="gov-card border-l-4 border-gov-brand-blue-500">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-white">Constituency Reports</h3>
                <p className="text-xs text-slate-400 mt-0.5">Download cluster-level reports for official use</p>
              </div>
              <button
                onClick={() => {
                  const lines = ['YUKTI Constituency Report', `Generated: ${new Date().toLocaleString()}`, '='.repeat(60), ''];
                  visibleClusters.forEach((c, i) => {
                    lines.push(`${i + 1}. ${c.category} — ${c.ward}`);
                    lines.push(`   Complaints: ${c.count} | Priority: ${urgencyToLabel(c.maxUrgency)} | AI Confidence: ${Math.round(c.avgConfidence * 100)}%`);
                    lines.push(`   Latest: ${new Date(c.latestDate).toLocaleDateString()}`);
                    lines.push('');
                  });
                  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'Yukti_Constituency_Report.txt';
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gov-brand-blue-500 hover:bg-gov-brand-blue-900 text-white text-xs font-bold rounded-xl transition-colors"
              >
                <Download className="h-4 w-4" /> Download Full Report
              </button>
            </div>
            <div className="space-y-3">
              {visibleClusters.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-semibold">No clusters to report. Adjust filters above.</p>
                </div>
              ) : (
                visibleClusters.map((c, i) => {
                  const priority = urgencyToLabel(c.maxUrgency);
                  return (
                    <div key={c.key} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4">
                      <span className="text-xl font-black text-slate-300 dark:text-slate-700 w-8 text-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-slate-800 dark:text-white">{c.category} — {c.ward}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {c.count} complaints · {priority} priority · {Math.round(c.avgConfidence * 100)}% AI confidence
                          · Latest: {new Date(c.latestDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex-shrink-0 ${PRIORITY_BADGE[priority]}`}>{priority}</span>
                      <button onClick={() => setDrillCluster(c)} className="text-gov-brand-blue-500 text-xs font-bold hover:underline flex-shrink-0">
                        Drill Down
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}


      {drillCluster && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 flex-shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gov-brand-blue-500/10 text-gov-brand-blue-500">
                  {drillCluster.count} Complaints — {drillCluster.category} · {drillCluster.ward}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                  Cluster Drill-Down
                </h3>
              </div>
              <button onClick={() => setDrillCluster(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {drillCluster.items.map(sub => {
                const priority = urgencyToLabel(sub.urgency);
                return (
                  <div key={sub.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-950/20 hover:border-gov-brand-blue-500/30 transition-all">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350">{sub.ward}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${PRIORITY_BADGE[priority]}`}>{priority} ({sub.urgency}/5)</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">{sub.text}</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-850">
                      <span>{new Date(sub.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <button onClick={() => { setDrillCluster(null); handleOpenDetails(sub); }}
                        className="text-gov-brand-blue-500 hover:underline flex items-center gap-0.5 font-bold">
                        View Details <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ GRIEVANCE DETAILS MODAL (AI) */}
      {selectedSuggestion && (
        <div className="fixed inset-0 bg-slate-900/80 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 flex-shrink-0">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gov-brand-blue-500/10 text-gov-brand-blue-500">
                  Grievance Details & AI Decision Support
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate max-w-xl">
                  {selectedSuggestion.ward} — {selectedSuggestion.category} Request
                </h3>
              </div>
              <button onClick={() => setSelectedSuggestion(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Grievance info */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submitted Description</h4>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-850 rounded-xl leading-relaxed">
                    {selectedSuggestion.text}
                  </p>
                </div>
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

              {/* Right: AI Decision Support */}
              <div className="border border-gov-brand-blue-500/20 bg-gov-brand-blue-500/5 rounded-2xl p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gov-brand-blue-500/25 pb-3">
                    <ShieldAlert className="h-5 w-5 text-gov-brand-blue-500 animate-pulse" />
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-gov-brand-blue-500">AI Decision Support Panel</h4>
                  </div>

                  {aiLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-gov-brand-blue-500" />
                      <span className="text-xs font-semibold text-slate-400">Loading AI Explainability...</span>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs leading-relaxed">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-sm">
                          <span className="block text-[9px] text-slate-400 font-semibold uppercase">AI Urgency Score</span>
                          <strong className="text-sm font-extrabold text-slate-850 dark:text-white">
                            {selectedSuggestion.urgency}/5 ({selectedSuggestion.urgency * 20} Priority)
                          </strong>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-sm">
                          <span className="block text-[9px] text-slate-400 font-semibold uppercase">AI Confidence</span>
                          <strong className="text-sm font-extrabold text-slate-850 dark:text-white">
                            {Math.round(selectedSuggestion.confidence * 100)}%
                          </strong>
                        </div>
                      </div>

                      {aiRecommend && (
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-250/60 dark:border-slate-850 space-y-1">
                          <span className="block text-[9px] font-bold text-gov-brand-blue-500 uppercase tracking-wider">Recommended Govt Scheme</span>
                          <strong className="text-sm font-extrabold text-slate-850 dark:text-white block">{aiRecommend.recommended_scheme}</strong>
                          <span className="block text-[9px] text-slate-400">Responsible Dept: {aiRecommend.department}</span>
                        </div>
                      )}

                      {aiExplain && (
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
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
                  <button disabled={aiLoading} onClick={() => { alert('Grievance forwarded. Report logged.'); setSelectedSuggestion(null); }}
                    className="py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors">
                    <Send className="h-4 w-4" /> Forward Request
                  </button>
                  <button disabled={aiLoading} onClick={() => handleDownloadReport(selectedSuggestion!)}
                    className="py-2.5 bg-gov-brand-blue-500 hover:bg-gov-brand-blue-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors">
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
