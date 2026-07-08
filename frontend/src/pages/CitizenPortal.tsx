import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/authStore';
import apiClient from '../services/api';
import {
  Landmark, FileText, CheckCircle2, AlertCircle,
  MapPin, Image as ImageIcon, Mic, Loader2, RefreshCw,
  Clock, ShieldAlert, TrendingUp, Award, Send, CheckSquare,
  Activity, ArrowRight, BarChart3
} from 'lucide-react';

const URGENCY_LABEL: Record<number, string> = { 5: 'Very High', 4: 'High', 3: 'Medium', 2: 'Low', 1: 'Low' };
const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-800',
  verified:  'bg-emerald-100 text-emerald-800',
  converted: 'bg-gov-brand-blue-100 text-gov-brand-blue-800',
  rejected:  'bg-rose-100 text-rose-800',
};
const URGENCY_COLORS: Record<string, string> = {
  'Very High': 'text-red-600',
  High:        'text-orange-500',
  Medium:      'text-amber-500',
  Low:         'text-emerald-600',
};

type ActiveView = 'dashboard' | 'submit' | 'history';

interface CitizenPortalProps {
  initialSubView?: string;
  onSubViewChange?: (view: string) => void;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({ initialSubView = 'dashboard', onSubViewChange }) => {
  const { user } = useAuthStore();
  const { submissions, fetchSubmissions, submitGrievance } = useStore();

  const [view, setView] = useState<ActiveView>(initialSubView as any);

  useEffect(() => {
    if (initialSubView) setView(initialSubView as any);
  }, [initialSubView]);

  const changeView = (v: ActiveView) => {
    setView(v);
    if (onSubViewChange) onSubViewChange(v);
  };

  // Form
  const [text, setText] = useState('');
  const [ward, setWard] = useState('Ward A (Gandhi Nagar)');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Voice
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => { fetchSubmissions(); }, []);

  // Stats
  const stats = useMemo(() => {
    const total     = submissions.length;
    const pending   = submissions.filter(s => s.status === 'pending').length;
    const verified  = submissions.filter(s => s.status === 'verified' || s.status === 'converted').length;
    const highPri   = submissions.filter(s => s.urgency >= 4).length;
    const avgConf   = total > 0 ? Math.round(submissions.reduce((a, s) => a + s.confidence, 0) / total * 100) : 0;
    const recent    = [...submissions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3);
    return { total, pending, verified, highPri, avgConf, recent };
  }, [submissions]);

