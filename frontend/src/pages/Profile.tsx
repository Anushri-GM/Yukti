import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { User, Key, Save, AlertCircle, CheckCircle } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, updateProfile, changePassword, error, clearError } = useAuthStore();
  
  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [lang, setLang] = useState(user?.preferred_language || 'en');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [profileImage, setProfileImage] = useState(user?.profile_image || '');
  
  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Feedback Status
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(false);
    clearError();
    
    const ok = await updateProfile({
      full_name: fullName,
      preferred_language: lang,
      phone_number: phone,
      profile_image: profileImage
    });
    
    if (ok) {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSuccess(false);
    setLocalErr(null);
    clearError();

    if (newPassword !== confirmPassword) {
      setLocalErr("New passwords do not match");
      return;
    }

    const ok = await changePassword({
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirm: confirmPassword
    });

    if (ok) {
      setPwdSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdSuccess(false), 4000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Account Administration</h2>
        <p className="text-slate-500 text-sm">Manage profile parameters, notification preferences, and passwords.</p>
      </div>

      {/* Main Grid: User Details + Forms */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Summary Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="gov-card text-center space-y-4">
            <div className="w-20 h-20 bg-gov-brand-blue-50 dark:bg-gov-brand-blue-900/20 text-gov-brand-blue-500 rounded-full flex items-center justify-center font-bold text-3xl mx-auto uppercase border border-slate-100 dark:border-slate-800">
              {user?.full_name?.charAt(0) || ''}
            </div>
            <div>
              <h3 className="text-lg font-bold">{user?.full_name}</h3>
              <span className="inline-block px-2.5 py-0.5 bg-gov-brand-emerald-50 text-gov-brand-emerald-500 border border-gov-brand-emerald-500/20 rounded-full text-xs font-bold uppercase mt-1">
                {user?.role}
              </span>
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-left text-xs space-y-2 text-slate-500">
              <div className="flex justify-between">
                <span>Email:</span>
                <span className="font-semibold text-slate-850 dark:text-slate-200">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span className="font-semibold text-slate-850 dark:text-slate-200">
                  {user ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Login:</span>
                <span className="font-semibold text-slate-850 dark:text-slate-200">
                  {user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Edit Form Fields */}
        <div className="md:col-span-2 space-y-6">
          {/* Form 1: Profile Editing */}
          <div className="gov-card space-y-4">
            <h3 className="text-lg font-bold border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <User className="h-5 w-5 text-gov-brand-blue-500" /> Personal Settings
            </h3>

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Profile updated successfully!
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Language</label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
                  placeholder="e.g. +91 99999 99999"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="gov-btn-primary flex items-center gap-2 text-sm py-2 px-4 float-right"
                >
                  <Save className="h-4 w-4" /> Save Profile Details
                </button>
              </div>
            </form>
          </div>

          {/* Form 2: Password Modifying */}
          <div className="gov-card space-y-4">
            <h3 className="text-lg font-bold border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <Key className="h-5 w-5 text-gov-brand-blue-500" /> Credentials Update
            </h3>

            {(localErr || error) && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {localErr || error}
              </div>
            )}

            {pwdSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Password changed successfully!
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-sm bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="gov-btn-primary flex items-center gap-2 text-sm py-2 px-4 float-right"
                >
                  <Key className="h-4 w-4" /> Change Password Credentials
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
