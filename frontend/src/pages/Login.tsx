import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Landmark, ShieldAlert, Users, Sparkles } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Citizen' | 'Officer' | 'MP'>('Citizen');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, role });
    onSuccess();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gov-slate-50 dark:bg-gov-slate-950 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gov-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-gov-card space-y-6">
        
        {/* Title Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gov-brand-blue-50 dark:bg-gov-brand-blue-900/20 text-gov-brand-blue-500 rounded-xl mb-2">
            <Landmark className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">YUKTI Decision Portal</h2>
          <p className="text-xs text-slate-550 dark:text-slate-400">Secure Government Analytics System Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Access Role</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Citizen', 'Officer', 'MP'] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                    role === r 
                      ? 'border-gov-brand-blue-500 bg-gov-brand-blue-50 dark:bg-gov-brand-blue-900/20 text-gov-brand-blue-500' 
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.gov.in"
              className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-gov-brand-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-gov-brand-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-gov-brand-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-gov-brand-blue-900 transition-colors shadow-sm mt-2"
          >
            Authenticate Portal Session
          </button>
        </form>
      </div>
    </div>
  );
};