  const handleVoiceRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        recorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          setIsTranscribing(true);
          try {
            const fd = new FormData();
            fd.append('file', blob, 'recording.wav');
            const res = await apiClient.post('/api/upload/audio', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data?.transcript) setText(p => (p ? p + '\n' : '') + res.data.transcript);
          } catch { alert('Failed to transcribe audio.'); }
          finally { setIsTranscribing(false); stream.getTracks().forEach(t => t.stop()); }
        };
        recorder.start();
        setIsRecording(true);
      } catch { alert('Could not access microphone.'); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    const ok = await submitGrievance(text, ward, null);
    setSubmitting(false);
    if (ok) {
      setSuccess(true);
      setText('');
      setTimeout(() => { setSuccess(false); changeView('history'); }, 2000);
    }
  };

  // ── Sub-nav ─────────────────────────────────────────────────────────────────
  const NavBtn = ({ v, label, icon }: { v: ActiveView; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setView(v)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
        view === v
          ? 'bg-gov-brand-blue-500 text-white shadow-sm'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">

      {/* Welcome header */}
      <div className="bg-gradient-to-r from-gov-brand-blue-900 to-gov-brand-blue-500 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Welcome back</p>
            <h2 className="text-2xl font-extrabold">{user?.full_name || 'Citizen'}</h2>
            <p className="text-blue-200 text-sm mt-1">
              You have <strong className="text-white">{stats.pending}</strong> pending{' '}
              {stats.pending === 1 ? 'grievance' : 'grievances'} awaiting review.
            </p>
          </div>
          <div className="hidden md:flex gap-3">
            <div className="text-center bg-white/10 rounded-xl px-4 py-3">
              <div className="text-2xl font-black">{stats.total}</div>
              <div className="text-[10px] text-blue-200 font-semibold uppercase">Total</div>
            </div>
            <div className="text-center bg-white/10 rounded-xl px-4 py-3">
              <div className="text-2xl font-black">{stats.verified}</div>
              <div className="text-[10px] text-blue-200 font-semibold uppercase">Verified</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DASHBOARD ─────────────────────────────────────────────────────────── */}
      {view === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Submitted', value: stats.total,   icon: <FileText  className="h-5 w-5" />, color: 'blue'   },
              { label: 'Pending Review',  value: stats.pending,  icon: <Clock     className="h-5 w-5" />, color: 'amber'  },
              { label: 'Verified',        value: stats.verified, icon: <CheckSquare className="h-5 w-5" />, color: 'emerald' },
              { label: 'High Priority',   value: stats.highPri,  icon: <AlertCircle className="h-5 w-5" />, color: 'rose'   },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="gov-card flex items-center gap-4 bg-slate-50 dark:bg-slate-950/20">
                <div className={`p-3 rounded-xl bg-${color}-50 dark:bg-${color}-900/10 text-${color}-500`}>{icon}</div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">{label}</span>
                  <h4 className="text-xl font-extrabold text-slate-800 dark:text-white">{value}</h4>
                </div>
              </div>
            ))}
          </div>

          {/* AI confidence + CTA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="gov-card bg-gov-brand-blue-500/5 border border-gov-brand-blue-500/20 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-gov-brand-blue-500" />
                <h3 className="font-bold text-sm text-gov-brand-blue-500 uppercase tracking-wider">AI Analysis Status</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                  <div className="text-2xl font-black text-slate-800 dark:text-white">{stats.avgConf}%</div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Avg AI Confidence</div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                  <div className="text-2xl font-black text-slate-800 dark:text-white">{stats.verified}</div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Verified by MP</div>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                YUKTI's AI pipeline processes your submission instantly — categorizing, prioritizing, and routing to the MP's Decision Intelligence Room.
              </p>
            </div>

            <div className="gov-card space-y-3">
              <h3 className="font-bold text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wider">Quick Actions</h3>
              <button onClick={() => changeView('submit')}
                className="w-full flex items-center justify-between p-3 border border-gov-brand-blue-500/30 bg-gov-brand-blue-50 dark:bg-gov-brand-blue-900/10 rounded-xl hover:bg-gov-brand-blue-100 transition-colors group">
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-gov-brand-blue-500" />
                  <div className="text-left">
                    <div className="font-bold text-sm text-gov-brand-blue-500">Submit New Grievance</div>
                    <div className="text-[10px] text-slate-400">Text or voice recording</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gov-brand-blue-500 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => changeView('history')}
                className="w-full flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-colors group">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-slate-500" />
                  <div className="text-left">
                    <div className="font-bold text-sm text-slate-700 dark:text-slate-300">View All Reports</div>
                    <div className="text-[10px] text-slate-400">{stats.total} submissions with AI insights</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          {stats.recent.length > 0 && (
            <div className="gov-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wider">Recent Submissions</h3>
                <button onClick={() => changeView('history')} className="text-xs text-gov-brand-blue-500 hover:underline">See all →</button>
              </div>
              <div className="space-y-3">
                {stats.recent.map(sub => {
                  const urgLabel = URGENCY_LABEL[sub.urgency] ?? 'Low';
                  return (
                    <div key={sub.id} className="flex items-start gap-4 p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/20">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${URGENCY_COLORS[urgLabel]?.replace('text-', 'bg-') ?? 'bg-slate-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">{sub.text}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <MapPin className="h-3 w-3" /> {sub.ward}
                          <span>·</span>
                          <span>{new Date(sub.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[sub.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {sub.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SUBMIT ─────────────────────────────────────────────────────────────── */}
      {view === 'submit' && (
        <div className="max-w-xl">
          <div className="gov-card space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <Landmark className="h-6 w-6 text-gov-brand-blue-500" />
              <div>
                <h2 className="text-lg font-bold">New Grievance</h2>
                <p className="text-xs text-slate-400">Submitted reports are analyzed by YUKTI AI instantly</p>
              </div>
            </div>

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-pulse">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Grievance submitted and analyzed by YUKTI AI!
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Ward / Area</label>
                <select value={ward} onChange={e => setWard(e.target.value)}
                  className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none">
                  {['Ward A (Gandhi Nagar)', 'Ward B (Ambedkar Nagar)', 'Ward C (Subhash Nagar)', 'Ward D (Nehru Basti)', 'Ward E (Rajendra Nagar)'].map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Describe the Issue</label>
                <textarea required rows={5} value={text} onChange={e => setText(e.target.value)}
                  placeholder="Describe potholes, water leaks, broken streetlights..."
                  className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none resize-none" />
              </div>

              {/* Image — Coming Soon */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 font-bold text-gov-brand-blue-500 uppercase tracking-wider text-[10px]">
                    <ImageIcon className="h-4 w-4" /> Image Attachments
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-gov-brand-blue-500/10 text-gov-brand-blue-500 font-extrabold text-[8px] tracking-wider uppercase">Coming Soon</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Image upload will be available in a future release.
                </p>
              </div>

              {/* Voice recording */}
              <button type="button" onClick={handleVoiceRecording} disabled={isTranscribing}
                className={`w-full flex flex-col items-center justify-center border border-dashed rounded-lg p-3 h-20 transition-colors ${
                  isRecording    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse' :
                  isTranscribing ? 'bg-amber-50 border-amber-300 text-amber-600' :
                  'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950/20 hover:text-gov-brand-blue-500'
                }`}>
                {isTranscribing ? (
                  <><Loader2 className="h-5 w-5 animate-spin mb-1" /><span className="text-[10px] font-bold">Transcribing…</span></>
                ) : isRecording ? (
                  <><Mic className="h-5 w-5 mb-1" /><span className="text-[10px] font-bold">Stop Recording</span></>
                ) : (
                  <><Mic className="h-5 w-5 mb-1" /><span className="text-[10px] font-bold">Record Voice Complaint</span></>
                )}
              </button>

              <button type="submit" disabled={submitting || !text.trim()}
                className="w-full py-2.5 bg-gov-brand-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-gov-brand-blue-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Submit Grievance</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── HISTORY ─────────────────────────────────────────────────────────────── */}
      {view === 'history' && (
        <div className="gov-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-gov-brand-blue-500" />
              <h2 className="text-lg font-bold">My Grievances ({submissions.length})</h2>
            </div>
            <button onClick={fetchSubmissions} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500 transition-colors">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-sm">No grievances yet.</p>
              <p className="text-xs mt-1">Your submissions will appear here with live AI evaluation.</p>
              <button onClick={() => changeView('submit')} className="mt-4 text-gov-brand-blue-500 text-xs font-bold hover:underline">
                Submit your first grievance →
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
              {[...submissions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(sub => (
                <div key={sub.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/20 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">{sub.ward}</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[sub.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-100 font-medium">{sub.text}</p>

                  {/* AI insights */}
                  <div className="border border-gov-brand-blue-500/20 bg-gov-brand-blue-500/5 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-gov-brand-blue-500 uppercase tracking-wider text-[10px]">
                      <ShieldAlert className="h-3 w-3" /> YUKTI AI Analysis
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-600 dark:text-slate-400">
                      <div><span className="block text-[10px] text-slate-500 font-semibold">Category</span><strong className="text-slate-800 dark:text-slate-200">{sub.category || 'Unassigned'}</strong></div>
                      <div><span className="block text-[10px] text-slate-500 font-semibold">Urgency</span><strong className={`${URGENCY_COLORS[URGENCY_LABEL[sub.urgency]] ?? ''}`}>{sub.urgency}/5</strong></div>
                      <div><span className="block text-[10px] text-slate-500 font-semibold">Confidence</span><strong className="text-slate-800 dark:text-slate-200">{Math.round(sub.confidence * 100)}%</strong></div>
                      <div><span className="block text-[10px] text-slate-500 font-semibold">Infrastructure</span><strong className="text-slate-800 dark:text-slate-200 truncate block max-w-[120px]">{sub.affected_infrastructure || 'General Area'}</strong></div>
                    </div>
                    {sub.summary && (
                      <div className="border-t border-slate-200 dark:border-slate-800 pt-2 mt-1">
                        <span className="text-[10px] text-slate-500 font-semibold block">AI Summary:</span>
                        <p className="text-slate-700 dark:text-slate-300 italic">{sub.summary}</p>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-400 text-right">
                    Submitted: {new Date(sub.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
