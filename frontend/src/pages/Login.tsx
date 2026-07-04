import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Landmark, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
  onRegisterLink: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onRegisterLink }) => {
  const login = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    
    const ok = await login({ email, password });
    setLoading(false);
    
    if (ok) {
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gov-slate-50 dark:bg-gov-slate-950 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gov-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-gov-card space-y-6">
        
        {/* Title Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gov-brand-blue-50 dark:bg-gov-brand-blue-900/20 text-gov-brand-blue-500 rounded-xl mb-1">
            <Landmark className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-gov-brand-blue-900 dark:text-white">YUKTI Decision Portal</h2>
          <p className="text-xs text-slate-500">Secure Government Analytics System Access</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Password</label>
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-gov-brand-blue-500 font-semibold hover:underline flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gov-brand-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-gov-brand-blue-900 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authenticate Portal Session"}
          </button>
        </form>

        <button 
          onClick={onRegisterLink}
          className="w-full text-xs text-slate-500 hover:text-gov-brand-blue-500 flex items-center justify-center gap-1.5 transition-colors"
        >
          Don't have an account? Sign Up <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
