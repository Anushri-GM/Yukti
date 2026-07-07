import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  Landmark, FileText, CheckCircle2, AlertCircle, 
  MapPin, Image as ImageIcon, Mic, Loader2, RefreshCw,
  Clock, ShieldAlert
} from 'lucide-react';

export const CitizenPortal: React.FC = () => {
  const { submissions, fetchSubmissions, submitGrievance } = useStore();
  
  const [text, setText] = useState('');
  const [ward, setWard] = useState('Ward A (Gandhi Nagar)');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Image upload simulations
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Audio recording/upload simulations
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size exceeds 5MB limit");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      
      // Simulate progress
      setUploadingImage(true);
      setUploadProgress(10);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setUploadingImage(false);
            return 100;
          }
          return prev + 30;
        });
      }, 200);
    }
  };

  const simulateVoiceRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      // Simulate completed recording & transcription
      setIsTranscribing(true);
      setTimeout(() => {
        setIsTranscribing(false);
        setText(prev => (prev ? prev + "\n" : "") + "URGENT: Drinking water supply pipeline is broken near Sector 2 main crossing, causing severe wastage and mud flood.");
      }, 1500);
    } else {
      setIsRecording(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    const ok = await submitGrievance(text, ward, imageFile);
    setSubmitting(false);

    if (ok) {
      setSuccess(true);
      setText('');
      setImageFile(null);
      setImagePreview(null);
      setTimeout(() => setSuccess(false), 5000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 py-4">
      {/* Form Column */}
      <div className="lg:col-span-1 space-y-6">
        <div className="gov-card">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <Landmark className="h-6 w-6 text-gov-brand-blue-500" />
            <h2 className="text-xl font-bold">New Grievance</h2>
          </div>

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 mb-4 animate-pulse">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Grievance submitted and analyzed by YUKTI AI!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Ward / Area</label>
              <select
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="Ward A (Gandhi Nagar)">Ward A (Gandhi Nagar)</option>
                <option value="Ward B (Ambedkar Nagar)">Ward B (Ambedkar Nagar)</option>
                <option value="Ward C (Subhash Nagar)">Ward C (Subhash Nagar)</option>
                <option value="Ward D (Nehru Basti)">Ward D (Nehru Basti)</option>
                <option value="Ward E (Rajendra Nagar)">Ward E (Rajendra Nagar)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Describe the Issue</label>
              <textarea
                required
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe potholes, leaks, broken streetlights..."
                className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {/* Multimedia controls */}
            <div className="grid grid-cols-2 gap-3">
              {/* Image Input */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload-input"
                />
                <label
                  htmlFor="image-upload-input"
                  className="flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-500 hover:text-gov-brand-blue-500 transition-colors h-20"
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mb-1 text-gov-brand-blue-500" />
                      <span className="text-[10px] font-bold">{uploadProgress}%</span>
                    </>
                  ) : imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover rounded" />
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5 mb-1" />
                      <span className="text-[10px] font-bold">Add Photo</span>
                    </>
                  )}
                </label>
              </div>

              {/* Audio Input */}
              <button
                type="button"
                onClick={simulateVoiceRecording}
                disabled={isTranscribing}
                className={`flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-3 text-slate-500 transition-colors h-20 ${
                  isRecording 
                    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                    : isTranscribing
                    ? 'bg-amber-50 border-amber-300 text-amber-600'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-950/20 hover:text-gov-brand-blue-500'
                }`}
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mb-1" />
                    <span className="text-[10px] font-bold">Transcribing...</span>
                  </>
                ) : isRecording ? (
                  <>
                    <Mic className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-bold">Stop Rec</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-bold">Record Voice</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="w-full py-2.5 bg-gov-brand-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-gov-brand-blue-900 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Grievance"}
            </button>
          </form>
        </div>
      </div>

      {/* Submissions Column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="gov-card">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-gov-brand-blue-500" />
              <h2 className="text-xl font-bold">My Grievances</h2>
            </div>
            <button 
              onClick={fetchSubmissions}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="h-10 w-10 mx-auto mb-3" />
              <p className="font-medium text-sm">No grievances logged yet.</p>
              <p className="text-xs">Your submitted reports will appear here with live AI evaluation.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {submissions.map((sub) => (
                <div key={sub.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/20 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {sub.ward}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      sub.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : sub.status === 'verified' || sub.status === 'converted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {sub.status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-800 dark:text-slate-100 font-medium">{sub.text}</p>

                  {/* AI Metadata Box */}
                  <div className="border border-gov-brand-blue-500/20 bg-gov-brand-blue-500/5 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-gov-brand-blue-500 uppercase tracking-wider text-[10px]">
                      <ShieldAlert className="h-3 w-3" />
                      YUKTI AI Analysis Insight
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-650 dark:text-slate-400">
                      <div>
                        <span className="block text-[10px] text-slate-500 font-semibold">Category</span>
                        <strong className="text-slate-800 dark:text-slate-200">{sub.category || "Unassigned"}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-semibold">Urgency</span>
                        <strong className="text-slate-800 dark:text-slate-200">{sub.urgency}/5</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-semibold">Confidence</span>
                        <strong className="text-slate-800 dark:text-slate-200">{Math.round(sub.confidence * 100)}%</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-semibold">Infrastructure</span>
                        <strong className="text-slate-800 dark:text-slate-200 truncate block max-w-[120px]">
                          {sub.affected_infrastructure || "General Area"}
                        </strong>
                      </div>
                    </div>

                    {sub.summary && (
                      <div className="border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
                        <span className="text-[10px] text-slate-500 font-semibold block">AI Executive Summary:</span>
                        <p className="text-slate-700 dark:text-slate-300 italic">{sub.summary}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
