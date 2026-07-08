import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Landmark, ArrowLeft, Loader2 } from 'lucide-react';

interface RegisterProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onBack, onSuccess }) => {
  const register = useAuthStore((state) => state.register);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'Citizen' | 'MP'>('Citizen');
  const [lang, setLang] = useState('en');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    if (password.length < 7) {
      setLocalError("Password must be at least 7 characters long");
      return;
    }

    if (!acceptTerms) {
      setLocalError("You must accept the terms of service");
      return;
    }

    setLoading(true);
    const ok = await register({
      full_name: fullName,
      email,
      password,
      role,
      preferred_language: lang
    });
    setLoading(false);

    if (ok) {
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gov-slate-50 dark:bg-gov-slate-950 px-4 py-8">
      <div className="max-w-md w-full bg-white dark:bg-gov-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-gov-card space-y-6">
        
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gov-brand-blue-50 dark:bg-gov-brand-blue-900/20 text-gov-brand-blue-500 rounded-xl mb-1">
            <Landmark className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Create YUKTI Account</h2>
          <p className="text-xs text-slate-500">Register as a Citizen or Member of Parliament (MP).</p>
        </div>

        {(localError || error) && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs text-center font-medium">
            {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Profile Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Citizen">Citizen User</option>
              <option value="MP">Member of Parliament (MP)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.gov.in"
              className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preferred Language</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="rounded accent-gov-brand-blue-500"
            />
            <label htmlFor="terms" className="text-xs text-slate-500 cursor-pointer">
              I accept the data protection guidelines.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gov-brand-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-gov-brand-blue-900 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enroll Account"}
          </button>
        </form>

        <button 
          onClick={onBack}
          className="w-full text-xs text-slate-500 hover:text-gov-brand-blue-500 flex items-center justify-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Already have an account? Sign In
        </button>
      </div>
    </div>
  );
};
